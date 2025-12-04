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
 * Fix: attendance subcollection rows were all written to the SAME doc id because the code
 * used the parentId (docIdFromFile) as the attendance document id for every row.
 *
 * This version:
 * - Uses the row's id column for the attendance doc ID when present.
 * - If row.id is missing for attendance rows, creates a new document with an auto-generated id.
 * - Keeps top-level collection behavior the same (uses row.id as doc id).
 * - Preserves createdAt -> Timestamp conversion.
 */

export default function RestoreBackupButton({ adminEmail }) {
  const [loading, setLoading] = useState(false);

  // Verify admin password
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
      // If it's already a Firestore-like object with seconds/nanoseconds, attempt to convert
      if (typeof val === "object" && (val.seconds !== undefined || val._seconds !== undefined)) {
        const seconds = Number(val.seconds ?? val._seconds);
        const nanos = Number(val.nanoseconds ?? val._nanoseconds ?? 0);
        const ms = seconds * 1000 + Math.floor(nanos / 1e6);
        return Timestamp.fromMillis(ms);
      }
      // If it's a string (ISO or other), Date will attempt to parse
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
    e.target.value = null; // reset input

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

      // Iterate files in zip
      for (const fileName of Object.keys(zip.files)) {
        const zipFile = zip.files[fileName];
        if (zipFile.dir) continue;

        const content = await zipFile.async("string");
        // Parse CSV with header
        const parsed = Papa.parse(content, { header: true, skipEmptyLines: true, quoteChar: '"' });
        const rows = parsed.data;

        // Determine collection and subcollection
        let parentCollection = null;
        let subcollection = null;
        let parentIdFromFile = null;
        const parts = fileName.split("/").map((p) => p.trim()).filter(Boolean);

        if (parts.length === 1) {
          parentCollection = parts[0].replace(/\.csv$/i, "");
          subcollection = null;
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
          // unsupported path depth
          console.warn("Skipping unsupported path:", fileName);
          continue;
        }

        // Write documents
        for (const row of rows) {
          // Preserve incoming id (if any) before deleting/transforming
          const incomingId = row.id ?? row.ID ?? null;

          // Build the data object to write (convert fields as needed)
          const rowData = { ...row };
          // remove id from the data payload (we'll use it as doc id or discard)
          delete rowData.id;
          delete rowData.ID;

          // createdAt conversion
          rowData.createdAt = parseCreatedAtToTimestamp(row.createdAt ?? row.created_at ?? row.created);

          // sanitize text fields if present
          if (typeof rowData.title === "string") rowData.title = rowData.title.replace(/\n/g, " ").trim();
          if (typeof rowData.content === "string") rowData.content = rowData.content.replace(/\n/g, " ").trim();

          if (subcollection) {
            // For attendance subcollections, write to:
            // /parentCollection/{parentIdFromFile}/attendance/{attendanceDocId}
            // Use incomingId if present; otherwise generate an auto-id
            const parentId = parentIdFromFile;
            if (!parentId) {
              console.warn(`Missing parentId for subcollection file ${fileName}, skipping row.`);
              continue;
            }

            let attendanceDocRef;
            if (incomingId) {
              attendanceDocRef = doc(db, parentCollection, parentId, subcollection, incomingId);
            } else {
              // generate a new docRef with auto id inside the attendance subcollection
              const attCollRef = collection(db, parentCollection, parentId, subcollection);
              attendanceDocRef = doc(attCollRef); // auto id
            }

            await setDoc(attendanceDocRef, rowData, { merge: true });
          } else {
            // Top-level collection document
            const docId = incomingId;
            if (!docId) {
              console.warn(`Skipping top-level row without id for collection ${parentCollection} in file ${fileName}`);
              continue;
            }
            await setDoc(doc(db, parentCollection, docId), rowData, { merge: true });
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
    </div>
  );
}