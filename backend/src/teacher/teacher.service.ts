import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

@Injectable()
export class TeacherService {
  private db = getFirestore();

  private buildComputedName(subjectName?: string, section?: string, gradeLevel?: string, fallbackName?: string) {
    const sName = (subjectName || "").trim();
    const sec = (section || "").trim();
    const grade = (gradeLevel || "").toString().trim();

    if (sName && sec && grade) return `${sName} ${sec}-${grade}`;
    if (sName && sec) return `${sName} ${sec}`;
    if (sName) return sName;
    return (fallbackName || "").trim();
  }

  private buildClassDoc(data: any) {
    const subjectName = (data.subjectName ?? data.subject ?? "").trim();
    const roomNumber = (data.roomNumber ?? data.roomId ?? "").trim();
    const section = (data.section ?? "").trim();
    const gradeLevel = (data.gradeLevel ?? "").toString().trim();
    const days = (data.days ?? "").trim();
    const time = (data.time ?? "").trim();
    const roomId = (data.roomId ?? data.roomNumber ?? "").trim();
    const teacherId = data.teacherId;

    const computedName = this.buildComputedName(subjectName, section, gradeLevel, data.name);
    const now = new Date().toISOString();

    return {
      name: computedName,
      subjectName,
      teacherId,
      roomId,
      section,
      gradeLevel,
      days,
      time,
      roomNumber,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
    };
  }

