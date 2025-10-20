import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import { Express } from "express";

@Injectable()
export class TeacherService {
  private db = getFirestore();

  // ✅ Add Class
  async addClass(data: any) {
    const { teacherId, subjectName, roomNumber, section, days, time, gradeLevel } = data;

    const classData = {
      subjectName,
      roomNumber,
      section,
      days,
      time,
      gradeLevel,
      createdAt: new Date().toISOString(),
    };

    const classRef = this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .doc();

    await classRef.set(classData);
    return { success: true, id: classRef.id };
  }

  // ✅ Get Classes
  async getClasses(teacherId: string) {
    const snapshot = await this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .orderBy("createdAt", "desc")
      .get();

    const classes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, classes };
  }

  // ✅ Update Class
  async updateClass(teacherId: string, classId: string, data: any) {
    const classRef = this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .doc(classId);

    const docSnap = await classRef.get();
    if (!docSnap.exists) throw new NotFoundException("Class not found");

    const updatedClassData = {
      subjectName: data.subjectName,
      roomNumber: data.roomNumber,
      section: data.section,
      days: data.days,
      time: data.time,
      gradeLevel: data.gradeLevel,
    };

    await classRef.update(updatedClassData);

    // 🔄 Sync updates to all enrolled students
    const studentsSnapshot = await classRef.collection("students").get();
    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const studentRef = this.db.collection("students").doc(studentId);
      const studentSnap = await studentRef.get();

      if (studentSnap.exists) {
        const studentData = studentSnap.data();
        if (studentData?.classes?.length) {
          const updatedClasses = studentData.classes.map((cls: any) =>
            cls.id === classId ? { ...cls, ...updatedClassData } : cls
          );
          await studentRef.update({ classes: updatedClasses });
        }
      }
    }

    return { success: true, message: "Class updated successfully" };
  }

  // ✅ Delete Class
  async deleteClass(teacherId: string, classId: string) {
    const classRef = this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .doc(classId);

    const docSnap = await classRef.get();
    if (!docSnap.exists) throw new NotFoundException("Class not found");

    // Remove class from students
    const studentsSnapshot = await classRef.collection("students").get();
    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const studentRef = this.db.collection("students").doc(studentId);
      const studentSnap = await studentRef.get();

      if (studentSnap.exists) {
        const studentData = studentSnap.data();
        if (studentData?.classes?.length) {
          const updatedClasses = studentData.classes.filter(
            (cls: any) => cls.id !== classId
          );
          await studentRef.update({ classes: updatedClasses });
        }
      }
    }

    await classRef.delete();
    return { success: true, message: "Class deleted successfully" };
  }

  // ✅ Add Post
  async addPost(
    teacherId: string,
    classId: string,
    content: string,
    file?: Express.Multer.File
  ) {
    let fileUrl: string | null = null;
    if (file) fileUrl = path.join("uploads", file.filename);

    const postData = {
      teacherId,
      content,
      fileUrl: fileUrl ? `http://localhost:3000/${fileUrl}` : null,
      imageUrl:
        file?.mimetype?.startsWith("image/") && fileUrl
          ? `http://localhost:3000/${fileUrl}`
          : null,
      timestamp: new Date().toISOString(),
    };

    const postRef = this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .doc(classId)
      .collection("posts")
      .doc();

    await postRef.set(postData);
    return { success: true, post: { id: postRef.id, ...postData } };
  }

  // ✅ Get Class Posts
  async getClassPosts(teacherId: string, classId: string) {
    const postsSnapshot = await this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .doc(classId)
      .collection("posts")
      .orderBy("timestamp", "desc")
      .get();

    const posts = postsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, posts };
  }

  // ✅ Get Class Students
  async getClassStudents(teacherId: string, classId: string) {
    const classDoc = await this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .doc(classId)
      .get();

    if (!classDoc.exists) throw new NotFoundException("Class not found");

    const studentsSnapshot = await classDoc.ref.collection("students").get();
    if (studentsSnapshot.empty)
      return {
        success: true,
        students: [],
        message: "No students have joined yet.",
      };

    const students = await Promise.all(
      studentsSnapshot.docs.map(async (doc) => {
        const studentId = doc.id;
        const studentDoc = await this.db.collection("students").doc(studentId).get();
        const studentData = studentDoc.exists ? studentDoc.data() : {};
        return {
          id: studentId,
          joinedAt: doc.data().joinedAt,
          firstName: studentData?.firstName || studentData?.firstname || null,
          middleName: studentData?.middleName || studentData?.middlename || null,
          lastName: studentData?.lastName || studentData?.lastname || null,
          email: studentData?.school_email || studentData?.personal_email || null,
          status: studentData?.status || null,
        };
      })
    );

    return { success: true, students };
  }

  // ✅ Dashboard Stats
  async getTeacherStats(teacherId: string) {
    const classesSnapshot = await this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .get();

    if (classesSnapshot.empty)
      return { success: true, totalClasses: 0, totalStudents: 0, totalSubjects: 0 };

    const subjectSet = new Set<string>();
    const studentSet = new Set<string>();

    for (const classDoc of classesSnapshot.docs) {
      const classData = classDoc.data();
      if (classData.subjectName) subjectSet.add(classData.subjectName.trim());

      const studentsSnapshot = await classDoc.ref.collection("students").get();
      studentsSnapshot.docs.forEach((s) => studentSet.add(s.id));
    }

    return {
      success: true,
      totalClasses: classesSnapshot.size,
      totalStudents: studentSet.size,
      totalSubjects: subjectSet.size,
    };
  }

  // ✅ Upload Profile Picture (Base64 Binary)
  async uploadProfilePicture(teacherId: string, base64Image: string) {
    if (!base64Image) throw new BadRequestException("No image data provided");

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const teacherRef = this.db.collection("teachers").doc(teacherId);

    await teacherRef.set(
      {
        profilePicBinary: cleanBase64,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return {
      success: true,
      message: "Profile picture uploaded successfully as Base64 binary",
    };
  }
}
