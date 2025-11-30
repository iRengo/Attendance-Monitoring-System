import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { auth, db } from './firebase'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, writeBatch, addDoc, updateDoc } from 'firebase/firestore';

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

  // Backup Firestore collections
  // Backup only announcements
    const backupFirestore = async () => {
        const snapshot = await getDocs(collection(db, 'announcements'));
        const backupData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        data: docSnap.data(),
        }));
    
        await addDoc(collection(db, 'backups'), {
        timestamp: new Date(),
        data: { announcements: backupData },
        });
    };
  
  // Archive and reset attendance subcollections
  const archiveAndResetData = async () => {
    // Students
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    for (const docSnap of studentsSnapshot.docs) {
      const docRef = doc(db, 'students', docSnap.id);
      await updateDoc(docRef, { schoolYearStatus: 'archived' });

      // Reset student attendance subcollection
      const attendanceSnap = await getDocs(collection(db, 'students', docSnap.id, 'attendance'));
      const batch = writeBatch(db);
      attendanceSnap.forEach(snap => {
        batch.delete(doc(db, 'students', docSnap.id, 'attendance', snap.id));
      });
      await batch.commit();
    }

    // Teachers
    const teachersSnapshot = await getDocs(collection(db, 'teachers'));
    for (const docSnap of teachersSnapshot.docs) {
      const docRef = doc(db, 'teachers', docSnap.id);
      await updateDoc(docRef, { schoolYearStatus: 'archived' });

      // Reset teacher attendance subcollection
      const attendanceSnap = await getDocs(collection(db, 'teachers', docSnap.id, 'attendance'));
      const batch = writeBatch(db);
      attendanceSnap.forEach(snap => {
        batch.delete(doc(db, 'teachers', docSnap.id, 'attendance', snap.id));
      });
      await batch.commit();
    }

    // Classes
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    const classesBatch = writeBatch(db);
    classesSnapshot.forEach(docSnap => {
      const docRef = doc(db, 'classes', docSnap.id);
      classesBatch.update(docRef, { schoolYearStatus: 'archived' });
    });
    await classesBatch.commit();

    // DELETE all attendance_sessions documents
    const attendanceSnap = await getDocs(collection(db, 'attendance_sessions'));
    const attendanceBatch = writeBatch(db);
    attendanceSnap.forEach(docSnap => {
    attendanceBatch.delete(doc(db, 'attendance_sessions', docSnap.id));
    });
    await attendanceBatch.commit();

    // Announcements
    const announcementSnap = await getDocs(collection(db, 'announcements'));
    const annBatch = writeBatch(db);
    announcementSnap.forEach(docSnap => {
      const docRef = doc(db, 'announcements', docSnap.id);
      annBatch.update(docRef, { schoolYearStatus: 'archived' });
    });
    await annBatch.commit();
  };

  // Create new school year
  const createNewSchoolYear = async (yearName) => {
    await addDoc(collection(db, 'schoolYears'), {
      name: yearName,
      status: 'current',
      createdAt: new Date(),
    });
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
        text: 'All current school year data will be archived. Attendance records of students and teachers will be reset!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, archive and reset attendance',
      });

      if (!confirmResult.isConfirmed) return;

      setLoading(true);

      await Swal.fire('Backing up data...', '', 'info');
      await backupFirestore();

      await Swal.fire('Archiving and resetting attendance...', '', 'info');
      await archiveAndResetData();

      const { value: newYearName } = await Swal.fire({
        title: 'Enter new school year name',
        input: 'text',
        inputPlaceholder: 'e.g. 2025-2026',
        showCancelButton: true,
      });

      if (!newYearName) return;

      await createNewSchoolYear(newYearName);

      Swal.fire('Success', 'All data archived and attendance reset for new school year!', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Something went wrong. Check console for details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleArchive}
        disabled={loading}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        {loading ? 'Processing...' : 'Archive & Reset Attendance'}
      </button>
    </div>
  );
}