  // Add Class (top-level "classes") + mirror to teachers/{teacherId}: { classes: [id], subjects: [subjectName] }
  async addClass(data: any) {
    const { teacherId, subjectName, roomNumber, section, days, time, gradeLevel } = data;
    if (!teacherId || !subjectName || !roomNumber || !section || !days || !time || !gradeLevel) {
      throw new BadRequestException("All fields are required including grade level.");
    }

    const providedId: string | undefined = data.classId;
    const classesCol = this.db.collection("classes");
    const classRef = providedId ? classesCol.doc(providedId) : classesCol.doc();

    const classDoc = this.buildClassDoc(data);
    await classRef.set(classDoc);

    // Ensure no stray "subject" key
    await classRef.update({ subject: FieldValue.delete() });

    // Mirror into teacher doc
    const teacherRef = this.db.collection("teachers").doc(teacherId);
    await teacherRef.set(
      {
        classes: FieldValue.arrayUnion(classRef.id),
        subjects: FieldValue.arrayUnion(classDoc.subjectName),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { success: true, id: classRef.id };
  }

  // Get Classes
  async getClasses(teacherId: string) {
    const classesCol = this.db.collection("classes");
    try {
      const snapshot = await classesCol
        .where("teacherId", "==", teacherId)
        .orderBy("createdAt", "desc")
        .get();

      const classes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, classes };
    } catch (e: any) {
      const needsIndex =
        e?.code === 9 ||
        (typeof e?.message === "string" && e.message.toLowerCase().includes("requires an index"));

      if (!needsIndex) throw e;

      // Fallback without index: where only then sort in memory
      const snapNoOrder = await classesCol.where("teacherId", "==", teacherId).get();
      const classes = snapNoOrder.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      return { success: true, classes, needsIndex: true };
    }
  }

  // Update Class — recompute name, remove "subject", and sync teacher's subjects/classes arrays
  async updateClass(teacherId: string, classId: string, data: any) {
    const classRef = this.db.collection("classes").doc(classId);
    const docSnap = await classRef.get();
    if (!docSnap.exists) throw new NotFoundException("Class not found");

    const cls = docSnap.data();
    if (cls?.teacherId !== teacherId) {
      throw new BadRequestException("You do not have permission to update this class.");
    }

    const oldSubject = (cls?.subjectName || "").trim();

    const updated = this.buildClassDoc({ ...cls, ...data });

    await classRef.update({
      ...updated,
      updatedAt: new Date().toISOString(),
      // Remove fields we don't want to persist
      subject: FieldValue.delete(),
      schedule: FieldValue.delete(),
      startTime: FieldValue.delete(),
      endTime: FieldValue.delete(),
    });

    // Mirror: ensure classId present and add new subject if changed
    const teacherRef = this.db.collection("teachers").doc(teacherId);
    await teacherRef.set(
      {
        classes: FieldValue.arrayUnion(classId),
        // Add current subject in case it's new
        subjects: FieldValue.arrayUnion(updated.subjectName),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // If subject changed, and no other classes use the old subject, remove it
    const newSubject = (updated.subjectName || "").trim();
    if (oldSubject && newSubject && oldSubject !== newSubject) {
      const othersSnap = await this.db
        .collection("classes")
        .where("teacherId", "==", teacherId)
        .where("subjectName", "==", oldSubject)
        .get();

      // After the update above, this class no longer matches oldSubject.
      if (othersSnap.empty) {
        await teacherRef.update({ subjects: FieldValue.arrayRemove(oldSubject) });
      }
    }

    // 🔄 Sync minimal fields to each student's legacy classes[] entry — safe no-op if IDs-only schema
    const studentsSnapshot = await classRef.collection("students").get();
    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const studentRef = this.db.collection("students").doc(studentId);
      const studentSnap = await studentRef.get();

      if (studentSnap.exists) {
        const studentData = studentSnap.data() as any;
        if (Array.isArray(studentData?.classes) && studentData.classes.length) {
          const allStrings = studentData.classes.every((c: any) => typeof c === "string");
          if (allStrings) continue;

          const updatedClasses = studentData.classes.map((c: any) =>
            c.id === classId
              ? {
                  ...c,
                  id: classId,
                  name: updated.name,
                  subjectName: updated.subjectName,
                  teacherId: updated.teacherId,
                  roomId: updated.roomId,
                  roomNumber: updated.roomNumber,
                  section: updated.section,
                  gradeLevel: updated.gradeLevel,
                  days: updated.days,
                  time: updated.time,
                }
              : c
          );
          await studentRef.update({ classes: updatedClasses });
        }
      }
    }

    return { success: true, message: "Class updated successfully" };
  }

  async deleteClass(teacherId: string, classId: string) {
    const classRef = this.db.collection("classes").doc(classId);
    const docSnap = await classRef.get();
    if (!docSnap.exists) throw new NotFoundException("Class not found");

    const cls = docSnap.data();
    if (cls?.teacherId !== teacherId) {
      throw new BadRequestException("You do not have permission to delete this class.");
    }

    const subjectToMaybeRemove = (cls?.subjectName || "").trim();

    // Remove class reference from students
    const studentsSnapshot = await classRef.collection("students").get();
    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const studentRef = this.db.collection("students").doc(studentId);
      const studentSnap = await studentRef.get();

      if (studentSnap.exists) {
        const studentData = studentSnap.data() as any;
        if (Array.isArray(studentData?.classes) && studentData.classes.length) {
          const allStrings = studentData.classes.every((c: any) => typeof c === "string");
          if (allStrings) {
            await studentRef.update({ classes: FieldValue.arrayRemove(classId) });
          } else {
            const updatedClasses = studentData.classes.filter((c: any) => c.id !== classId);
            await studentRef.update({ classes: updatedClasses });
          }
        }
      }
    }

    // Delete posts and students subcollections
    const postsSnapshot = await classRef.collection("posts").get();
    const batch = this.db.batch();
    postsSnapshot.docs.forEach((d) => batch.delete(d.ref));
    studentsSnapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    // Delete class document
    await classRef.delete();

    // Mirror cleanup in teacher doc
    const teacherRef = this.db.collection("teachers").doc(teacherId);
    await teacherRef.update({
      classes: FieldValue.arrayRemove(classId),
      updatedAt: new Date().toISOString(),
    });

    // If no other classes with this subject remain, remove the subject from teacher.subjects
    if (subjectToMaybeRemove) {
      const othersSnap = await this.db
        .collection("classes")
        .where("teacherId", "==", teacherId)
        .where("subjectName", "==", subjectToMaybeRemove)
        .get();

      if (othersSnap.empty) {
        await teacherRef.update({ subjects: FieldValue.arrayRemove(subjectToMaybeRemove) });
      }
    }

    return { success: true, message: "Class deleted successfully" };
  }

  // Posts unchanged (top-level classes/{classId}/posts)
  async addPost(data: any) {
    const { teacherId, classId, content, fileUrl, imageUrl, fileName, fileType } = data;
    if (!teacherId || !classId) throw new BadRequestException("Missing teacherId or classId");

    const classRef = this.db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) throw new NotFoundException("Class not found");
    if (classSnap.data()?.teacherId !== teacherId) {
      throw new BadRequestException("You do not have permission to post to this class.");
    }
    if (!content && !fileUrl && !imageUrl) {
      throw new BadRequestException("Post must include text, image, or file.");
    }

    const post = {
      teacherId,
      classId,
      content: content ?? null,
      fileUrl: fileUrl ?? null,
      imageUrl: imageUrl ?? null,
      fileName: fileName ?? null,
      fileType: fileType ?? null,
      timestamp: new Date().toISOString(),
    };

    const postRef = await classRef.collection("posts").add(post);
    return { success: true, post: { id: postRef.id, ...post } };
  }

