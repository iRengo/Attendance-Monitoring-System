import React, { useState } from "react";
import Swal from "sweetalert2";
import { db, auth } from "../../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import JSZip from "jszip";
import Papa from "papaparse";

/**
 * RestoreBackupButton
 *
 * Overwrites documents entirely to match backup exactly.
 * Any leftover fields (like stats or schoolYear) will be removed.
 */
export default function RestoreBackupButton({ adminEmail }) {
  const [loading, setLoading] = useState(false);

  const verifyAdminPassword = async (password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, password);
      return !!userCredential.user;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const parseCreatedAtToTimestamp = (val) => {
    if (!val) return Timestamp.now();
    try {
      if (typeof val === "object" && (val.seconds !== undefined || val._seconds !== undefined)) {
        const seconds = Number(val.seconds ?? val._seconds);
        const nanos = Number(val.nanoseconds ?? val._nanoseconds ?? 0);
        const ms = seconds * 1000 + Math.floor(nanos / 1e6);
        return Timestamp.fromMillis(ms);
      }
      const d = new Date(String(val));
      if (!isNaN(d.getTime())) return Timestamp.fromDate(d);
      return Timestamp.now();
    } catch {
      return Timestamp.now();
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = null;

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
      const zip = await JSZip.loadAsync(file);

      for (const fileName of Object.keys(zip.files)) {
        const zipFile = zip.files[fileName];
        if (zipFile.dir) continue;

        const content = await zipFile.async("string");
        const parsed = Papa.parse(content, { header: true, skipEmptyLines: true, quoteChar: '"' });
        const rows = parsed.data;

        let parentCollection = null;
        let subcollection = null;
        let parentIdFromFile = null;
        const parts = fileName.split("/").map((p) => p.trim()).filter(Boolean);

        if (parts.length === 1) {
          parentCollection = parts[0].replace(/\.csv$/i, "");
        } else if (parts.length === 2) {
          const folder = parts[0];
          parentIdFromFile = parts[1].replace(/\.csv$/i, "");
          if (folder === "students_attendance") {
            parentCollection = "students";
            subcollection = "attendance";
          } else if (folder === "teachers_attendance") {
            parentCollection = "teachers";
            subcollection = "attendance";
          } else {
            console.warn("Skipping unknown folder:", folder);
            continue;
          }
        } else {
          console.warn("Skipping unsupported path:", fileName);
          continue;
        }

        for (const row of rows) {
          const incomingId = row.id ?? row.ID ?? null;
          const rowData = { ...row };
          delete rowData.id;
          delete rowData.ID;

          // Convert createdAt
          rowData.createdAt = parseCreatedAtToTimestamp(row.createdAt ?? row.created_at ?? row.created);

          // Sanitize text fields
          if (typeof rowData.title === "string") rowData.title = rowData.title.replace(/\n/g, " ").trim();
          if (typeof rowData.content === "string") rowData.content = rowData.content.replace(/\n/g, " ").trim();

          if (subcollection) {
            const parentId = parentIdFromFile;
            if (!parentId) {
              console.warn(`Missing parentId for subcollection file ${fileName}, skipping row.`);
              continue;
            }

            let attendanceDocRef;
            if (incomingId) {
              attendanceDocRef = doc(db, parentCollection, parentId, subcollection, incomingId);
            } else {
              const attCollRef = collection(db, parentCollection, parentId, subcollection);
              attendanceDocRef = doc(attCollRef);
            }

            // **Overwrite document entirely**
            await setDoc(attendanceDocRef, rowData);
          } else {
            const docId = incomingId;
            if (!docId) {
              console.warn(`Skipping top-level row without id for collection ${parentCollection} in file ${fileName}`);
              continue;
            }

            // **Overwrite document entirely**
            await setDoc(doc(db, parentCollection, docId), rowData);
          }
        }
      }

      await Swal.fire("Success", "Backup restored successfully!", "success");
    } catch (err) {
      console.error("Restore failed:", err);
      await Swal.fire("Error", "Failed to restore backup. Check console.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="w-full inline-flex justify-center px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer">
        {loading ? "Restoring..." : "Restore Backup"}
        <input type="file" accept=".zip" onChange={handleRestore} className="hidden" disabled={loading} />
      </label>
      <div className="text-base text-gray-700 leading-relaxed">
        <div className="mt-6 text-lg font-bold text-gray-800">
          IF YOU NEED TO RESTORE A BACKUP AFTER AN ERROR
        </div>

        <ul className="list-disc pl-7 mt-3 space-y-2 text-base">
          <li>
            <strong>Step 1:</strong> Upload your <strong>Backup All ZIP</strong> in <strong>"Restore Backup"</strong>.
          </li>
          <li>
            <strong>Step 2:</strong> When the UI shows <em>"Backup restored successfully!"</em>, click 
            <strong>"Fix Timestamps & JSON Strings"</strong> to correct all fields.
          </li>
          <li>
            <strong>Step 3:</strong> Done!
          </li>
        </ul>
      </div>
    </div>
  );
}
