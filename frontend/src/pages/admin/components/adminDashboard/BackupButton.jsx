import React, { useState } from "react";
import Swal from "sweetalert2";
import { auth, db } from "../../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import JSZip from "jszip";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore";

/**
 * Backup + Fix component (single-file)
 *
 * - Backup All: creates ZIP with CSVs and JSON-preserve-style if needed
 * - Fix Timestamps & JSON Strings:
 *     * Dry-run first (shows counts & sample doc IDs)
 *     * If confirmed, writes fixes (converts stringified JSON arrays/objects -> real arrays/objects,
 *       converts timestamp-like values -> Firestore Timestamp, converts "true"/"false" strings -> booleans)
 *
 * Important:
 * - This runs client-side; admin user must have read/write permissions.
 * - Always create a backup before applying fixes.
 */

/* ---------- Helpers ---------- */

const looksLikeISO = (s) =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s);

const tryParseJson = (s) => {
  if (typeof s !== "string") return null;
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
};

/**
 * Unwrap nested JSON string layers up to maxDepth.
 * Example:
 *  '"["{\"a\":1}"]"' -> ['{"a":1}'] -> [{a:1}]
 */
const unwrapStringLayers = (value, maxDepth = 6) => {
  let cur = value;
  let depth = 0;
  while (typeof cur === "string" && depth < maxDepth) {
    const parsed = tryParseJson(cur);
    if (parsed === null) break;
    cur = parsed;
    depth++;
  }
  return cur;
};

/**
 * Convert timestamp-like shapes into Firestore Timestamp
 */
