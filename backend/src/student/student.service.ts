import { Injectable, NotFoundException } from '@nestjs/common';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

@Injectable()
export class StudentService {
  private db = getFirestore();

  // ---------------- Join Class ----------------
  async joinClassByLink(studentId: string, classId: string) {
    // Get all teachers
    const teachersSnapshot = await this.db.collection('teachers').get();
    let teacherId: string | null = null;
    let classData: any = null;

    // Find class in teacher collections
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

    // Add student to teacher's class
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

    // Add class to student's document with createdAt
    const studentMainRef = this.db.collection('students').doc(studentId);
    const studentClassEntry = {
      id: classId,
      ...classData,
      teacherId,
      createdAt: new Date().toISOString(), // ✅ ensure createdAt exists
    };

    await studentMainRef.set(
      { classes: FieldValue.arrayUnion(studentClassEntry) },
      { merge: true }
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

    // Find teacher for the class
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

    // Remove student from teacher's class
    const studentRef = this.db
      .collection('teachers')
      .doc(teacherId)
      .collection('classes')
      .doc(classId)
      .collection('students')
      .doc(studentId);

    await studentRef.delete();

    // Remove class from student's document
    const studentMainRef = this.db.collection('students').doc(studentId);
    const studentSnap = await studentMainRef.get();

    if (studentSnap.exists) {
      const studentData = studentSnap.data();
      if (studentData?.classes?.length) {
        const updatedClasses = studentData.classes.filter(
          (cls: any) => cls.id !== classId
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

    if (!studentSnap.exists) {
      throw new NotFoundException('Student not found');
    }

    const studentData = studentSnap.data();
    const studentClasses = studentData?.classes || [];
    const notifications: any[] = [];

    for (const cls of studentClasses) {
      const classId = cls.id;
      const teacherId = cls.teacherId;

      // ✅ Get teacher data
      const teacherSnap = await this.db.collection('teachers').doc(teacherId).get();
      const teacherData = teacherSnap.exists ? teacherSnap.data() : null;
      const teacherName = teacherData
        ? `${teacherData.firstname || teacherData.firstName || ''} ${teacherData.lastname || teacherData.lastName || ''}`.trim()
        : 'Unknown Teacher';

      // ✅ Fetch posts in the teacher’s class
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
        });
      });
    }

    // ✅ Sort by latest post on top
    notifications.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return notifications;
  }
}
