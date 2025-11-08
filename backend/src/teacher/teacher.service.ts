import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

@Injectable()
export class TeacherService {
  private db = getFirestore();

  private buildComputedName(
    subjectName?: string,
    section?: string,
    gradeLevel?: string,
    fallbackName?: string
  ) {
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

    // Transitional fallback: if roomNumber missing but legacy roomId exists, adopt roomId as roomNumber.
    const legacyRoomId = (data.roomId ?? "").trim();
    const roomNumberRaw = (data.roomNumber ?? "").trim();
    const roomNumber = roomNumberRaw || legacyRoomId; // Only keep roomNumber.

    const section = (data.section ?? "").trim();
    const gradeLevel = (data.gradeLevel ?? "").toString().trim();
    const days = (data.days ?? "").trim();
    const time = (data.time ?? "").trim();
    const teacherId = data.teacherId;

    const computedName = this.buildComputedName(
      subjectName,
      section,
      gradeLevel,
      data.name
    );
    const now = new Date().toISOString();

    return {
      name: computedName,
      subjectName,
      teacherId,
      // roomId removed permanently
      roomNumber,
      section,
      gradeLevel,
      days,
      time,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
    };
  }

  async addClass(data: any) {
    const {
      teacherId,
      subjectName,
      roomNumber,
      roomId, // may come from legacy clients
      section,
      days,
      time,
      gradeLevel,
    } = data;

    // Validate after normalization fallback
    const effectiveRoomNumber = (roomNumber || roomId || "").trim();

    if (
      !teacherId ||
      !subjectName ||
      !effectiveRoomNumber ||
      !section ||
      !days ||
      !time ||
      !gradeLevel
    ) {
      throw new BadRequestException(
        "All fields are required including grade level."
      );
    }

    const providedId: string | undefined = data.classId;
    const classesCol = this.db.collection("classes");
    const classRef = providedId ? classesCol.doc(providedId) : classesCol.doc();

    const classDoc = this.buildClassDoc({
      ...data,
      roomNumber: effectiveRoomNumber,
    });

    await classRef.set(classDoc);

    // Hard delete legacy field if client accidentally sent it
    await classRef.update({
      subject: FieldValue.delete(),
      roomId: FieldValue.delete(),
    });

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
        (typeof e?.message === "string" &&
          e.message.toLowerCase().includes("requires an index"));

      if (!needsIndex) throw e;

      const snapNoOrder = await classesCol
        .where("teacherId", "==", teacherId)
        .get();
      const classes = snapNoOrder.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) =>
          (b.createdAt || "").localeCompare(a.createdAt || "")
        );

      return { success: true, classes, needsIndex: true };
    }
  }

  async updateClass(teacherId: string, classId: string, data: any) {
    const classRef = this.db.collection("classes").doc(classId);
    const docSnap = await classRef.get();
    if (!docSnap.exists) throw new NotFoundException("Class not found");

    const cls = docSnap.data();
    if (cls?.teacherId !== teacherId) {
      throw new BadRequestException(
        "You do not have permission to update this class."
      );
    }

    const oldSubject = (cls?.subjectName || "").trim();

    // Build updated doc (will omit roomId)
    const updated = this.buildClassDoc({ ...cls, ...data });

    await classRef.update({
      ...updated,
      updatedAt: new Date().toISOString(),
      subject: FieldValue.delete(),
      schedule: FieldValue.delete(),
      startTime: FieldValue.delete(),
      endTime: FieldValue.delete(),
      roomId: FieldValue.delete(), // ensure legacy field removed
    });

    const teacherRef = this.db.collection("teachers").doc(teacherId);
    await teacherRef.set(
      {
        classes: FieldValue.arrayUnion(classId),
        subjects: FieldValue.arrayUnion(updated.subjectName),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const newSubject = (updated.subjectName || "").trim();
    if (oldSubject && newSubject && oldSubject !== newSubject) {
      const othersSnap = await this.db
        .collection("classes")
        .where("teacherId", "==", teacherId)
        .where("subjectName", "==", oldSubject)
        .get();
      if (othersSnap.empty) {
        await teacherRef.update({ subjects: FieldValue.arrayRemove(oldSubject) });
      }
    }

    // Sync legacy embedded student class objects: remove roomId
    const studentsSnapshot = await classRef.collection("students").get();
    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const studentRef = this.db.collection("students").doc(studentId);
      const studentSnap = await studentRef.get();
      if (!studentSnap.exists) continue;
      const studentData = studentSnap.data() as any;
      if (
        Array.isArray(studentData.classes) &&
        studentData.classes.length
      ) {
        const allStrings = studentData.classes.every(
          (c: any) => typeof c === "string"
        );
        if (allStrings) continue; // string IDs only, skip
        const updatedClasses = studentData.classes.map((c: any) =>
          c.id === classId
            ? {
                ...c,
                id: classId,
                name: updated.name,
                subjectName: updated.subjectName,
                teacherId: updated.teacherId,
                // roomId removed
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

    return { success: true, message: "Class updated successfully" };
  }

  async deleteClass(teacherId: string, classId: string) {
    const classRef = this.db.collection("classes").doc(classId);
    const docSnap = await classRef.get();
    if (!docSnap.exists) throw new NotFoundException("Class not found");
    const cls = docSnap.data();
    if (cls?.teacherId !== teacherId) {
      throw new BadRequestException(
        "You do not have permission to delete this class."
      );
    }

    const subjectToMaybeRemove = (cls?.subjectName || "").trim();

    const studentsSnapshot = await classRef.collection("students").get();
    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const studentRef = this.db.collection("students").doc(studentId);
      const studentSnap = await studentRef.get();
      if (!studentSnap.exists) continue;
      const studentData = studentSnap.data() as any;
      if (
        Array.isArray(studentData.classes) &&
        studentData.classes.length
      ) {
        const allStrings = studentData.classes.every(
          (c: any) => typeof c === "string"
        );
        if (allStrings) {
          await studentRef.update({ classes: FieldValue.arrayRemove(classId) });
        } else {
          const updatedClasses = studentData.classes.filter(
            (c: any) => c.id !== classId
          );
            await studentRef.update({ classes: updatedClasses });
        }
      }
    }

    const postsSnapshot = await classRef.collection("posts").get();
    const batch = this.db.batch();
    postsSnapshot.docs.forEach((d) => batch.delete(d.ref));
    studentsSnapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    await classRef.delete();

    const teacherRef = this.db.collection("teachers").doc(teacherId);
    await teacherRef.update({
      classes: FieldValue.arrayRemove(classId),
      updatedAt: new Date().toISOString(),
    });

    if (subjectToMaybeRemove) {
      const othersSnap = await this.db
        .collection("classes")
        .where("teacherId", "==", teacherId)
        .where("subjectName", "==", subjectToMaybeRemove)
        .get();
      if (othersSnap.empty) {
        await teacherRef.update({
          subjects: FieldValue.arrayRemove(subjectToMaybeRemove),
        });
      }
    }

    return { success: true, message: "Class deleted successfully" };
  }

  async addPost(data: any) {
    const {
      teacherId,
      classId,
      content,
      fileUrl,
      imageUrl,
      fileName,
      fileType,
    } = data;
    if (!teacherId || !classId)
      throw new BadRequestException("Missing teacherId or classId");
    const classRef = this.db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) throw new NotFoundException("Class not found");
    if (classSnap.data()?.teacherId !== teacherId) {
      throw new BadRequestException(
        "You do not have permission to post to this class."
      );
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
      throw new BadRequestException(
        "You do not have permission to view posts for this class."
      );
    }
    const postsSnapshot = await classRef
      .collection("posts")
      .orderBy("timestamp", "desc")
      .get();
    const posts = postsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, posts };
  }

  async getClassStudents(teacherId: string, classId: string) {
    const classRef = this.db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) throw new NotFoundException("Class not found");
    if (classSnap.data()?.teacherId !== teacherId) {
      throw new BadRequestException(
        "You do not have permission to view students for this class."
      );
    }
    const studentsSnapshot = await classRef.collection("students").get();
    if (studentsSnapshot.empty)
      return {
        success: true,
        students: [],
        message: "No students have joined yet.",
      };

    const students = await Promise.all(
      studentsSnapshot.docs.map(async (doc) => {
        const studentId = doc.id;
        const studentDoc = await this.db
          .collection("students")
          .doc(studentId)
          .get();
        const studentData = studentDoc.exists ? studentDoc.data() : {};
        return {
          id: studentId,
          joinedAt: doc.data().joinedAt,
          firstName:
            (studentData as any)?.firstName ||
            (studentData as any)?.firstname ||
            null,
          middleName:
            (studentData as any)?.middleName ||
            (studentData as any)?.middlename ||
            null,
          lastName:
            (studentData as any)?.lastName ||
            (studentData as any)?.lastname ||
            null,
          email:
            (studentData as any)?.school_email ||
            (studentData as any)?.personal_email ||
            null,
          status: (studentData as any)?.status || null,
        };
      })
    );
    return { success: true, students };
  }

  async getTeacherStats(teacherId: string) {
    const classesSnapshot = await this.db
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .get();
    if (classesSnapshot.empty)
      return { success: true, totalClasses: 0, totalStudents: 0, totalSubjects: 0 };
    const subjectSet = new Set<string>();
    for (const classDoc of classesSnapshot.docs) {
      const classData: any = classDoc.data();
      if (classData.subjectName)
        subjectSet.add((classData.subjectName as string).trim());
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
    return {
      success: true,
      message: "Profile picture uploaded successfully",
      imageUrl,
    };
  }

  async getAttendanceSessions(teacherId: string, classId?: string) {
    if (!teacherId) throw new BadRequestException("teacherId is required");
    let queryRef: FirebaseFirestore.Query = this.db
      .collection("attendance_sessions")
      .where("teacherId", "==", teacherId);

    if (classId) {
      queryRef = queryRef.where("classId", "==", classId);
    }

    const snapshot = await queryRef.orderBy("timeStarted", "desc").get();
    const sessions = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return { success: true, sessions };
  }
}