  async getClassPosts(teacherId: string, classId: string) {
    const classRef = this.db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) throw new NotFoundException("Class not found");
    if (classSnap.data()?.teacherId !== teacherId) {
      throw new BadRequestException("You do not have permission to view posts for this class.");
    }

    const postsSnapshot = await classRef.collection("posts").orderBy("timestamp", "desc").get();
    const posts = postsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { success: true, posts };
  }

  async getClassStudents(teacherId: string, classId: string) {
    const classRef = this.db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) throw new NotFoundException("Class not found");
    if (classSnap.data()?.teacherId !== teacherId) {
      throw new BadRequestException("You do not have permission to view students for this class.");
    }

    const studentsSnapshot = await classRef.collection("students").get();
    if (studentsSnapshot.empty)
      return { success: true, students: [], message: "No students have joined yet." };

    const students = await Promise.all(
      studentsSnapshot.docs.map(async (doc) => {
        const studentId = doc.id;
        const studentDoc = await this.db.collection("students").doc(studentId).get();
        const studentData = studentDoc.exists ? studentDoc.data() : {};
        return {
          id: studentId,
          joinedAt: doc.data().joinedAt,
          firstName: (studentData as any)?.firstName || (studentData as any)?.firstname || null,
          middleName: (studentData as any)?.middleName || (studentData as any)?.middlename || null,
          lastName: (studentData as any)?.lastName || (studentData as any)?.lastname || null,
          email: (studentData as any)?.school_email || (studentData as any)?.personal_email || null,
          status: (studentData as any)?.status || null,
        };
      })
    );

    return { success: true, students };
  }

  async getTeacherStats(teacherId: string) {
    const classesSnapshot = await this.db.collection("classes").where("teacherId", "==", teacherId).get();

    if (classesSnapshot.empty)
      return { success: true, totalClasses: 0, totalStudents: 0, totalSubjects: 0 };

    const subjectSet = new Set<string>();

    for (const classDoc of classesSnapshot.docs) {
      const classData: any = classDoc.data();
      if (classData.subjectName) subjectSet.add((classData.subjectName as string).trim());
      // You can also aggregate student counts by reading subcollections if desired
    }

    return {
      success: true,
      totalClasses: classesSnapshot.size,
      totalStudents: 0,
      totalSubjects: subjectSet.size,
    };
  }

  async saveProfilePicture(teacherId: string, imageUrl: string) {
    if (!imageUrl) throw new BadRequestException("No image URL provided");

    const teacherRef = this.db.collection("teachers").doc(teacherId);
    await teacherRef.set(
      { profilePicUrl: imageUrl, updatedAt: new Date().toISOString() },
      { merge: true }
    );

    return { success: true, message: "Profile picture uploaded successfully", imageUrl };
  }
}