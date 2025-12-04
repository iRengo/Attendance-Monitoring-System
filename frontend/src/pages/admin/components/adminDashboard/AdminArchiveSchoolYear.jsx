import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { auth, db } from '../../../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

export default function AdminArchiveSchoolYear({ adminEmail }) {
  const [loading, setLoading] = useState(false);

  // Verify admin password
  const verifyAdminPassword = async (password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, password);
      return !!userCredential.user;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  // Archive and reset attendance subcollections
  const archiveAndResetData = async () => {
    // Students
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    for (const docSnap of studentsSnapshot.docs) {
      const attendanceSnap = await getDocs(
        collection(db, 'students', docSnap.id, 'attendance')
      );

      const batch = writeBatch(db);
      attendanceSnap.forEach(snap => {
        batch.delete(doc(db, 'students', docSnap.id, 'attendance', snap.id));
      });
      await batch.commit();
    }

    // Teachers
    const teachersSnapshot = await getDocs(collection(db, 'teachers'));
    for (const docSnap of teachersSnapshot.docs) {
      const attendanceSnap = await getDocs(
        collection(db, 'teachers', docSnap.id, 'attendance')
      );

      const batch = writeBatch(db);
      attendanceSnap.forEach(snap => {
        batch.delete(doc(db, 'teachers', docSnap.id, 'attendance', snap.id));
      });
      await batch.commit();
    }

    // Delete attendance_sessions
    const attendanceSessionsSnap = await getDocs(collection(db, 'attendance_sessions'));
    const attBatch = writeBatch(db);
    attendanceSessionsSnap.forEach(docSnap => {
      attBatch.delete(doc(db, 'attendance_sessions', docSnap.id));
    });
    await attBatch.commit();

    // Announcements — no change
    const announcementSnap = await getDocs(collection(db, 'announcements'));
    const annBatch = writeBatch(db);
    announcementSnap.forEach(docSnap => {});
    await annBatch.commit();
  };

  const handleArchive = async () => {
    try {
      const { value: password } = await Swal.fire({
        title: 'Admin password required',
        input: 'password',
        inputLabel: 'Enter your password to proceed',
        inputPlaceholder: 'Password',
        showCancelButton: true,
      });

      if (!password) return;

      const valid = await verifyAdminPassword(password);
      if (!valid) {
        await Swal.fire('Error', 'Password incorrect', 'error');
        return;
      }

      const confirmResult = await Swal.fire({
        title: 'Are you sure?',
        text: 'All current school year attendance records will be RESET!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, reset attendance',
      });

      if (!confirmResult.isConfirmed) return;

      setLoading(true);

      await Swal.fire('Resetting attendance...', '', 'info');
      await archiveAndResetData();

      Swal.fire('Success', 'Attendance has been reset successfully!', 'success');
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
        className="w-full px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700"
      >
        {loading ? "Processing..." : "Reset School Year Attendance"}
      </button>
    </div>
  );
}
