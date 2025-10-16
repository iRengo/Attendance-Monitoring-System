import { Injectable, NotFoundException } from "@nestjs/common";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import { Express } from "express";

@Injectable()
export class TeacherService {
  private db = getFirestore();

  // ✅ Add Class
  async addClass(data: any) {
    const { teacherId, subjectName, roomNumber, section, days, time } = data;

    const classData = {
      subjectName,
      roomNumber,
      section,
      days,
      time,
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

    const classes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { success: true, classes };
  }

  // ✅ Update Class (and sync to student side)
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
    };

    // Update teacher's class
    await classRef.update(updatedClassData);

    // Sync updates to students enrolled in this class
    const studentsSnapshot = await this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .doc(classId)
      .collection("students")
      .get();

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

  // ✅ Delete Class (and remove from students)
  async deleteClass(teacherId: string, classId: string) {
    const classRef = this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .doc(classId);

    const docSnap = await classRef.get();
    if (!docSnap.exists) throw new NotFoundException("Class not found");

    // Remove class from students first
    const studentsSnapshot = await this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .doc(classId)
      .collection("students")
      .get();

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

    // Delete the class
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

    const posts = postsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

    const studentsSnapshot = await this.db
      .collection("teachers")
      .doc(teacherId)
      .collection("classes")
      .doc(classId)
      .collection("students")
      .get();

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
}
