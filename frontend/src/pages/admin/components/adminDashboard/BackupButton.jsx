import React, { useState } from "react";
import Swal from "sweetalert2";
import { auth, db } from "../../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import JSZip from "jszip";

export default function BackupButton({ adminEmail }) {
  const [loading, setLoading] = useState(false);

  const verifyAdminPassword = async (password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, password);
      return !!userCredential.user;
    } catch (error) {
      console.error("Admin login failed:", error.code, error.message);
      return false;
    }
  };

  // Convert Firestore docs to CSV with proper createdAt formatting
  const convertToCSV = (docs) => {
    if (!docs || docs.length === 0) return "No data";
    const headers = Object.keys(docs[0]);
    const rows = docs.map((doc) =>
      headers
        .map((h) => {
          let value = doc[h] ?? "";
          // If createdAt is a Firestore Timestamp
          if (h === "createdAt" && value?.toDate) {
            value = value.toDate().toISOString();
          }
          if (typeof value === "string") {
            return `"${value.replace(/"/g, '""')}"`; // Escape quotes
          }
          return JSON.stringify(value);
        })
        .join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  };

  const fetchCollection = async (name) => {
    const snap = await getDocs(collection(db, name));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const fetchSubcollection = async (parentCollection, parentId, sub) => {
    const snap = await getDocs(collection(db, parentCollection, parentId, sub));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const handleBackup = async () => {
    try {
      const { value: password } = await Swal.fire({
        title: "Admin password required",
        input: "password",
        inputLabel: "Enter your password to proceed",
        inputPlaceholder: "Password",
        showCancelButton: true,
      });

      if (!password) return;

      const valid = await verifyAdminPassword(password);
      if (!valid) {
        await Swal.fire("Error", "Password incorrect", "error");
        return;
      }

      setLoading(true);
      const zip = new JSZip();

      const collections = ["students", "teachers", "classes", "announcements", "attendance_sessions"];

      // Backup main collections
      for (const col of collections) {
        const data = await fetchCollection(col);
        zip.file(`${col}.csv`, convertToCSV(data));
      }

      // Backup student attendance subcollections
      const studentsSnap = await getDocs(collection(db, "students"));
      const studentAttendanceFolder = zip.folder("students_attendance");

      for (const studentDoc of studentsSnap.docs) {
        const data = await fetchSubcollection("students", studentDoc.id, "attendance");
        studentAttendanceFolder.file(`${studentDoc.id}.csv`, convertToCSV(data));
      }

      // Backup teacher attendance subcollections
      const teachersSnap = await getDocs(collection(db, "teachers"));
      const teacherAttendanceFolder = zip.folder("teachers_attendance");

      for (const teacherDoc of teachersSnap.docs) {
        const data = await fetchSubcollection("teachers", teacherDoc.id, "attendance");
        teacherAttendanceFolder.file(`${teacherDoc.id}.csv`, convertToCSV(data));
      }

      // Generate ZIP
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `backup-${new Date().toISOString()}.zip`;
      a.click();

      Swal.fire("Success", "Backup created successfully!", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Backup failed. See console for details.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
  onClick={handleBackup}
  disabled={loading}
  className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
>
  {loading ? "Creating Backup..." : "Backup All"}
</button>
  );
}
