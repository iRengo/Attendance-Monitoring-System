import { Injectable, Logger } from '@nestjs/common';
import { SmsService } from './sms.service';
import { Firestore, FieldValue } from '@google-cloud/firestore';

@Injectable()
export class AttendanceSmsService {
  private firestore: Firestore;
  private logger = new Logger('AttendanceSmsService');

  constructor(private readonly smsService: SmsService) {
    this.firestore = new Firestore();
    this.listenToAttendanceSessions();
  }

  // 🔹 Date formatter (Manila time)
  private formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).replace(',', ' |');
  }

  // ✅ REAL-TIME LISTENER (NO PM2 WATCH NEEDED)
  private listenToAttendanceSessions() {
    this.firestore
      .collection('attendance_sessions')
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type !== 'modified') return;

          const sessionId = change.doc.id;
          const sessionData = change.doc.data();

          if (!sessionData) return;

          this.handleRealtimeAttendance(sessionId, sessionData);
        });
      });
  }

  // ✅ Handle student-by-student SMS
  private async handleRealtimeAttendance(sessionId: string, sessionData: any) {
    const {
      studentsPresent = [],
      studentsAbsent = [],
      smsSentPresent = [],
      smsSentAbsent = [],
      classId,
      timeStarted,
    } = sessionData;

    // 🔹 Fetch subject name once
    let subjectName = classId;
    if (classId) {
      const classDoc = await this.firestore.collection('classes').doc(classId).get();
      if (classDoc.exists) {
        subjectName = classDoc.data()?.subjectName || classId;
      }
    }

    const formattedTime = this.formatDateTime(timeStarted);

    // ✅ PRESENT STUDENTS
    for (const studentId of studentsPresent) {
      if (smsSentPresent.includes(studentId)) continue;

      await this.sendStudentSMS(studentId, 'present', subjectName, formattedTime);

      await this.firestore
        .collection('attendance_sessions')
        .doc(sessionId)
        .update({
          smsSentPresent: FieldValue.arrayUnion(studentId),
        });
    }

    // ✅ ABSENT STUDENTS
    for (const studentId of studentsAbsent) {
      if (smsSentAbsent.includes(studentId)) continue;

      await this.sendStudentSMS(studentId, 'absent', subjectName, formattedTime);

      await this.firestore
        .collection('attendance_sessions')
        .doc(sessionId)
        .update({
          smsSentAbsent: FieldValue.arrayUnion(studentId),
        });
    }
  }

  // 🔹 Send SMS to guardian
  private async sendStudentSMS(
    studentId: string,
    status: 'present' | 'absent',
    subjectName: string,
    formattedTime: string,
  ) {
    const studentDoc = await this.firestore.collection('students').doc(studentId).get();
    if (!studentDoc.exists) return;

    const student = studentDoc.data();
    if (!student?.guardiancontact) return;

    const message = `Hello ${student.guardianname}, your child ${student.firstname} is ${status} today in ${subjectName} at ${formattedTime}.`;

    try {
      await this.smsService.sendSMS(student.guardiancontact, message);
      this.logger.log(`📩 SMS sent to ${student.firstname} (${status})`);
    } catch (err) {
      this.logger.error(`SMS failed for ${student.firstname}: ${err.message}`);
    }
  }
}
