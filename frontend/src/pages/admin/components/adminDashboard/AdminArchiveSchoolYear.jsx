import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { auth, db } from '../../../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

export default function AdminArchiveSchoolYear({ adminEmail }) {
  const [loading, setLoading] = useState(false);

  const verifyAdminPassword = async (password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, password);
      return !!userCredential.user;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const archiveAttendanceData = async (schoolYearValue) => {
    // -----------------------------------------
    // STUDENTS ATTENDANCE
    // -----------------------------------------
    const studentsSnapshot = await getDocs(collection(db, 'students'));

    for (const studentDoc of studentsSnapshot.docs) {
      const attendanceSnap = await getDocs(
        collection(db, 'students', studentDoc.id, 'attendance')
      );

      const batch = writeBatch(db);

      attendanceSnap.forEach((snap) => {
        const data = snap.data();
        // Only update if stats or schoolYear are missing
        if (!data.stats && !data.schoolYear) {
          batch.update(doc(db, 'students', studentDoc.id, 'attendance', snap.id), {
            stats: 'archived',
            schoolYear: schoolYearValue,
          });
        }
      });

      await batch.commit();
    }

    // -----------------------------------------
    // ATTENDANCE SESSIONS
    // -----------------------------------------
    const sessionSnap = await getDocs(collection(db, 'attendance_sessions'));
    const sessionBatch = writeBatch(db);
    sessionSnap.forEach((snap) => {
      const data = snap.data();
      if (!data.stats && !data.schoolYear) {
        sessionBatch.update(doc(db, 'attendance_sessions', snap.id), {
          stats: 'archived',
          schoolYear: schoolYearValue,
        });
      }
    });
    await sessionBatch.commit();

    // -----------------------------------------
    // CLASSES — newly added
    // -----------------------------------------
    const classesSnap = await getDocs(collection(db, 'classes'));
    const classBatch = writeBatch(db);
    classesSnap.forEach((snap) => {
      const data = snap.data();
      if (!data.stats && !data.schoolYear) {
        classBatch.update(doc(db, 'classes', snap.id), {
          stats: 'archived',
          schoolYear: schoolYearValue,
        });
      }
    });
    await classBatch.commit();
  };

  const handleArchive = async () => {
    try {
      const { value: password } = await Swal.fire({
        title: 'Admin password required',
        input: 'password',
        inputLabel: 'Enter your password',
        inputPlaceholder: 'Password',
        showCancelButton: true,
      });
      if (!password) return;

      const valid = await verifyAdminPassword(password);
      if (!valid) {
        await Swal.fire('Error', 'Password incorrect', 'error');
        return;
      }

      const { value: schoolYearValue } = await Swal.fire({
        title: 'Enter School Year',
        input: 'text',
        inputLabel: 'Example: 2024-2025',
        inputPlaceholder: '2024-2025',
        showCancelButton: true,
        inputValidator: (value) => (!value ? 'School year cannot be empty' : null),
      });

      if (!schoolYearValue) return;

      const confirmResult = await Swal.fire({
        title: 'Archive Attendance?',
        text: `All attendance records without schoolYear will be marked as archived for ${schoolYearValue}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, archive it',
      });

      if (!confirmResult.isConfirmed) return;

      setLoading(true);
      await Swal.fire('Archiving...', 'Please wait.', 'info');
      await archiveAttendanceData(schoolYearValue);

      Swal.fire('Success!', 'All current year attendance has been archived!', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Something went wrong.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleArchive}
        disabled={loading}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loading ? 'Processing...' : 'Archive School Year Records'}
      </button>
      <div className="text-base text-gray-700 leading-relaxed">
        <div className="mt-6 text-lg font-bold text-gray-800">
          IF YOU WANT TO START A NEW SCHOOL YEAR
        </div>
        <ul className="list-disc pl-7 mt-3 space-y-2 text-base">
          <li>
            <strong>Step 1:</strong> Backup All to recover if something goes wrong.
          </li>
          <li>
            <strong>Step 2:</strong> Archive School Year Records. Enter the school year you want to archive 
            (e.g., to start 2026–2027, archive <strong>2025–2026</strong>).
          </li>
          <li>
            <strong>Step 3:</strong> Done!
          </li>
        </ul>
      </div>
    </div>
  );
}
