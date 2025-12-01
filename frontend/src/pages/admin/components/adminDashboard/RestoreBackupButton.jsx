import React, { useState } from "react";
import Swal from "sweetalert2";
import { db, auth } from "../../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import JSZip from "jszip";
import Papa from "papaparse";

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

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
        const data = parsed.data;

        // Determine collection and subcollection
        let parentCollection, subcollection, docIdFromFile;
        const parts = fileName.split("/"); // folder/file.csv

        if (parts.length === 1) {
          parentCollection = parts[0].replace(".csv", "");
          subcollection = null;
        } else if (parts.length === 2) {
          const folder = parts[0];
          docIdFromFile = parts[1].replace(".csv", "");

          if (folder === "students_attendance") {
            parentCollection = "students";
            subcollection = "attendance";
          } else if (folder === "teachers_attendance") {
            parentCollection = "teachers";
            subcollection = "attendance";
          } else {
            continue;
          }
        } else {
          continue; // unsupported structure
        }

        // Write documents
        for (const row of data) {
          const docId = docIdFromFile || row.id;
          delete row.id;

          // Fix createdAt field
          if (row.createdAt) {
            try {
              // Try parsing ISO string or fallback
              const date = new Date(row.createdAt);
              row.createdAt = Timestamp.fromDate(date);
            } catch {
              row.createdAt = Timestamp.now();
            }
          } else {
            row.createdAt = Timestamp.now();
          }

          // Clean title and content fields from unwanted characters
          if (row.title) row.title = row.title.replace(/\n/g, " ").trim();
          if (row.content) row.content = row.content.replace(/\n/g, " ").trim();

          if (subcollection) {
            await setDoc(doc(db, parentCollection, docIdFromFile, subcollection, docId), row);
          } else {
            await setDoc(doc(db, parentCollection, docId), row);
          }
        }
      }

      Swal.fire("Success", "Backup restored successfully!", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to restore backup. Check console.", "error");
    } finally {
      setLoading(false);
      e.target.value = null; // reset file input
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

