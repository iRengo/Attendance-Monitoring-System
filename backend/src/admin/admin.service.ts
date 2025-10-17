import { Injectable, BadRequestException } from '@nestjs/common';
import { Express } from 'express';
import csvParser from 'csv-parser';
import * as fs from 'fs';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as nodemailer from 'nodemailer';

export type CsvImportResult = {
  schoolEmail: string;
  status: 'Created' | 'Failed';
  type: 'students' | 'teachers';
  error?: string;
};

export type CsvImportResponse = {
  success: boolean;
  results: CsvImportResult[];
};

@Injectable()
export class AdminService {
  private db = getFirestore();
  private auth = getAuth();

  // ================= IMPORT CSV FUNCTION =================
  async importCSV(file: Express.Multer.File): Promise<CsvImportResponse> {
    if (!file) throw new BadRequestException('No file uploaded');

    const rows: any[] = [];
    const responses: CsvImportResult[] = [];

    // Determine collection type from file name
    const fileName = file.originalname.toLowerCase();
    let collectionName: 'students' | 'teachers';
    if (fileName.includes('student')) collectionName = 'students';
    else if (fileName.includes('teacher')) collectionName = 'teachers';
    else throw new BadRequestException('CSV file name must contain "student" or "teacher"');

    return new Promise((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csvParser())
        .on('data', (data) => {
          // Normalize keys to lowercase and trim
          const normalizedRow: any = {};
          for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_'); // spaces → underscores
              normalizedRow[normalizedKey] = data[key]?.trim();
            }
          }
          rows.push(normalizedRow);
        })
        .on('end', async () => {
          try {
            for (const row of rows) {
              const firstName = row['firstname'] || '';
              const lastName = row['lastname'] || '';
              const personalEmail =
                row['personal_email'] || row['personalemail'] || row['email'] || '';

              if (!firstName || !lastName || !personalEmail) continue;

              const schoolEmail = `${firstName}.${lastName}@aics.edu.ph`.toLowerCase();
              const tempPassword = this.generateRandomPassword();

              try {
                // 1️⃣ Create Firebase Auth user
                const userRecord = await this.auth.createUser({
                  email: schoolEmail,
                  password: tempPassword,
                  displayName: `${firstName} ${lastName}`,
                });

                // 2️⃣ Dynamically include all fields from CSV
                const dynamicData = {
                  ...row, // all CSV columns
                  school_email: schoolEmail,
                  temp_password: tempPassword,
                  createdAt: new Date().toISOString(),
                  status: 'approved',
                };

                // 3️⃣ Save everything to Firestore
                await this.db
                  .collection(collectionName)
                  .doc(userRecord.uid)
                  .set(dynamicData, { merge: true });

                // 4️⃣ Send credentials via email
                await this.sendCredentials(personalEmail, schoolEmail, tempPassword);

                responses.push({
                  schoolEmail,
                  status: 'Created',
                  type: collectionName,
                });
              } catch (error) {
                console.error(
                  `❌ Error processing ${firstName} ${lastName}:`,
                  (error as Error).message
                );
                responses.push({
                  schoolEmail,
                  status: 'Failed',
                  error: (error as Error).message,
                  type: collectionName,
                });
              }
            }

            resolve({ success: true, results: responses });
          } catch (err) {
            reject(err);
          } finally {
            // ✅ Clean up uploaded file
            fs.unlink(file.path, () => {});
          }
        })
        .on('error', (err) => reject(err));
    });
  }

  // ================= HELPER: GENERATE PASSWORD =================
  private generateRandomPassword(length = 10): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  // ================= HELPER: SEND CREDENTIALS VIA EMAIL =================
  private async sendCredentials(
    personalEmail: string,
    schoolEmail: string,
    tempPassword: string
  ) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SYSTEM_EMAIL,
        pass: process.env.SYSTEM_EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.SYSTEM_EMAIL,
      to: personalEmail,
      subject: 'Your School Account Credentials',
      html: `
        <h3>Welcome to the Attendance System!</h3>
        <p>Your school account has been created successfully.</p>
        <p><strong>School Email:</strong> ${schoolEmail}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>Please change your password upon first login.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  }
}
