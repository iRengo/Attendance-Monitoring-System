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

    // Compose readable update details
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
    const name = data ? `${data.firstname || data.firstName || ''} ${data.lastname || ''}`.trim() : userId;

    await docRef.delete();

    await this.logActivity(`Deleted ${role}`, `Deleted ${role} ${name || userId} (ID: ${userId})`);
    return { success: true };
  }

  // ✅ Toggle maintenance (use your system_settings/maintenance_mode)
  async toggleMaintenance(enabled: boolean) {
    // write to the doc you said you have
    await this.db.collection('system_settings').doc('maintenance_mode').set(
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
    // Use fields similar to the example you provided
    const announcementsRef = this.db.collection('announcements');
    const createdAtISO = new Date().toISOString();
    const dateString = new Date().toLocaleDateString('en-US'); // e.g. "10/24/2025"
    await announcementsRef.add({
      author: 'Admin',
      title: title || '',
      content: message,
      createdAt: createdAtISO,
      date: dateString,
      expiration: '2312-12-31', // default expiration
      status: 'Active',
      target,
    });

    await this.logActivity('Posted Announcement', `${title ? title + ': ' : ''}${message}`);
    return { success: true };
  }

  // Helper: generate random password
  private generateRandomPassword(length = 10): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () =>
      chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }

  // Helper: send email credentials (optional)
  private async sendCredentials(email: string, schoolEmail: string, password: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SYSTEM_EMAIL,
        pass: process.env.SYSTEM_EMAIL_PASSWORD,
      },
    });
    await transporter.sendMail({
      from: process.env.SYSTEM_EMAIL,
      to: email,
      subject: 'Your School Account Credentials',
      html: `<h3>Welcome!</h3><p>Email: ${schoolEmail}</p><p>Password: ${password}</p>`,
    });
  }
}
