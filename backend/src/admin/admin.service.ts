import { Injectable, BadRequestException } from '@nestjs/common';
import { Express } from 'express';
import csvParser from 'csv-parser';
import * as fs from 'fs';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as nodemailer from 'nodemailer';

// ✅ Define type for each CSV row result
export type CsvImportResult = {
  schoolEmail: string;
  status: 'Created' | 'Failed';
  type: 'students' | 'teachers';
  error?: string;
};

// ✅ Define return type for importCSV
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
        .on('data', (data) => rows.push(data))
        .on('end', async () => {
          try {
            for (const row of rows) {
              const { firstname, middlename, lastname, personal_email } = row;
              if (!firstname || !lastname || !personal_email) continue;

              const schoolEmail = `${firstname}.${lastname}@aics.edu.ph`.toLowerCase();
              const tempPassword = this.generateRandomPassword();

              try {
                // 1️⃣ Create Firebase Auth user
                const userRecord = await this.auth.createUser({
                  email: schoolEmail,
                  password: tempPassword,
                  displayName: `${firstname} ${lastname}`,
                });

                // 2️⃣ Save to Firestore collection (students or teachers)
                await this.db.collection(collectionName).doc(userRecord.uid).set({
                  firstname,
                  middlename,
                  lastname,
                  personal_email,
                  school_email: schoolEmail,
                  temp_password: tempPassword,
                  createdAt: new Date().toISOString(),
                  status: 'approved', // optional default status
                });

                // 3️⃣ Send credentials via email
                await this.sendCredentials(personal_email, schoolEmail, tempPassword);

                responses.push({ schoolEmail, status: 'Created', type: collectionName });
              } catch (error) {
                console.error(`❌ Error processing ${firstname} ${lastname}:`, (error as Error).message);
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
          }
        })
        .on('error', (err) => reject(err));
    });
  }

  // ================= HELPER: GENERATE PASSWORD =================
  private generateRandomPassword(length = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  // ================= HELPER: SEND CREDENTIALS VIA EMAIL =================
  private async sendCredentials(personalEmail: string, schoolEmail: string, tempPassword: string) {
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
