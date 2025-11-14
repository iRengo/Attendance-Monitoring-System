/**
 * Modified AdminService: fixed TypeScript errors by explicitly typing
 * teacher attendance helpers to return Promise<any[]> and casting
 * document data to `any` so properties like `timestarted`, `room`, `classId`
 * are accessible without TS complaining that the object is `{ id: string }`.
 *
 * Key changes:
 * - getTeacherAttendanceDocsBetween(...) now returns Promise<any[]>
 *   and maps docs to `any`.
 * - getTeacherAllAttendanceDocs(...) now returns Promise<any[]>
 *   and maps docs to `any`.
 * - Loops that iterate teacher attendance docs now treat each `doc` as `any`.
 *
 * This resolves the TS2339 errors about properties not existing on the `{ id: string }` type.
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { Express } from 'express';
import csvParser from 'csv-parser';
import * as fs from 'fs';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as nodemailer from 'nodemailer';

export interface StudentAttendanceRow {
  studentId: string;
  studentName: string;
  gradeSection: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  attendancePercent: number;
}

export interface TeacherComplianceRow {
  teacherId: string;
  teacherName: string;
  subject: string;
  attendanceSubmitted: number;
  missedDays: number;
  submissionRate: number;
}

export interface MonthlySummaryRow {
  month: string;            // e.g. "June"
  totalDays: number;
  avgAttendancePercent: number;
  totalAbsences: number;
  lateEntries: number;
  totalPresents: number;    // NEW
}

export type CsvImportResult = {
  schoolEmail: string;
  status: 'Created' | 'Existing' | 'Failed';
  type: 'students' | 'teachers';
  error?: string;
};

export type CsvImportResponse = {
  success: boolean;
  results: CsvImportResult[];
  addedCount: number;
  existingCount: number;
  failedCount: number;
  totalRows: number;
};

@Injectable()
export class AdminService {
  private db = getFirestore();
  private auth = getAuth();

  /* ---------------- Activity Log ---------------- */
  private async logActivity(action: string, details: string) {
    try {
      await this.db.collection('recent_activities').add({
        action,
        details,
        actor: 'Admin',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  async getRecentActivities() {
    const snap = await this.db
      .collection('recent_activities')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /* ---------------- CSV Import ---------------- */
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
          if (normalized['studentid'] && !normalized['studentId']) {
            normalized.studentId = normalized['studentid'];
            delete normalized['studentid'];
          }
          if (normalized['student_id'] && !normalized['studentId']) {
            normalized.studentId = normalized['student_id'];
            delete normalized['student_id'];
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

              let alreadyExists = false;
              try { await this.auth.getUserByEmail(schoolEmail); alreadyExists = true; }
              catch { alreadyExists = false; }

              if (alreadyExists) {
                responses.push({ schoolEmail, status: 'Existing', type: collectionName });
                continue;
              }

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

                try {
                  await this.sendCredentials(personalEmail, schoolEmail, tempPassword);
                } catch (emailErr) {
                  console.error(`Failed to send credentials to ${personalEmail}:`, emailErr);
                  await this.logActivity(
                    'Email Send Failed',
                    `To: ${personalEmail} (${schoolEmail}) — ${(emailErr as Error).message}`,
                  );
                }

                responses.push({ schoolEmail, status: 'Created', type: collectionName });
              } catch (err: any) {
                const msg = err?.message || '';
                if (msg.includes('email-already-exists') || msg.toLowerCase().includes('already exists')) {
                  responses.push({ schoolEmail, status: 'Existing', type: collectionName });
                } else {
                  responses.push({ schoolEmail, status: 'Failed', type: collectionName, error: msg });
                }
              }
            }

            const addedCount = responses.filter(r => r.status === 'Created').length;
            const existingCount = responses.filter(r => r.status === 'Existing').length;
            const failedCount = responses.filter(r => r.status === 'Failed').length;
            const totalRows = rows.length;

            await this.logActivity(
              `Imported ${collectionName}`,
              `Rows: ${totalRows} — Created: ${addedCount}, Existing: ${existingCount}, Failed: ${failedCount}`,
            );

            resolve({ success: true, results: responses, addedCount, existingCount, failedCount, totalRows });
          } catch (err) {
            reject(err);
          } finally {
            fs.unlink(file.path, () => {});
          }
        })
        .on('error', (err) => reject(err));
    });
  }

  /* ---------------- Student Management ---------------- */
  async addStudent(data: any) {
    const normalized: Record<string, any> = {};
    for (const key in data) {
      const cleanKey = key.trim().replace(/[\s-]+/g, '_');
      const value = data[key];
      normalized[cleanKey] = typeof value === 'string' ? value.trim() : value;
    }
    if (normalized.studentid && !normalized.studentId) {
      normalized.studentId = normalized.studentid; delete normalized.studentid;
    }
    if (normalized.student_id && !normalized.studentId) {
      normalized.studentId = normalized.student_id; delete normalized.student_id;
    }

    const firstname = normalized['firstname'];
    const lastname = normalized['lastname'];
    const personalEmail = normalized['personal_email'] || normalized['email'];
    if (!firstname || !lastname || !personalEmail) {
      throw new BadRequestException('Missing required fields: firstname, lastname, personal_email');
    }

    const schoolEmail = `${firstname}.${lastname}@aics.edu.ph`.toLowerCase();
    const tempPassword = this.generateRandomPassword();

    try {
      const user = await this.auth.createUser({
        email: schoolEmail,
        password: tempPassword,
        displayName: `${firstname} ${lastname}`,
      });

      await this.db.collection('students').doc(user.uid).set({
        ...normalized,
        school_email: schoolEmail,
        temp_password: tempPassword,
        createdAt: new Date().toISOString(),
        status: 'approved',
      });

      try { await this.sendCredentials(personalEmail, schoolEmail, tempPassword); }
      catch (emailErr) {
        console.error(`Failed to send credentials to ${personalEmail}:`, emailErr);
        await this.logActivity('Email Send Failed', `To: ${personalEmail} (${schoolEmail}) — ${(emailErr as Error).message}`);
      }

      await this.logActivity('Added Student', `Created student ${firstname} ${lastname} (${schoolEmail})`);
      return { uid: user.uid, schoolEmail, tempPassword };
    } catch (err: any) {
      await this.logActivity('Add Student Failed', `Failed to create ${firstname} ${lastname}: ${err.message}`);
      throw new BadRequestException(err.message);
    }
  }

  async editUser(role: 'student' | 'teacher', userId: string, updates: any) {
    const collection = role === 'student' ? 'students' : 'teachers';
    const docRef = this.db.collection(collection).doc(userId);
    const snap = await docRef.get();
    const beforeData = snap.exists ? snap.data() : null;
    const name =
      (beforeData?.firstname || beforeData?.firstName || beforeData?.displayName || '') +
      (beforeData?.lastname ? ' ' + beforeData?.lastname : '');

    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const details = `Updated ${role} ${name || userId}: ${JSON.stringify(updates)}`;
    await this.logActivity(`Edited ${role}`, details);
    return { success: true };
  }

  async deleteUser(role: 'student' | 'teacher', userId: string) {
    const collection = role === 'student' ? 'students' : 'teachers';
    const docRef = this.db.collection(collection).doc(userId);
    const snap = await docRef.get();
    const data = snap.exists ? snap.data() : null;
    const name =
      data ? `${data.firstname || data.firstName || ''} ${data.lastname || ''}`.trim() : userId;

    await docRef.delete();
    await this.logActivity('Deleted ' + role, `Deleted ${role} ${name || userId} (ID: ${userId})`);
    return { success: true };
  }

  async toggleMaintenance(enabled: boolean) {
    await this.db
      .collection('system_settings')
      .doc('maintenance_mode')
      .set({ enabled, updatedAt: new Date().toISOString() }, { merge: true });

    await this.logActivity('Toggled Maintenance', `Maintenance mode set to ${enabled ? 'ON' : 'OFF'}`);
    return { success: true };
  }

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

    await this.logActivity('Posted Announcement', `${title ? title + ': ' : ''}${message}`);
    return { success: true };
  }

  /* ---------------- Email Helpers ---------------- */
  private generateRandomPassword(length = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private async sendCredentials(toEmail: string, schoolEmail: string, password: string) {
    const user = process.env.SYSTEM_EMAIL;
    const rawPass = process.env.SYSTEM_EMAIL_PASSWORD || '';
    const pass = rawPass.replace(/\s+/g, '');
    if (!user || !pass) throw new Error('SYSTEM_EMAIL or SYSTEM_EMAIL_PASSWORD is not set');

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });

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

  async saveProfilePicture(adminId: string, imageUrl: string) {
    if (!imageUrl) throw new BadRequestException('No image URL provided');
    const adminRef = this.db.collection('admins').doc(adminId);
    await adminRef.set({ profilePicUrl: imageUrl, updatedAt: new Date().toISOString() }, { merge: true });
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
    return { success: true, message: 'Profile picture uploaded successfully', imageUrl };
  }

  /* ---------------- Legacy Date-Range Reports (keep if still used elsewhere) ---------------- */
  async buildStudentAttendanceReport(from: string, to: string, studentId?: string) {
    const sessions = await this.querySessionsInRange(from, to);
    const stats: Record<string, { present: number; absent: number; late: number }> = {};
    const studentIds = new Set<string>();
    sessions.forEach(sess => {
      const entries = this.extractEntries(sess);
      entries.forEach(e => {
        if (!e.studentId) return;
        if (studentId && e.studentId !== studentId) return;
        studentIds.add(e.studentId);
        if (!stats[e.studentId]) stats[e.studentId] = { present: 0, absent: 0, late: 0 };
        const st = (e.status || '').toLowerCase();
        if (st === 'present') stats[e.studentId].present++;
        else if (st === 'late') stats[e.studentId].late++;
        else if (st === 'absent') stats[e.studentId].absent++;
      });
    });
    const infoMap: Record<string, { name: string; gradeLevel: string; section: string }> = {};
    for (const sid of Array.from(studentIds)) {
      try {
        const snap = await this.db.collection('students').doc(sid).get();
        if (snap.exists) {
          const d: any = snap.data() || {};
          const first = d.firstname || d.firstName || '';
          const middle = d.middlename || d.middleName || '';
          const last = d.lastname || d.lastName || '';
          const full = `${first} ${middle} ${last}`.replace(/\s+/g, ' ').trim() || sid;
          infoMap[sid] = { name: full, gradeLevel: d.gradelevel || d.gradeLevel || '', section: d.section || '' };
        } else infoMap[sid] = { name: sid, gradeLevel: '', section: '' };
      } catch { infoMap[sid] = { name: sid, gradeLevel: '', section: '' }; }
    }
    const rows: StudentAttendanceRow[] = Object.entries(stats).map(([sid, s]) => {
      const total = s.present + s.absent + s.late;
      const pct = total ? ((s.present + s.late * 0.5) / total) * 100 : 0;
      const info = infoMap[sid];
      return {
        studentId: sid,
        studentName: info.name,
        gradeSection: `${info.gradeLevel || 'N/A'}-${info.section || 'N/A'}`.replace(/-N\/A$/, ''),
        totalDays: total,
        present: s.present,
        absent: s.absent,
        late: s.late,
        attendancePercent: Number(pct.toFixed(1)),
      };
    });
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName));
    return rows;
  }

  /* ---------------- UPDATED: Teacher Compliance Reports ---------------- */

  // Helper: fetch attendance docs for a teacher between from/to (inclusive).
  // Explicitly returns Promise<any[]> and casts document data to `any`.
  private async getTeacherAttendanceDocsBetween(teacherId: string, fromDate: string, toDate: string): Promise<any[]> {
    const collRef = this.db.collection('teachers').doc(teacherId).collection('attendance');
    const snap = await collRef.get();
    const fromMs = new Date(fromDate + 'T00:00:00Z').getTime();
    const toMs = new Date(toDate + 'T23:59:59Z').getTime();

    // Map docs to `any` to ensure properties are accessible
    const docsArray: any[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as any));

    const results: any[] = [];
    for (const doc of docsArray) {
      const raw = doc.timestarted || doc.date || doc.timeStarted || doc.createdAt;
      if (!raw) continue;
      const dt = parseFlexibleDate(raw);
      const ms = dt.getTime();
      if (ms >= fromMs && ms <= toMs) {
        results.push(doc);
      }
    }
    return results;
  }

  // Helper: fetch all attendance docs for a teacher
  private async getTeacherAllAttendanceDocs(teacherId: string): Promise<any[]> {
    const collRef = this.db.collection('teachers').doc(teacherId).collection('attendance');
    const snap = await collRef.get();
    // Cast each doc's data to any
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as any));
  }

  // Build teacher compliance report for a given date range.
  async buildTeacherComplianceReport(from: string, to: string, teacherId?: string) {
    // Determine teacher IDs to process
    let teacherIds: string[] = [];
    if (teacherId) {
      teacherIds = [teacherId];
    } else {
      const tSnap = await this.db.collection('teachers').get();
      teacherIds = tSnap.docs.map(d => d.id);
    }

    const daysInRange = enumerateDates(from, to).filter(d => d.getDay() !== 0).length;

    const rows: TeacherComplianceRow[] = [];

    for (const tid of teacherIds) {
      // fetch attendance docs for this teacher in range
      const docs = await this.getTeacherAttendanceDocsBetween(tid, from, to);

      // Now count only present/late as submitted and also collect subjects in the same loop
      let submitted = 0;
      const subjectSet = new Set<string>();
      for (const doc of docs as any[]) {
        const st = (doc.status || '').toLowerCase();
        if (st === 'present' || st === 'late') submitted++;

        // prefer class subject if classId exists
        let subj = 'Subject';
        if (doc.classId) {
          try {
            const clsSnap = await this.db.collection('classes').doc(doc.classId).get();
            if (clsSnap.exists) {
              const cd: any = clsSnap.data() || {};
              subj = (cd.subjectName || cd.name || subj).trim();
            }
          } catch {}
        } else if (doc.room) {
          subj = String(doc.room).trim() || subj;
        }
        subjectSet.add(subj);
      }

      // resolve teacher display name
      let teacherName = tid;
      try {
        const snap = await this.db.collection('teachers').doc(tid).get();
        if (snap.exists) {
          const d: any = snap.data() || {};
          const first = d.firstName || d.firstname || '';
          const middle = d.middleName || d.middlename || '';
          const last = d.lastName || d.lastname || '';
          teacherName = `${first} ${middle} ${last}`.replace(/\s+/g, ' ').trim() || teacherName;
        }
      } catch {}

      const subjectsCount = subjectSet.size || 1;
      const expected = subjectsCount * daysInRange;
      const missed = Math.max(0, expected - submitted);
      const rate = expected ? (submitted / expected) * 100 : 0;

      rows.push({
        teacherId: tid,
        teacherName,
        subject: Array.from(subjectSet)[0] || 'N/A',
        attendanceSubmitted: submitted,
        missedDays: missed,
        submissionRate: Number(rate.toFixed(1)),
      });
    }

    rows.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
    return rows;
  }

  // Build teacher compliance report for all time (overall).
  async buildTeacherComplianceReportAll(teacherId?: string) {
    // Determine teacher IDs to process
    let teacherIds: string[] = [];
    if (teacherId) {
      teacherIds = [teacherId];
    } else {
      const tSnap = await this.db.collection('teachers').get();
      teacherIds = tSnap.docs.map(d => d.id);
    }

    const rows: TeacherComplianceRow[] = [];

    for (const tid of teacherIds) {
      const docs = await this.getTeacherAllAttendanceDocs(tid);

      // aggregate submitted count, unique days and subjects
      let submitted = 0;
      const uniqueDays = new Set<string>();
      const subjects = new Set<string>();

      for (const doc of docs as any[]) {
        const st = (doc.status || '').toLowerCase();
        if (st === 'present' || st === 'late') submitted++;

        const raw = doc.timestarted || doc.date || doc.timeStarted || doc.createdAt;
        if (raw) {
          try {
            const dt = parseFlexibleDate(raw);
            uniqueDays.add(dt.toISOString().slice(0, 10));
          } catch {}
        }
        if (doc.classId) {
          try {
            const clsSnap = await this.db.collection('classes').doc(doc.classId).get();
            if (clsSnap.exists) {
              const cd: any = clsSnap.data() || {};
              subjects.add((cd.subjectName || cd.name || 'Subject').trim());
              continue;
            }
          } catch {}
        }
        if (doc.room) subjects.add(String(doc.room).trim() || 'Subject');
      }

      // resolve teacher display name
      let teacherName = tid;
      try {
        const snap = await this.db.collection('teachers').doc(tid).get();
        if (snap.exists) {
          const d: any = snap.data() || {};
          const first = d.firstName || d.firstname || '';
          const middle = d.middleName || d.middlename || '';
          const last = d.lastName || d.lastname || '';
          teacherName = `${first} ${middle} ${last}`.replace(/\s+/g, ' ').trim() || teacherName;
        }
      } catch {}

      const expected = uniqueDays.size * (subjects.size || 1);
      const missed = Math.max(0, expected - submitted);
      const submissionRate = expected ? (submitted / expected) * 100 : 0;

      rows.push({
        teacherId: tid,
        teacherName,
        subject: Array.from(subjects)[0] || 'N/A',
        attendanceSubmitted: submitted,
        missedDays: missed,
        submissionRate: Number(submissionRate.toFixed(1)),
      });
    }

    rows.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
    return rows;
  }

  /* ---------------- Monthly Summary and Student/Other Reports ---------------- */
  async buildMonthlySummaryReport(from: string, to: string) {
    const sessions = await this.querySessionsInRange(from, to);
    const monthly: Record<string, { present: number; absent: number; late: number; totalEntries: number; dates: Set<string> }> = {};
    sessions.forEach(sess => {
      const dateISO = sess.timeStarted || sess.date || sess.createdAt;
      if (!dateISO) return;
      const d = parseFlexibleDate(dateISO);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { present: 0, absent: 0, late: 0, totalEntries: 0, dates: new Set() };
      monthly[key].dates.add(d.toISOString().slice(0, 10));
      const entries = this.extractEntries(sess);
      entries.forEach(e => {
        const st = (e.status || '').toLowerCase();
        if (st === 'present') monthly[key].present++;
        else if (st === 'late') monthly[key].late++;
        else if (st === 'absent') monthly[key].absent++;
        monthly[key].totalEntries++;
      });
    });
    const rows: MonthlySummaryRow[] = Object.entries(monthly).map(([month, b]) => {
      const avg = b.totalEntries ? ((b.present + b.late * 0.5) / b.totalEntries) * 100 : 0;
      return {
        month,
        totalDays: b.dates.size,
        avgAttendancePercent: Number(avg.toFixed(1)),
        totalAbsences: b.absent,
        lateEntries: b.late,
        totalPresents: b.present, // NEW
      };
    });
    rows.sort((a, b) => a.month.localeCompare(b.month));
    return rows;
  }

  async buildStudentAttendanceReportAll(studentId?: string) {
    const sessions = await this.getAllSessions();
    const stats: Record<string, { present: number; absent: number; late: number; uniqueDays: Set<string> }> = {};
    const studentMeta: Record<string, { name: string; gradeLevel: string; section: string }> = {};
    sessions.forEach(sess => {
      const entries = this.extractEntries(sess);
      const day = this.extractDay(sess);
      entries.forEach(e => {
        if (!e.studentId) return;
        if (studentId && e.studentId !== studentId) return;
        if (!stats[e.studentId]) stats[e.studentId] = { present: 0, absent: 0, late: 0, uniqueDays: new Set() };
        stats[e.studentId].uniqueDays.add(day);
        const st = (e.status || '').toLowerCase();
        if (st === 'present') stats[e.studentId].present++;
        else if (st === 'late') stats[e.studentId].late++;
        else if (st === 'absent') stats[e.studentId].absent++;
      });
    });
    for (const sid of Object.keys(stats)) {
      try {
        const snap = await this.db.collection('students').doc(sid).get();
        if (snap.exists) {
          const d: any = snap.data() || {};
          const first = d.firstname || d.firstName || '';
          const middle = d.middlename || d.middleName || '';
          const last = d.lastname || d.lastName || '';
          const name = `${first} ${middle} ${last}`.replace(/\s+/g,' ').trim() || sid;
          studentMeta[sid] = { name, gradeLevel: d.gradelevel || d.gradeLevel || '', section: d.section || '' };
        } else studentMeta[sid] = { name: sid, gradeLevel: '', section: '' };
      } catch {
        studentMeta[sid] = { name: sid, gradeLevel: '', section: '' };
      }
    }
    const rows: StudentAttendanceRow[] = Object.entries(stats).map(([sid, s]) => {
      const totalDays = s.uniqueDays.size;
      const info = studentMeta[sid];
      const attendancePercent = totalDays ? ((s.present + s.late * 0.5) / totalDays) * 100 : 0;
      return {
        studentId: sid,
        studentName: info.name,
        gradeSection: `${info.gradeLevel || 'N/A'}-${info.section || 'N/A'}`.replace(/-N\/A$/, ''),
        totalDays,
        present: s.present,
        absent: s.absent,
        late: s.late,
        attendancePercent: Number(attendancePercent.toFixed(1)),
      };
    });
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName));
    return rows;
  }

  async buildMonthlySummaryReportAll(month?: string) {
    let sessions: any[] = [];
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const { fromDate, toDate } = monthToRange(month);
      sessions = await this.getSessionsBetween(fromDate, toDate);
    } else {
      sessions = await this.getAllSessions();
    }
    const monthly: Record<string, { present: number; absent: number; late: number; totalEntries: number; dates: Set<string> }> = {};
    sessions.forEach(sess => {
      const raw = sess.timeStarted || sess.date || sess.createdAt;
      if (!raw) return;
      const d = parseFlexibleDate(raw);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
      if (!monthly[key]) monthly[key] = { present: 0, absent: 0, late: 0, totalEntries: 0, dates: new Set() };
      monthly[key].dates.add(d.toISOString().slice(0,10));
      const entries = this.extractEntries(sess);
      entries.forEach(e => {
        const st = (e.status || '').trim().toLowerCase();
        if (st === 'present') monthly[key].present++;
        else if (st === 'late') monthly[key].late++;
        else if (st === 'absent') monthly[key].absent++;
        monthly[key].totalEntries++;
      });
    });
    const rows: MonthlySummaryRow[] = Object.entries(monthly).map(([key, m]) => {
      const avgPct = m.totalEntries ? ((m.present + m.late * 0.5) / m.totalEntries) * 100 : 0;
      return {
        month: monthName(key),
        totalDays: m.dates.size,
        avgAttendancePercent: Number(avgPct.toFixed(1)),
        totalAbsences: m.absent,
        lateEntries: m.late,
        totalPresents: m.present, // NEW
      };
    });
    rows.sort((a, b) => a.month.localeCompare(b.month));
    return rows;
  }

  /* ---------------- Lookup Lists ---------------- */
  async listStudents(q: string, limit: number) {
    const snap = await this.db.collection('students').limit(500).get();
    const all = snap.docs.map(d => {
      const s: any = d.data() || {};
      const first = s.firstname || s.firstName || '';
      const middle = s.middlename || s.middleName || '';
      const last = s.lastname || s.lastName || '';
      const name = `${first} ${middle} ${last}`.replace(/\s+/g,' ').trim() || d.id;
      return { id: d.id, name, gradeLevel: s.gradelevel || s.gradeLevel || '', section: s.section || '' };
    });
    const qlc = q.toLowerCase();
    const filtered = q
      ? all.filter(r => r.name.toLowerCase().includes(qlc) || r.id.toLowerCase().includes(qlc))
      : all;
    return filtered.slice(0, limit);
  }

  async listTeachers(q: string, limit: number) {
    const snap = await this.db.collection('teachers').limit(500).get();
    const all = snap.docs.map(d => {
      const t: any = d.data() || {};
      const first = t.firstName || t.firstname || '';
      const middle = t.middleName || t.middlename || '';
      const last = t.lastName || t.lastname || '';
      const name = `${first} ${middle} ${last}`.replace(/\s+/g,' ').trim() || d.id;
      return { id: d.id, name };
    });
    const qlc = q.toLowerCase();
    const filtered = q
      ? all.filter(r => r.name.toLowerCase().includes(qlc) || r.id.toLowerCase().includes(qlc))
      : all;
    return filtered.slice(0, limit);
  }

  /* ---------------- Session Helpers ---------------- */
  private async getAllSessions() {
    const snap = await this.db.collection('attendance_sessions').get();
    const sessions: any[] = [];
    for (const doc of snap.docs) {
      const data: any = doc.data();
      if (data.classId) {
        try {
          const clsSnap = await this.db.collection('classes').doc(data.classId).get();
          if (clsSnap.exists) data.classData = clsSnap.data();
        } catch {}
      }
      sessions.push({ id: doc.id, ...data });
    }
    return sessions;
  }

  private async getSessionsBetween(fromDate: string, toDate: string) {
    const all = await this.getAllSessions();
    const fromMs = new Date(fromDate + 'T00:00:00Z').getTime();
    const toMs = new Date(toDate + 'T23:59:59Z').getTime();
    return all.filter(sess => {
      const raw = sess.timeStarted || sess.date || sess.createdAt;
      if (!raw) return false;
      const d = parseFlexibleDate(raw);
      const ms = d.getTime();
      return ms >= fromMs && ms <= toMs;
    });
  }

  /* Legacy query method (kept for compatibility with date-range methods) */
  private async querySessionsInRange(from: string, to: string) {
    return this.getSessionsBetween(from, to);
  }

  private extractEntries(sess: any) {
    const raw =
      (Array.isArray(sess.entries) && sess.entries) ||
      (Array.isArray(sess.attendance_entries) && sess.attendance_entries) ||
      [];
    if (raw.length) {
      return raw
        .map((e: any) => ({
          studentId: e.student_id || e.studentId || e.uid,
          status: (e.status || '').trim(),
        }))
        .filter((e: any) => e.studentId);
    }
    const results: any[] = [];
    if (Array.isArray(sess.studentsPresent)) {
      for (const sid of sess.studentsPresent) {
        results.push({ studentId: sid, status: 'present' });
      }
    }
    if (Array.isArray(sess.studentsAbsent)) {
      for (const sid of sess.studentsAbsent) {
        results.push({ studentId: sid, status: 'absent' });
      }
    }
    return results;
  }

  private extractDay(sess: any) {
    const raw = sess.timeStarted || sess.date || sess.createdAt;
    const d = parseFlexibleDate(raw);
    return d.toISOString().slice(0,10);
  }
}

/* ---------------- Utilities ---------------- */
function enumerateDates(from: string, to: string): Date[] {
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  const arr: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    arr.push(new Date(d));
  }
  return arr;
}

function parseFlexibleDate(value: string): Date {
  const fixed = value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  return new Date(fixed);
}

function monthToRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  return {
    fromDate: first.toISOString().slice(0,10),
    toDate: last.toISOString().slice(0,10)
  };
}

function monthName(monthKey: string) {
  const [y,m] = monthKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, 1));
  return dt.toLocaleString('en', { month: 'long' });
}