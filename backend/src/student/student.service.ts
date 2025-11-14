  import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
  import { getFirestore, FieldValue } from 'firebase-admin/firestore';

  @Injectable()
  export class StudentService {
    private db = getFirestore();

    async joinClassByLink(studentId: string, classId: string) {
      if (!studentId || !classId) {
        throw new BadRequestException('Missing studentId or classId');
      }
    
      // Sanitize incoming classId in case the frontend sent a prefixed link
      let cleaned = classId.trim();
    
      // Strip possible full URL
      cleaned = cleaned.replace(/^https?:\/\/[^/]+/i, '');
      cleaned = cleaned.replace(/^\/+/, '');
      cleaned = cleaned.replace(/^join-class\//i, '').replace(/^joinclass\//i, '');
    
      // If there are still slashes, take only last segment (or reject)
      if (cleaned.includes('/')) {
        const parts = cleaned.split('/').filter(Boolean);
        cleaned = parts[parts.length - 1];
      }
    
      // Final validation: Firestore doc IDs cannot contain '/'
      if (!cleaned || cleaned.includes('/')) {
        throw new BadRequestException('Invalid classId format');
      }
    
      const classRef = this.db.collection('classes').doc(cleaned);
      const classSnap = await classRef.get();
      if (!classSnap.exists) throw new NotFoundException('Class not found');
    
      const enrollmentRef = classRef.collection('students').doc(studentId);
      if ((await enrollmentRef.get()).exists) {
        return { success: false, message: 'You already joined this class' };
      }
    
      await enrollmentRef.set({ joinedAt: new Date().toISOString() });
      await this.db.collection('students').doc(studentId)
        .set({ classes: FieldValue.arrayUnion(cleaned) }, { merge: true });
    
      const classData = classSnap.data() || {};
      return {
        success: true,
        message: 'Class joined successfully',
        class: {
          id: cleaned,
          name: classData.name ?? '',
          subjectName: classData.subjectName ?? '',
          teacherId: classData.teacherId ?? '',
          roomId: classData.roomId ?? classData.roomNumber ?? '',
          roomNumber: classData.roomNumber ?? classData.roomId ?? '',
          section: classData.section ?? '',
          gradeLevel: classData.gradeLevel ?? '',
          days: classData.days ?? '',
          time: classData.time ?? '',
        },
      };
    }

    async leaveClass(studentId: string, classId: string) {
      if (!studentId || !classId) throw new BadRequestException('Missing studentId or classId');
      const classRef = this.db.collection('classes').doc(classId);
      if (!(await classRef.get()).exists) throw new NotFoundException('Class not found');

      await classRef.collection('students').doc(studentId).delete();
      await this.db.collection('students').doc(studentId)
        .set({ classes: FieldValue.arrayRemove(classId) }, { merge: true });

      return { success: true, message: 'Successfully left the class' };
    }

    async getStudentNotifications(studentId: string) {
      const studentSnap = await this.db.collection('students').doc(studentId).get();
      if (!studentSnap.exists) throw new NotFoundException('Student not found');
      const studentData = studentSnap.data() || {};
      const classIds: string[] = Array.isArray(studentData.classes) ? studentData.classes : [];

      const notifications: any[] = [];
      for (const classId of classIds) {
        const classRef = this.db.collection('classes').doc(classId);
        const clsSnap = await classRef.get();
        if (!clsSnap.exists) continue;

        const cls = clsSnap.data() || {};
        const subjectName = cls.subjectName || 'Untitled Subject';
        const teacherId = cls.teacherId || '';
        let teacherName = 'Unknown Teacher';
        if (teacherId) {
          const tSnap = await this.db.collection('teachers').doc(teacherId).get();
          if (tSnap.exists) {
            const t = tSnap.data() || {};
            teacherName = `${t.firstName ?? t.firstname ?? ''} ${t.middleName ?? t.middlename ?? ''} ${t.lastName ?? t.lastname ?? ''}`
              .replace(/\s+/g, ' ').trim() || 'Unknown Teacher';
          }
        }

        const postsSnap = await classRef.collection('posts').orderBy('timestamp', 'desc').get();
        postsSnap.forEach(p => {
          const post = p.data() || {};
          notifications.push({
            id: p.id,
            title: `${subjectName} — ${teacherName}`,
            content: post.content || 'No content provided.',
            createdAt: post.timestamp || new Date().toISOString(),
            classId,
            gradeLevel: cls.gradeLevel || 'N/A',
          });
        });
      }

      notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return notifications;
    }

    async getStudentSchedule(studentId: string) {
      const studentSnap = await this.db.collection('students').doc(studentId).get();
      if (!studentSnap.exists) throw new NotFoundException('Student not found');

      const studentData = studentSnap.data() || {};
      const section = (studentData.section || '').toString().trim();
      const gradeLevel = (studentData.gradelevel ?? studentData.gradeLevel ?? '').toString().trim();

      const buildSectionKey = (gl: string, sec: string) => (gl && sec ? `${gl}-${sec}` : gl || sec || '');

      if (section || gradeLevel) {
        const schedSnap = await this.db.collection('schedules').doc('sectionschedule').get();
        if (schedSnap.exists) {
          const docData = schedSnap.data() || {};
          const sectionKey = buildSectionKey(gradeLevel, section);

          // Try 11-A, then section, then gradeLevel as fallbacks
          let bySection: any =
            docData[sectionKey] ??
            docData[section] ??
            docData[gradeLevel];

          const normalizeArrayOrNumericMap = (value: any): any[] => {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            if (typeof value === 'object') {
              return Object.keys(value).sort((a, b) => Number(a) - Number(b)).map(k => value[k]);
            }
            return [];
          };

          const normalizeItem = (it: any) => {
            if (!it) return null;
            return {
              subjectName: it.Subject ?? it.subjectName ?? it.subject ?? it.section ?? 'N/A',
              days: it.days ?? it.Days ?? it.day ?? it.Day ?? 'N/A',
              time: it.time ?? it.Time ?? 'N/A',
              roomNumber: it.roomNumber ?? it.room ?? it.Room ?? 'N/A',
              teacherName: it.Teacher ?? it.teacherName ?? it.teacher ?? null,
            };
          };

          return normalizeArrayOrNumericMap(bySection)
            .map(normalizeItem)
            .filter(Boolean);
        }
      }

      // Fallback to class-based
      const classIds: string[] = Array.isArray(studentData.classes) ? studentData.classes : [];
      if (!classIds.length) return [];

      const results: any[] = [];
      for (const id of classIds) {
        const clsSnap = await this.db.collection('classes').doc(id).get();
        if (!clsSnap.exists) continue;
        results.push({ id, ...clsSnap.data() });
      }
      return results;
    }

    async saveProfilePicture(studentId: string, imageUrl: string) {
      if (!imageUrl) throw new BadRequestException('No image URL provided');
      await this.db.collection('students').doc(studentId)
        .set({ profilePicUrl: imageUrl, updatedAt: new Date().toISOString() }, { merge: true });
      return { success: true, message: 'Profile picture uploaded successfully', imageUrl };
    }
  }