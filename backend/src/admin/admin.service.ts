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

  // ✅ Log admin activity (auto-creates collection)
  private async logActivity(action: string, details: string) {
    try {
      await this.db.collection('recent_activities').add({
        action,
        details,
        actor: 'Admin',
        timestamp: new Date().toISOString(),
      });
      console.log('✅ Logged:', action);
    } catch (error) {
      console.error('❌ Failed to log activity:', error);
    }
  }

  // ✅ Get latest 10 recent activities
  async getRecentActivities() {
    const snap = await this.db
      .collection('recent_activities')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // ✅ Import CSV (students or teachers)
  async importCSV(file: Express.Multer.File): Promise<CsvImportResponse> {
    if (!file) throw new BadRequestException('No file uploaded');

    const rows: any[] = [];
    const responses: CsvImportResult[] = [];

    const fileName = file.originalname.toLowerCase();
    let collectionName: 'students' | 'teachers';
    if (fileName.includes('student')) collectionName = 'students';
    else if (fileName.includes('teacher')) collectionName = 'teachers';
    else throw new BadRequestException('CSV name must contain "student" or "teacher"');

    return new Promise((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csvParser())
        .on('data', (data) => {
          const normalized: any = {};
          for (const key in data) {
            const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
            normalized[cleanKey] = data[key]?.trim();
          }
          rows.push(normalized);
        })
        .on('end', async () => {
          try {
            for (const row of rows) {
              const firstName = row['firstname'] || '';
              const lastName = row['lastname'] || '';
              const personalEmail = row['personal_email'] || row['email'] || '';
              if (!firstName || !lastName || !personalEmail) continue;

              const schoolEmail = `${firstName}.${lastName}@aics.edu.ph`.toLowerCase();
              const tempPassword = this.generateRandomPassword();

              try {
                const user = await this.auth.createUser({
                  email: schoolEmail,
                  password: tempPassword,
                  displayName: `${firstName} ${lastName}`,
                });

                await this.db.collection(collectionName).doc(user.uid).set({
                  ...row,
                  school_email: schoolEmail,
                  temp_password: tempPassword,
                  createdAt: new Date().toISOString(),
                  status: 'approved',
                });

                // ✅ Send credentials to the personal email; don't fail the whole import if email fails
                try {
                  await this.sendCredentials(personalEmail, schoolEmail, tempPassword);
                  console.log(`📧 Credentials email sent to ${personalEmail}`);
                } catch (emailErr) {
                  console.error(`❌ Failed to send credentials to ${personalEmail}:`, emailErr);
                  await this.logActivity(
                    'Email Send Failed',
                    `To: ${personalEmail} (${schoolEmail}) — ${(emailErr as Error).message}`
                  );
                }

                responses.push({ schoolEmail, status: 'Created', type: collectionName });
              } catch (err) {
                responses.push({
                  schoolEmail,
                  status: 'Failed',
                  type: collectionName,
                  error: (err as Error).message,
                });
              }
            }

            // Log a helpful summary to recent_activities
            const createdCount = responses.filter((r) => r.status === 'Created').length;
            await this.logActivity(
              `Imported ${collectionName}`,
              `Processed ${rows.length} rows — ${createdCount} created.`
            );

            resolve({ success: true, results: responses });
          } catch (err) {
            reject(err);
          } finally {
            fs.unlink(file.path, () => {});
          }
        })
        .on('error', (err) => reject(err));
    });
  }

  // ✅ Add a single student (manual), mirrors CSV logic
  async addStudent(data: any) {
    // Normalize keys to snake_case to be consistent with CSV import
    const normalized: Record<string, any> = {};
    for (const key in data) {
      const cleanKey = key.trim().toLowerCase().replace(/[\s-]+/g, '_');
      const value = data[key];
      normalized[cleanKey] =
        typeof value === 'string' ? value.trim() : value;
    }

    const firstname = normalized['firstname'];
    const lastname = normalized['lastname'];
    const personalEmail = normalized['personal_email'] || normalized['email'];

    if (!firstname || !lastname || !personalEmail) {
      throw new BadRequestException(
        'Missing required fields: firstname, lastname, personal_email'
      );
    }

    const schoolEmail = `${firstname}.${lastname}@aics.edu.ph`.toLowerCase();
    const tempPassword = this.generateRandomPassword();

    try {
      const user = await this.auth.createUser({
        email: schoolEmail,
        password: tempPassword,
        displayName: `${firstname} ${lastname}`,
      });

      // Write Firestore doc with the same shape as CSV import
      await this.db.collection('students').doc(user.uid).set({
        ...normalized,
        school_email: schoolEmail,
        temp_password: tempPassword,
        createdAt: new Date().toISOString(),
        status: 'approved',
      });

      // ✅ Send credentials to personal email
      try {
        await this.sendCredentials(personalEmail, schoolEmail, tempPassword);
        console.log(`📧 Credentials email sent to ${personalEmail}`);
      } catch (emailErr) {
        console.error(`❌ Failed to send credentials to ${personalEmail}:`, emailErr);
        await this.logActivity(
          'Email Send Failed',
          `To: ${personalEmail} (${schoolEmail}) — ${(emailErr as Error).message}`
        );
      }

      await this.logActivity(
        'Added Student',
        `Created student ${firstname} ${lastname} (${schoolEmail})`
      );

      return {
        uid: user.uid,
        schoolEmail,
        tempPassword,
      };
    } catch (err) {
      await this.logActivity(
        'Add Student Failed',
        `Failed to create ${firstname} ${lastname}: ${(err as Error).message}`
      );
      throw new BadRequestException((err as Error).message);
    }
  }

  // ✅ Edit user
  async editUser(role: 'student' | 'teacher', userId: string, updates: any) {
    const collection = role === 'student' ? 'students' : 'teachers';
    const docRef = this.db.collection(collection).doc(userId);

    // try to get a readable name for logging
    const snap = await docRef.get();
    const beforeData = snap.exists ? snap.data() : null;
    const name =
      (beforeData?.firstname || beforeData?.firstName || beforeData?.displayName || '') +
      (beforeData?.lastname ? ' ' + beforeData?.lastname : '');

    await docRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const details = `Updated ${role} ${name || userId}: ${JSON.stringify(updates)}`;
    await this.logActivity(`Edited ${role}`, details);

    return { success: true };
  }

  // ✅ Delete user
  async deleteUser(role: 'student' | 'teacher', userId: string) {
    const collection = role === 'student' ? 'students' : 'teachers';
    const docRef = this.db.collection(collection).doc(userId);

    // Fetch for name
    const snap = await docRef.get();
    const data = snap.exists ? snap.data() : null;
    const name =
      data ? `${data.firstname || data.firstName || ''} ${data.lastname || ''}`.trim() : userId;

    await docRef.delete();

    await this.logActivity(
      `Deleted ${role}`,
      `Deleted ${role} ${name || userId} (ID: ${userId})`
    );
    return { success: true };
  }

  // ✅ Toggle maintenance (use your system_settings/maintenance_mode)
  async toggleMaintenance(enabled: boolean) {
    await this.db
      .collection('system_settings')
      .doc('maintenance_mode')
      .set(
        { enabled, updatedAt: new Date().toISOString() },
        { merge: true }
      );

    await this.logActivity(
      `Toggled Maintenance`,
      `Maintenance mode set to ${enabled ? 'ON' : 'OFF'}`
    );

    return { success: true };
  }

  // ✅ Post announcement (uses your announcements collection format)
  async postAnnouncement(message: string, title = '', target = 'all') {
    const announcementsRef = this.db.collection('announcements');
    const createdAtISO = new Date().toISOString();
    const dateString = new Date().toLocaleDateString('en-US');
    await announcementsRef.add({
      author: 'Admin',
      title: title || '',
      content: message,
      createdAt: createdAtISO,
      date: dateString,
      expiration: '2312-12-31',
      status: 'Active',
      target,
    });

    await this.logActivity(
      'Posted Announcement',
      `${title ? title + ': ' : ''}${message}`
    );
    return { success: true };
  }

  // Helper: generate random password
  private generateRandomPassword(length = 10): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  // Helper: send email credentials to personal email (Gmail SMTP)
  private async sendCredentials(toEmail: string, schoolEmail: string, password: string) {
    const user = process.env.SYSTEM_EMAIL;
    // Strip spaces from app password; Gmail app passwords are 16 chars without spaces
    const rawPass = process.env.SYSTEM_EMAIL_PASSWORD || '';
    const pass = rawPass.replace(/\s+/g, '');

    if (!user || !pass) {
      throw new Error('SYSTEM_EMAIL or SYSTEM_EMAIL_PASSWORD is not set');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      logger: true, // logs to console
      debug: true,  // enable SMTP traffic logs
    });

    // Optional but helps catch auth/connect issues early
    await transporter.verify();

    const subject = 'Your School Account Credentials';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6">
        <h2 style="margin-bottom:8px;">Welcome to AICS</h2>
        <p>Your school account has been created. Use the credentials below to sign in:</p>
        <ul>
          <li><strong>School Email:</strong> ${schoolEmail}</li>
          <li><strong>Temporary Password:</strong> ${password}</li>
        </ul>
        <p>Please change your password after first login.</p>
        <p>If you did not expect this email, please contact support.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"AICS Admin" <${user}>`,
      to: toEmail,
      subject,
      html,
      text: `School Email: ${schoolEmail}\nTemporary Password: ${password}\nPlease change your password after first login.`,
      replyTo: user,
    });
  }

  // ✅ Upload and save admin profile picture
  async saveProfilePicture(adminId: string, imageUrl: string) {
    if (!imageUrl) throw new BadRequestException('No image URL provided');

    const adminRef = this.db.collection('admins').doc(adminId);
    await adminRef.set(
      {
        profilePicUrl: imageUrl,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    try {
      await this.db.collection('recent_activities').add({
        action: 'Uploaded Admin Profile Picture',
        details: `Admin ${adminId} updated profile picture.`,
        actor: `Admin:${adminId}`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to log admin profile pic upload activity:', err);
    }

    return {
      success: true,
      message: 'Profile picture uploaded successfully',
      imageUrl,
    };
  }
}