import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

@Injectable()
export class StudentService {
  private db = getFirestore();

  // ---------------- Join Class (top-level classes collection) ----------------
  async joinClassByLink(studentId: string, classId: string) {
    if (!studentId || !classId) {
      throw new BadRequestException('Missing studentId or classId');
    }

    const classRef = this.db.collection('classes').doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) throw new NotFoundException('Class not found');

    // Check if already joined in class's students subcollection
    const enrollmentRef = classRef.collection('students').doc(studentId);
    const enrollmentSnap = await enrollmentRef.get();
    if (enrollmentSnap.exists) {
      return { success: false, message: 'You already joined this class' };
    }

    // Enroll student in class
    await enrollmentRef.set({ joinedAt: new Date().toISOString() });

    // Add classId to student's classes array (array of strings)
    const studentRef = this.db.collection('students').doc(studentId);
    await studentRef.set({ classes: FieldValue.arrayUnion(classId) }, { merge: true });

    // Return full class info for convenience
    const classData = classSnap.data() || {};
    const responseClass = {
      id: classId,
      name: classData.name ?? '',
      subjectName: classData.subjectName ?? '',
      teacherId: classData.teacherId ?? '',
      roomId: classData.roomId ?? classData.roomNumber ?? '',
      roomNumber: classData.roomNumber ?? classData.roomId ?? '',
      section: classData.section ?? '',
      gradeLevel: classData.gradeLevel ?? '',
      days: classData.days ?? '',
      time: classData.time ?? '',
    };

    return {
      success: true,
      message: 'Class joined successfully',
      class: responseClass,
    };
  }

  // ---------------- Leave Class (top-level classes collection) ----------------
  async leaveClass(studentId: string, classId: string) {
    if (!studentId || !classId) {
      throw new BadRequestException('Missing studentId or classId');
    }

    const classRef = this.db.collection('classes').doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) throw new NotFoundException('Class not found');

    // Remove from class's students subcollection
    await classRef.collection('students').doc(studentId).delete();

    // Remove classId from student's classes array
    const studentRef = this.db.collection('students').doc(studentId);
    await studentRef.set({ classes: FieldValue.arrayRemove(classId) }, { merge: true });

    return { success: true, message: 'Successfully left the class' };
  }

  // ---------------- Get Notifications ----------------
  async getStudentNotifications(studentId: string) {
    const studentRef = this.db.collection('students').doc(studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) throw new NotFoundException('Student not found');

    const studentData = studentSnap.data() || {};
    const classIds: string[] = Array.isArray(studentData.classes) ? studentData.classes : [];

    const notifications: any[] = [];

    for (const classId of classIds) {
      const classRef = this.db.collection('classes').doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) continue;

      const cls = classSnap.data() || {};
      const subjectName = (cls.subjectName || 'Untitled Subject') as string;
      const teacherId = (cls.teacherId || '') as string;

      // Fetch teacher's name
      let teacherName = 'Unknown Teacher';
      if (teacherId) {
        const teacherSnap = await this.db.collection('teachers').doc(teacherId).get();
        if (teacherSnap.exists) {
          const t = teacherSnap.data() || {};
          const firstName = t.firstName ?? t.firstname ?? '';
          const middleName = t.middleName ?? t.middlename ?? '';
          const lastName = t.lastName ?? t.lastname ?? '';
          teacherName = `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim() || 'Unknown Teacher';
        }
      }

      // Fetch posts from classes/{classId}/posts (ordered by timestamp desc)
      const postsSnap = await classRef.collection('posts').orderBy('timestamp', 'desc').get();
      postsSnap.forEach((doc) => {
        const post = doc.data() || {};
        notifications.push({
          id: doc.id,
          title: `${subjectName} — ${teacherName}`,
          content: post.content || 'No content provided.',
          createdAt: post.timestamp || new Date().toISOString(),
          classId,
          gradeLevel: cls.gradeLevel || 'N/A',
        });
      });
    }

    // Sort by createdAt DESC
    notifications.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return notifications;
  }

  // ---------------- Get Student Schedule ----------------
  async getStudentSchedule(studentId: string) {
    const studentRef = this.db.collection('students').doc(studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) throw new NotFoundException('Student not found');

    const studentData = studentSnap.data() || {};
    const classIds: string[] = Array.isArray(studentData.classes) ? studentData.classes : [];

    if (!classIds.length) return [];

    const results: any[] = [];
    for (const id of classIds) {
      const snap = await this.db.collection('classes').doc(id).get();
      if (!snap.exists) continue;
      results.push({ id, ...snap.data() });
    }

    return results;
  }

  // ---------------- Save Profile Picture ----------------
  async saveProfilePicture(studentId: string, imageUrl: string) {
    if (!imageUrl) throw new BadRequestException('No image URL provided');

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