const parseIfTimestampString = (val) => {
  if (val == null) return null;

  // If string, try to unwrap JSON layers (handles JSON-stringified timestamp objects)
  if (typeof val === "string") {
    const unwrapped = unwrapStringLayers(val);
    if (unwrapped !== val) {
      return parseIfTimestampString(unwrapped);
    }
  }

  // Firestore Timestamp instance (modular SDK)
  if (typeof val === "object" && val !== null && typeof val.toDate === "function") {
    return val;
  }

  // Plain object with seconds/nanoseconds or _seconds/_nanoseconds
  if (typeof val === "object" && val !== null) {
    const seconds = val.seconds ?? val._seconds;
    const nanos = val.nanoseconds ?? val._nanoseconds ?? 0;
    if (seconds !== undefined && !isNaN(Number(seconds))) {
      try {
        const ms = Number(seconds) * 1000 + Number(nanos) / 1e6;
        return Timestamp.fromMillis(ms);
      } catch (e) {
        return null;
      }
    }
  }

  // ISO-like string -> convert to Timestamp
  if (typeof val === "string" && looksLikeISO(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return Timestamp.fromDate(d);
  }

  return null;
};

/* ---------- CSV normalization (human readable) ---------- */

const normalizeForCSV = (value) => {
  if (value == null) return "";

  const unwrapped = unwrapStringLayers(value);

  // Timestamp instance
  if (unwrapped && typeof unwrapped === "object" && typeof unwrapped.toDate === "function") {
    try {
      return unwrapped.toDate().toISOString();
    } catch {
      return JSON.stringify(unwrapped);
    }
  }

  // timestamp-like object
  if (unwrapped && typeof unwrapped === "object" && ("seconds" in unwrapped || "_seconds" in unwrapped)) {
    const ts = parseIfTimestampString(unwrapped);
    if (ts) return ts.toDate().toISOString();
  }

  if (Array.isArray(unwrapped)) {
    return JSON.stringify(unwrapped.map((v) => normalizeForCSV(v)));
  }

  if (typeof unwrapped === "object") {
    const out = {};
    for (const k of Object.keys(unwrapped)) {
      out[k] = normalizeForCSV(unwrapped[k]);
    }
    return JSON.stringify(out);
  }

  return String(unwrapped);
};

/* ---------- Firestore helpers ---------- */

const fetchCollection = async (name) => {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

const fetchSubcollection = async (parentCollection, parentId, sub) => {
  const snap = await getDocs(collection(db, parentCollection, parentId, sub));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/* ---------- CSV conversion ---------- */

const convertToCSV = (docs) => {
  if (!docs || docs.length === 0) return "No data";

  const headersSet = new Set();
  docs.forEach((d) => Object.keys(d).forEach((k) => headersSet.add(k)));
  const headers = Array.from(headersSet);

  const rows = docs.map((doc) =>
    headers
      .map((h) => {
        const raw = doc[h];
        const value = normalizeForCSV(raw);
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
};

/* ---------- Transformation logic (JSON-unwrapping + timestamps + booleans) ---------- */

/**
 * transformValue: recursively transforms a value:
 * - unwraps JSON string layers
 * - converts "true"/"false" strings to booleans
 * - converts timestamp-like values to Firestore Timestamp
 * - converts "null"/"" empty strings to null (for fields like kioskId you can customize)
 *
 * Returns { newValue, changed, changedPaths }
 */
const transformValue = (value, basePath = "") => {
  let changed = false;
  const changedPaths = [];

  const recurse = (val, path) => {
    // 1) unwrap JSON string layers if present
    if (typeof val === "string") {
      const unwrapped = unwrapStringLayers(val);
      if (unwrapped !== val) {
        changed = true;
        changedPaths.push(path || "<root>");
        return recurse(unwrapped, path);
      }

      // simple boolean strings
      if (val === "true") {
        changed = true;
        changedPaths.push(path || "<root>");
        return true;
      }
      if (val === "false") {
        changed = true;
        changedPaths.push(path || "<root>");
        return false;
      }

      // treat empty string as null for optional fields (kioskId etc.)
      if (val === "") {
        // keep as empty string for some fields? we'll convert to null to be cleaner
        changed = true;
        changedPaths.push(path || "<root>");
        return null;
      }

      return val; // leave other strings unchanged
    }

    // 2) timestamp-like
    const maybeTs = parseIfTimestampString(val);
    if (maybeTs) {
      changed = true;
      changedPaths.push(path || "<root>");
      return maybeTs;
    }

    // 3) Arrays: map recursively
    if (Array.isArray(val)) {
      const out = val.map((el, idx) => recurse(el, path ? `${path}.${idx}` : `${idx}`));
      return out;
    }

    // 4) Objects (maps): recurse each key
    if (val && typeof val === "object") {
      const outObj = {};
      for (const [k, v] of Object.entries(val)) {
        const childPath = path ? `${path}.${k}` : k;
        outObj[k] = recurse(v, childPath);
      }
      return outObj;
    }

    // primitives (numbers, booleans, null)
    return val;
  };

  const newValue = recurse(value, basePath || "");
  return { newValue, changed, changedPaths };
};

const transformDocumentData = (data) => {
  let overallChanged = false;
  const allPaths = [];
  const updated = {};
  for (const [k, v] of Object.entries(data)) {
    const { newValue, changed, changedPaths } = transformValue(v, k);
    updated[k] = newValue;
    if (changed) {
      overallChanged = true;
      allPaths.push(...changedPaths);
    }
  }
  return { updatedData: updated, changed: overallChanged, changedPaths: allPaths };
};

/* ---------- Scanning & Applying Fixes ---------- */

const dryRunScanCollection = async (collectionName) => {
  const snap = await getDocs(collection(db, collectionName));
  const results = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const { changed, changedPaths } = transformDocumentData(data);
    if (changed) {
      results.push({ id: docSnap.id, changedPaths });
    }
  }
  return results;
};

const applyFixesToDocs = async (collectionName, docIds, onProgress = () => {}) => {
  let applied = 0;
  for (let i = 0; i < docIds.length; i++) {
    const id = docIds[i];
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        console.warn(`Document ${collectionName}/${id} not found when applying fixes.`);
        continue;
      }
      const data = docSnap.data();
      const { updatedData } = transformDocumentData(data);
      await setDoc(docRef, updatedData, { merge: true });
      applied++;
      onProgress({ collectionName, id, index: i + 1, total: docIds.length });
    } catch (e) {
      console.error(`Failed to apply fixes to ${collectionName}/${id}:`, e);
    }
  }
  return { applied };
};

/* ---------- React Component ---------- */

export default function BackupButton({
  adminEmail,
  // include attendance_sessions in the default list to be fixed
  collectionsToBackup = ["students", "teachers", "classes", "announcements", "attendance_sessions"],
  collectionsToFix = ["students", "teachers", "classes", "attendance_sessions"],
}) {
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [loadingFix, setLoadingFix] = useState(false);

  const verifyAdminPassword = async (password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, password);
      return !!userCredential.user;
    } catch (error) {
      console.error("Admin login failed:", error.code, error.message);
      return false;
    }
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

      setLoadingBackup(true);
      const zip = new JSZip();

      // Backup main collections (CSV)
      for (const col of collectionsToBackup) {
        const docs = await fetchCollection(col);
        zip.file(`${col}.csv`, convertToCSV(docs));
      }

      // Backup student attendance subcollections
      const studentsSnap = await getDocs(collection(db, "students"));
      const studentAttendanceFolder = zip.folder("students_attendance");
      for (const studentDoc of studentsSnap.docs) {
        const docs = await fetchSubcollection("students", studentDoc.id, "attendance");
        studentAttendanceFolder.file(`${studentDoc.id}.csv`, convertToCSV(docs));
      }

      // Backup teacher attendance subcollections
      const teachersSnap = await getDocs(collection(db, "teachers"));
      const teacherAttendanceFolder = zip.folder("teachers_attendance");
      for (const teacherDoc of teachersSnap.docs) {
        const docs = await fetchSubcollection("teachers", teacherDoc.id, "attendance");
        teacherAttendanceFolder.file(`${teacherDoc.id}.csv`, convertToCSV(docs));
      }

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
      setLoadingBackup(false);
    }
  };

  const handleFixTimestampsAndJson = async () => {
    setLoadingFix(true);
  
    try {
      const summary = {};
      let totalDocsToChange = 0;
  
      // Run dry-run scan
      for (const col of collectionsToFix) {
        const results = await dryRunScanCollection(col);
        summary[col] = results;
        totalDocsToChange += results.length;
      }
  
      if (totalDocsToChange === 0) {
        await Swal.fire("No changes detected", "No documents need fixes.", "info");
        setLoadingFix(false);
        return;
      }
  
      let html = `<p>Dry run detected changes in these collections:</p><ul>`;
      for (const [col, docs] of Object.entries(summary)) {
        if (docs.length === 0) continue;
        const samples = docs.slice(0, 8).map((d) => d.id).join(", ");
        html += `<li><b>${col}</b>: ${docs.length} documents (examples: ${samples})</li>`;
      }
      html += `</ul><p>Apply these changes? This will write to Firestore. Make sure you backed up your data.</p>`;
  
      const { isConfirmed } = await Swal.fire({
        title: "Dry run complete",
        html,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, apply changes",
      });
  
      if (!isConfirmed) {
        setLoadingFix(false);
        return;
      }
  
      // Apply fixes
      let totalApplied = 0;
      for (const [col, docs] of Object.entries(summary)) {
        if (docs.length === 0) continue;
  
        const ids = docs.map((d) => d.id);
  
        const res = await applyFixesToDocs(
          col,
          ids,
          ({ collectionName, id, index, total }) => {
            console.info(`${collectionName} - ${index}/${total} updated: ${id}`);
          }
        );
  
        totalApplied += res.applied;
      }
  
      await Swal.fire(
        "Applied",
        `Finished applying changes. Documents updated: ${totalApplied}`,
        "success"
      );
    } catch (err) {
      console.error("Fixing process failed:", err);
      await Swal.fire(
        "Error",
        "Fix process failed. Check console for details.",
        "error"
      );
    } finally {
      setLoadingFix(false);
    }
  };  

  return (
    <div className="space-y-2">
      <button
        onClick={handleBackup}
        disabled={loadingBackup}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loadingBackup ? "Creating Backup..." : "Backup All"}
      </button>

      <button
        onClick={handleFixTimestampsAndJson}
        disabled={loadingFix}
        className="w-full px-4 py-3 bg-yellow-600 text-white rounded hover:bg-yellow-700"
      >
        {loadingFix ? "Working..." : "Fix Timestamps & JSON Strings"}
      </button>
    </div>
  );
}