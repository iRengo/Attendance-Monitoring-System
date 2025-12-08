import { Injectable, Logger } from '@nestjs/common';
import { SmsService } from './sms.service';
import { Firestore } from '@google-cloud/firestore';

@Injectable()
export class AttendanceSmsService {
  private firestore: Firestore;
  private logger = new Logger('AttendanceSmsService');

  constructor(private readonly smsService: SmsService) {
    this.firestore = new Firestore();

    // Start listening to attendance_sessions in real-time
    this.listenToAttendanceSessions();
  }

  // 🔹 FORMATTER FOR TEXT MESSAGE
  private formatDateTime(dateString: string): string {
    const date = new Date(dateString);

    return date.toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).replace(",", " |");
  }

  private listenToAttendanceSessions() {
    this.firestore
      .collection('attendance_sessions')
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const sessionData = change.doc.data();
            if (!sessionData?.date) return;

            const sessionDay = new Date(sessionData.date)
              .toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
              .split(',')[0];

            const todayDay = new Date()
              .toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
              .split(',')[0];

            if (sessionDay === todayDay) {
              this.logger.log(`New attendance session today detected: ${change.doc.id}`);
              this.sendAttendanceNotifications(change.doc.id);
            }
          }
        });
      });
  }

  async sendAttendanceNotifications(sessionId: string) {
    const sessionDoc = await this.firestore
      .collection('attendance_sessions')
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      this.logger.warn(`Attendance session ${sessionId} not found`);
      return;
    }

    const sessionData = sessionDoc.data();
    if (!sessionData) return;

    const { studentsPresent = [], studentsAbsent = [], classId, date: sessionDateStr, timeStarted } = sessionData;

    const sendSMS = async (studentId: string, status: string) => {
      const studentDoc = await this.firestore.collection('students').doc(studentId).get();
      if (!studentDoc.exists) return;

      const student = studentDoc.data();
      if (!student?.guardiancontact) return;

      // Get class/subject name
      let subjectName = classId;
      if (classId) {
        const classDoc = await this.firestore.collection('classes').doc(classId).get();
        if (classDoc.exists) {
          subjectName = classDoc.data()?.subjectName || classId;
        }
      }

      // 🔹 FORMAT THE TIME STARTED (String from Firestore)
      const formattedTime = this.formatDateTime(timeStarted);

      // 🔹 UPDATED MESSAGE USING FORMATTED TIME
      const message = `Hello ${student.guardianname}, your child ${student.firstname} is ${status} today in ${subjectName} at ${formattedTime}.`;

      try {
        await this.smsService.sendSMS(student.guardiancontact, message);
        this.logger.log(`SMS sent to ${student.guardiancontact} for ${student.firstname}`);
      } catch (err) {
        this.logger.error(`Failed to send SMS to ${student.guardiancontact}: ${err.message}`);
      }
    };

    for (const studentId of studentsPresent) {
      await sendSMS(studentId, 'present');
    }

    for (const studentId of studentsAbsent) {
      await sendSMS(studentId, 'absent');
    }
  }
}
