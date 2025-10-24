import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

@Injectable()
export class StudentService {
  private db = getFirestore();

  // ---------------- Join Class ----------------
  async joinClassByLink(studentId: string, classId: string) {
    const teachersSnapshot = await this.db.collection('teachers').get();
    let teacherId: string | null = null;
    let classData: any = null;

    for (const teacherDoc of teachersSnapshot.docs) {
      const classDoc = await this.db
        .collection('teachers')
        .doc(teacherDoc.id)
        .collection('classes')
        .doc(classId)
        .get();

      if (classDoc.exists) {
        teacherId = teacherDoc.id;
        classData = classDoc.data();
        break;
      }
    }

    if (!teacherId) throw new NotFoundException('Class not found');

    const studentRef = this.db
      .collection('teachers')
      .doc(teacherId)
      .collection('classes')
      .doc(classId)
      .collection('students')
      .doc(studentId);

    const studentDoc = await studentRef.get();
    if (studentDoc.exists)
      return { success: false, message: 'You already joined this class' };

    await studentRef.set({ joinedAt: new Date().toISOString() });

    const studentMainRef = this.db.collection('students').doc(studentId);
    const studentSnap = await studentMainRef.get();
    const studentData = studentSnap.exists ? studentSnap.data() : {};

    const gradeLevel =
      classData?.gradeLevel ||
      studentData?.gradeLevel ||
      studentData?.grade ||
      studentData?.level ||
      'N/A';

    const section =
      classData?.section ||
      studentData?.section ||
      studentData?.studentSection ||
      'N/A';

    const studentClassEntry = {
      id: classId,
      teacherId,
      subjectName: classData?.subjectName || 'Unknown Subject',
      roomNumber: classData?.roomNumber || 'N/A',
      days: classData?.days || 'N/A',
      time: classData?.time || 'N/A',
      gradeLevel,
      section,
      createdAt: new Date().toISOString(),
    };

    await studentMainRef.set(
      { classes: FieldValue.arrayUnion(studentClassEntry) },
      { merge: true },
    );

    return {
      success: true,
      message: 'Class joined successfully',
      class: studentClassEntry,
    };
  }

  // ---------------- Leave Class ----------------
  async leaveClass(studentId: string, classId: string) {
    const teachersSnapshot = await this.db.collection('teachers').get();
    let teacherId: string | null = null;

    for (const teacherDoc of teachersSnapshot.docs) {
      const classDoc = await this.db
        .collection('teachers')
        .doc(teacherDoc.id)
        .collection('classes')
        .doc(classId)
        .get();

      if (classDoc.exists) {
        teacherId = teacherDoc.id;
        break;
      }
    }

    if (!teacherId) throw new NotFoundException('Class not found');

    await this.db
      .collection('teachers')
      .doc(teacherId)
      .collection('classes')
      .doc(classId)
      .collection('students')
      .doc(studentId)
      .delete();

    const studentMainRef = this.db.collection('students').doc(studentId);
    const studentSnap = await studentMainRef.get();

    if (studentSnap.exists) {
      const studentData = studentSnap.data();
      if (studentData?.classes?.length) {
        const updatedClasses = studentData.classes.filter(
          (cls: any) => cls.id !== classId,
        );
        await studentMainRef.update({ classes: updatedClasses });
      }
    }

    return { success: true, message: 'Successfully left the class' };
  }

  // ---------------- Get Notifications ----------------
  async getStudentNotifications(studentId: string) {
    const studentRef = this.db.collection('students').doc(studentId);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) throw new NotFoundException('Student not found');

    const studentData = studentSnap.data();
    const studentClasses = studentData?.classes || [];
    const notifications: any[] = [];

    for (const cls of studentClasses) {
      const classId = cls.id;
      const teacherId = cls.teacherId;

      const teacherSnap = await this.db
        .collection('teachers')
        .doc(teacherId)
        .get();
      const teacherData = teacherSnap.exists ? teacherSnap.data() : null;
      const teacherName = teacherData
        ? `${teacherData.firstname || teacherData.firstName || ''} ${
            teacherData.lastname || teacherData.lastName || ''
          }`.trim()
        : 'Unknown Teacher';

      const postsSnap = await this.db
        .collection('teachers')
        .doc(teacherId)
        .collection('classes')
        .doc(classId)
        .collection('posts')
        .orderBy('createdAt', 'desc')
        .get();

      postsSnap.forEach((doc) => {
        const post = doc.data();
        notifications.push({
          id: doc.id,
          title: `${cls.subjectName || 'Untitled Subject'} — ${teacherName}`,
          content: post.content || 'No content provided.',
          createdAt: post.createdAt || new Date().toISOString(),
          classId,
          gradeLevel: cls.gradeLevel || 'N/A',
        });
      });
    }

    notifications.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );

    return notifications;
  }

  // ---------------- Get Student Schedule ----------------
  async getStudentSchedule(studentId: string) {
    const studentRef = this.db.collection('students').doc(studentId);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) throw new NotFoundException('Student not found');
    const studentData = studentSnap.data();
    return studentData?.classes || [];
  }

  // ---------------- Save Profile Picture ----------------
  async saveProfilePicture(studentId: string, imageUrl: string) {
    const studentRef = this.db.collection('students').doc(studentId);
    await studentRef.set(
      {
        profilePicUrl: imageUrl,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return {
      success: true,
      message: 'Profile picture uploaded successfully',
      imageUrl,
    };
  }
}
