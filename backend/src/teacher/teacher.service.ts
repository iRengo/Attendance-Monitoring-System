import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import * as nodemailer from "nodemailer";
import * as path from "path";
import * as fs from "fs";

@Injectable()
export class TeacherService {
  private db = getFirestore();

  private transporter: nodemailer.Transporter | null = null;

  private getMailer() {
    if (this.transporter) return this.transporter;

    const user = process.env.SYSTEM_EMAIL;
    const rawPass = process.env.SYSTEM_EMAIL_PASSWORD || "";
    const pass = rawPass.replace(/\s+/g, "");

    if (!user || !pass) {
      throw new Error(
        "SYSTEM_EMAIL or SYSTEM_EMAIL_PASSWORD missing. Cannot send post notifications."
      );
    }

    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      logger: true,
      debug: true,
    });

    return this.transporter;
  }

  private async sendPostNotificationEmails(params: {
    classId: string;
    teacherId: string;
    teacherName: string;
    subjectName: string;
    classDisplayName: string;
    postContent: string | null;
    fileUrl?: string | null;
    imageUrl?: string | null;
    attachments?: Array<{
      url: string;
      name?: string;
      type?: string;
      kind?: string;
      previewThumbUrl?: string | null;
    }>;
  }) {
    const {
      classId,
      teacherName,
      subjectName,
      classDisplayName,
      postContent,
      fileUrl,
      imageUrl,
      attachments = [],
    } = params;

    const classRef = this.db.collection("classes").doc(classId);
    const studentsSnap = await classRef.collection("students").get();
    if (studentsSnap.empty) return;

    const studentEmails: string[] = [];
    for (const docSnap of studentsSnap.docs) {
      const studentId = docSnap.id;
      const studentRef = this.db.collection("students").doc(studentId);
      const studentDataSnap = await studentRef.get();
      if (!studentDataSnap.exists) continue;
      const data = studentDataSnap.data() || {};

      const personalEmail =
        (data.personal_email ||
          data.personalEmail ||
          data.email ||
          data.school_email) ?? "";

      const emailClean = (personalEmail || "").trim();
      if (
        emailClean &&
        /^[^@]+@[^@]+\.[^@]+$/.test(emailClean) &&
        !studentEmails.includes(emailClean)
      ) {
        studentEmails.push(emailClean);
      }
    }
    if (!studentEmails.length) return;

    const from =
      process.env.POST_NOTIFICATION_FROM ||
      `AICS Notifications <${process.env.SYSTEM_EMAIL}>`;
    const subjectPrefix =
      process.env.POST_NOTIFICATION_SUBJECT_PREFIX || "[Class Update]";
    const subject = `${subjectPrefix} ${subjectName} (${classDisplayName})`;

    const logoUrl = (process.env.POST_EMAIL_LOGO_URL || "").trim();
    const logoFileEnv = (process.env.POST_EMAIL_LOGO_FILE || "").trim();
    let logoCid: string | null = null;
    const mailAttachments: nodemailer.Attachment[] = [];

    if (logoFileEnv) {
      const absPath = path.isAbsolute(logoFileEnv)
        ? logoFileEnv
        : path.resolve(process.cwd(), logoFileEnv);
      if (fs.existsSync(absPath)) {
        logoCid = "aics-logo@cid";
        mailAttachments.push({
          filename: path.basename(absPath),
          path: absPath,
          cid: logoCid,
        });
      }
    }

    let topLogoBlock = "";
    if (logoCid) {
      topLogoBlock = `
        <div style="text-align:center;margin:0 0 16px;">
          <img src="cid:${logoCid}" alt="" style="max-width:140px;height:auto;" />
        </div>`;
    } else if (logoUrl) {
      const safeUrl = this.escapeAttr(logoUrl);
      topLogoBlock = `
        <div style="text-align:center;margin:0 0 16px;">
          <img src="${safeUrl}" alt="" style="max-width:140px;height:auto;" />
        </div>`;
    } else {
      topLogoBlock = `
        <div style="text-align:center;margin:0 0 12px;font-weight:bold;font-size:18px;">
          
        </div>`;
    }

    const htmlParts: string[] = [];
    htmlParts.push(
      `<p style="margin:0 0 12px;">A new post was added in <strong>${this.escapeHtml(
        classDisplayName
      )}</strong> by <strong>${this.escapeHtml(teacherName)}</strong>.</p>`
    );
    if (postContent) {
      htmlParts.push(
        `<p style="white-space:pre-line; margin:0 0 12px;">${this.escapeHtml(
          postContent
        )}</p>`
      );
    }
    if (imageUrl) {
      const safeImage = this.escapeAttr(imageUrl);
      htmlParts.push(
        `<p style="margin:0 0 12px;">Image: <a href="${safeImage}" target="_blank" rel="noopener noreferrer">${safeImage}</a></p>`
      );
    }
    if (fileUrl) {
      const safeFile = this.escapeAttr(fileUrl);
      htmlParts.push(
        `<p style="margin:0 0 12px;">Attachment: <a href="${safeFile}" target="_blank" rel="noopener noreferrer">${safeFile}</a></p>`
      );
    }
    if (attachments.length) {
      htmlParts.push(
        `<div style="margin:16px 0 8px;font-weight:bold;">All Attachments:</div>`
      );
      htmlParts.push(
        `<ul style="margin:0 0 16px;padding-left:18px;font-size:13px;color:#444;">` +
          attachments
            .map((a) => {
              const safeUrl = this.escapeAttr(a.url);
              const name = this.escapeHtml(a.name || a.url);
              const kind =
                a.kind === "image"
                  ? "Image"
                  : a.type?.split("/")[1]?.toUpperCase() || "File";
              return `<li style="margin:4px 0;"><strong>${kind}:</strong> <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${name}</a></li>`;
            })
            .join("") +
          `</ul>`
      );
    }

    htmlParts.push(
      `<p style="margin:20px 0 0;font-size:13px;color:#555;">You received this because you are enrolled in ${this.escapeHtml(
        classDisplayName
      )}. Please do not reply directly to this email.</p>`
    );

    const htmlBody = `<div style="font-family:Arial, sans-serif;">
      ${topLogoBlock}
      ${htmlParts.join("")}
    </div>`;

    const textBody = [
      `AICS`,
      `New post in ${classDisplayName} by ${teacherName}`,
      postContent ? `Content:\n${postContent}` : "",
      imageUrl ? `Image: ${imageUrl}` : "",
      fileUrl ? `Attachment: ${fileUrl}` : "",
      attachments.length
        ? `All Attachments:\n${attachments
            .map(
              (a, i) =>
                `${i + 1}. ${(a.kind === "image" ? "Image" : "File")}: ${
                  a.name || a.url
                } -> ${a.url}`
            )
            .join("\n")}`
        : "",
      `You received this because you are enrolled in ${classDisplayName}.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const mailer = this.getMailer();
      await mailer.verify();

      const toAddress = process.env.SYSTEM_EMAIL || "undisclosed-recipients:;";
      const chunkSize = 90;

      for (let i = 0; i < studentEmails.length; i += chunkSize) {
        const slice = studentEmails.slice(i, i + chunkSize);
        await mailer.sendMail({
          from,
          to: toAddress,
          bcc: slice,
          subject,
          html: htmlBody,
          text: textBody,
          attachments: mailAttachments.length ? mailAttachments : undefined,
        });
      }
    } catch (err) {
      console.error("Failed sending post notification emails:", err);
    }
  }

  private escapeHtml(str: string) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  private escapeAttr(str: string) {
    return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

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

  // Parse a time string (either "HH:MM" 24h or "h:mm AM/PM") and return a Firestore Timestamp.
  // If parsing fails or value is empty, returns null.
  private parseTimeToTimestamp(timeStr?: string): Timestamp | null {
    if (!timeStr) return null;
    const s = String(timeStr).trim();
    // If already looks like Firestore Timestamp (object), leave to caller (shouldn't happen here)
    // Try 24h "HH:MM"
    const hhmm24 = s.match(/^(\d{1,2}):(\d{2})$/);
    let hour = 0;
    let minute = 0;
    if (hhmm24) {
      hour = Number(hhmm24[1]);
      minute = Number(hhmm24[2]);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    } else {
      // Try "h:mm AM/PM"
      const m = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
      if (!m) return null;
      let h = Number(m[1]);
      const mm = Number(m[2]);
      const isPM = m[3].toLowerCase() === "pm";
      if (h === 12 && !isPM) h = 0;
      if (isPM && h < 12) h += 12;
      if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
      hour = h;
      minute = mm;
    }

    // Create a Date using today's date with the parsed time (local timezone)
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
    return Timestamp.fromDate(d);
  }

  private buildClassDoc(data: any) {
    const subjectName = (data.subjectName ?? data.subject ?? "").trim();
    const legacyRoomId = (data.roomId ?? "").trim();
    const roomNumberRaw = (data.roomNumber ?? "").trim();
    const roomNumber = roomNumberRaw || legacyRoomId;

    const section = (data.section ?? "").trim();
    const gradeLevel = (data.gradeLevel ?? "").toString().trim();
    const days = (data.days ?? "").trim();

    // time_start/time_end may come in as strings (e.g. "02:05 PM" or "14:05")
    // Convert to Firestore Timestamp objects. If conversion fails, keep null.
    const time_start_raw = (data.time_start ?? "").trim();
    const time_end_raw = (data.time_end ?? "").trim();

    const time_start_ts = this.parseTimeToTimestamp(time_start_raw);
    const time_end_ts = this.parseTimeToTimestamp(time_end_raw);

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
      roomNumber,
      section,
      gradeLevel,
      days,
      // store as timestamps (or null) instead of plain strings
      time_start: time_start_ts ?? null,
      time_end: time_end_ts ?? null,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
    };
  }

  async addClass(data: any) {
    const {
      teacherId,
      subjectName,
      roomNumber,
      roomId,
      section,
      days,
      time_start,
      time_end,
      gradeLevel,
    } = data;

    const effectiveRoomNumber = (roomNumber || roomId || "").trim();

    if (
      !teacherId ||
      !subjectName ||
      !effectiveRoomNumber ||
      !section ||
      !days ||
      !time_start ||
      !time_end ||
      !gradeLevel
    ) {
      throw new BadRequestException(
        "All fields are required including grade level and time_start/time_end."
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

    // Remove legacy fields if any were previously set
    await classRef.update({
      subject: FieldValue.delete(),
      roomId: FieldValue.delete(),
      time: FieldValue.delete(),
      schedule: FieldValue.delete(),
      startTime: FieldValue.delete(),
      endTime: FieldValue.delete(),
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
    const updated = this.buildClassDoc({ ...cls, ...data });

    await classRef.update({
      ...updated,
      updatedAt: new Date().toISOString(),
      // remove legacy fields
      subject: FieldValue.delete(),
      schedule: FieldValue.delete(),
      startTime: FieldValue.delete(),
      endTime: FieldValue.delete(),
      roomId: FieldValue.delete(),
      time: FieldValue.delete(),
    });

    // Maintain teacher subjects set
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

    // Normalize embedded classes for students (object-form variant)
    const studentsSnapshot = await classRef.collection("students").get();
    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const studentRef = this.db.collection("students").doc(studentId);
      const studentSnap = await studentRef.get();
      if (!studentSnap.exists) continue;
      const studentData = studentSnap.data() as any;
      if (Array.isArray(studentData.classes) && studentData.classes.length) {
        const allStrings = studentData.classes.every(
          (c: any) => typeof c === "string"
        );
        if (allStrings) continue;
        const updatedClasses = studentData.classes.map((c: any) =>
          c.id === classId
            ? {
                ...c,
                id: classId,
                name: updated.name,
                subjectName: updated.subjectName,
                teacherId: updated.teacherId,
                roomNumber: updated.roomNumber,
                section: updated.section,
                gradeLevel: updated.gradeLevel,
                days: updated.days,
                time_start: updated.time_start,
                time_end: updated.time_end,
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
      if (Array.isArray(studentData.classes) && studentData.classes.length) {
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
    const { teacherId, classId, content, attachments } = data;

    if (!teacherId || !classId)
      throw new BadRequestException("Missing teacherId or classId");

    const classRef = this.db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) throw new NotFoundException("Class not found");

    const classData = classSnap.data() || {};
    if (classData.teacherId !== teacherId) {
      throw new BadRequestException(
        "You do not have permission to post to this class."
      );
    }

    const atts: Array<{
      url: string;
      name?: string;
      type?: string;
      kind?: string;
      previewThumbUrl?: string | null;
    }> = Array.isArray(attachments)
      ? attachments.filter((a) => a?.url)
      : [];

    if (!content && atts.length === 0) {
      throw new BadRequestException("Post must include text, image, or file.");
    }

    const post = {
      teacherId,
      classId,
      content: content ?? null,
      attachments: atts,
      timestamp: new Date().toISOString(),
    };

    const postRef = await classRef.collection("posts").add(post);

    let teacherName = "Your Teacher";
    try {
      const tSnap = await this.db.collection("teachers").doc(teacherId).get();
      if (tSnap.exists) {
        const t = tSnap.data() || {};
        teacherName = `${t.firstName ?? t.firstname ?? ""} ${t.middleName ?? t.middlename ?? ""} ${
          t.lastName ?? t.lastname ?? ""
        }`
          .replace(/\s+/g, " ")
          .trim() || "Your Teacher";
      }
    } catch {
      // ignore
    }

    const awaitEmails =
      (process.env.POST_EMAIL_AWAIT || "false").toLowerCase() === "true";

    const emailPromise = this.sendPostNotificationEmails({
      classId,
      teacherId,
      teacherName,
      subjectName: classData.subjectName || "Class",
      classDisplayName: classData.name || classData.subjectName || classId,
      postContent: content ?? "",
      attachments: atts,
    });

    if (awaitEmails) {
      await emailPromise;
    } else {
      emailPromise.catch((e) =>
        console.error("sendPostNotificationEmails error (non-blocking):", e)
      );
    }

    return { success: true, post: { id: postRef.id, ...post } };
  }

  async updatePost(
    teacherId: string,
    classId: string,
    postId: string,
    data: { content?: string; attachments?: any[] }
  ) {
    if (!teacherId || !classId || !postId)
      throw new BadRequestException("Missing teacherId, classId or postId");

    const classRef = this.db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) throw new NotFoundException("Class not found");

    const classData = classSnap.data() || {};
    if (classData.teacherId !== teacherId) {
      throw new BadRequestException(
        "You do not have permission to update posts in this class."
      );
    }

    const postRef = classRef.collection("posts").doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) throw new NotFoundException("Post not found");

    const updatePayload: any = {
      updatedAt: new Date().toISOString(),
    };
    if (typeof data.content !== "undefined") {
      updatePayload.content = data.content ?? null;
    }
    if (typeof data.attachments !== "undefined") {
      const atts = Array.isArray(data.attachments)
        ? data.attachments.filter((a) => a?.url)
        : [];
      updatePayload.attachments = atts;
    }

    await postRef.update(updatePayload);
    const updated = (await postRef.get()).data() || {};
    return { success: true, post: { id: postId, ...updated } };
  }

  async deletePost(teacherId: string, classId: string, postId: string) {
    if (!teacherId || !classId || !postId)
      throw new BadRequestException("Missing teacherId, classId or postId");

    const classRef = this.db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) throw new NotFoundException("Class not found");

    const classData = classSnap.data() || {};
    if (classData.teacherId !== teacherId) {
      throw new BadRequestException(
        "You do not have permission to delete posts in this class."
      );
    }

    const postRef = classRef.collection("posts").doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) throw new NotFoundException("Post not found");

    await postRef.delete();
    return { success: true, message: "Post deleted successfully" };
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
      return {
        success: true,
        totalClasses: 0,
        totalStudents: 0,
        totalSubjects: 0,
      };
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