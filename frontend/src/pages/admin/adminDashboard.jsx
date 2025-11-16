import { useState, useEffect, useMemo } from "react";
import AdminLayout from "../../components/adminLayout";
import { db, auth } from "../../firebase";
import { collection, getDocs, onSnapshot, writeBatch, doc, addDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";

// Components
import Card from "./components/adminDashboard/Card";
import AttendanceTrendsChart from "./components/adminDashboard/AttendanceTrendsChart";
import PresencePie from "./components/adminDashboard/PresencePie";
import RecentActivities from "./components/adminDashboard/RecentActivities";

import Swal from "sweetalert2";

// Archive button component
function AdminArchiveSchoolYear({ adminEmail }) {
  const [loading, setLoading] = useState(false);

  const verifyAdminPassword = async (password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, password);
      return userCredential.user ? true : false;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const backupFirestore = async () => {
    const collectionsToBackup = ["students", "teachers", "classes", "attendance_sessions", "announcements"];
    const backupData = {};

    for (const col of collectionsToBackup) {
      const snapshot = await getDocs(collection(db, col));
      backupData[col] = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
    }

    await addDoc(collection(db, "backups"), {
      timestamp: new Date(),
      data: backupData,
    });
  };

  const archiveAndResetAttendance = async () => {
    // Reset subcollection of attendance for students
    const studentsSnap = await getDocs(collection(db, "students"));
    for (const studentDoc of studentsSnap.docs) {
      const attendanceRef = collection(db, "students", studentDoc.id, "attendance");
      const attendanceSnap = await getDocs(attendanceRef);
      const batch = writeBatch(db);
      attendanceSnap.forEach((docSnap) =>
        batch.delete(doc(db, "students", studentDoc.id, "attendance", docSnap.id))
      );
      await batch.commit();
    }

    // Reset subcollection of attendance for teachers
    const teachersSnap = await getDocs(collection(db, "teachers"));
    for (const teacherDoc of teachersSnap.docs) {
      const attendanceRef = collection(db, "teachers", teacherDoc.id, "attendance");
      const attendanceSnap = await getDocs(attendanceRef);
      const batch = writeBatch(db);
      attendanceSnap.forEach((docSnap) =>
        batch.delete(doc(db, "teachers", teacherDoc.id, "attendance", docSnap.id))
      );
      await batch.commit();
    }

    // Archive main documents (students, teachers, classes, attendance_sessions, announcements)
    const collectionsToArchive = ["students", "teachers", "classes", "attendance_sessions", "announcements"];
    for (const col of collectionsToArchive) {
      const snapshot = await getDocs(collection(db, col));
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.update(doc(db, col, docSnap.id), { schoolYearStatus: "archived" });
      });
      await batch.commit();
    }
  };

  const createNewSchoolYear = async (yearName) => {
    await addDoc(collection(db, "schoolYears"), {
      name: yearName,
      status: "current",
      createdAt: new Date(),
    });
  };

  const handleArchive = async () => {
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

      const confirmResult = await Swal.fire({
        title: "Are you sure?",
        text: "All current school year data will be archived and attendance subcollections will be reset.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, archive all",
      });

      if (!confirmResult.isConfirmed) return;

      setLoading(true);
      await Swal.fire("Backing up data...", "", "info");
      await backupFirestore();

      await Swal.fire("Archiving and resetting attendance...", "", "info");
      await archiveAndResetAttendance();

      const { value: newYearName } = await Swal.fire({
        title: "Enter new school year name",
        input: "text",
        inputPlaceholder: "e.g. 2025-2026",
        showCancelButton: true,
      });
      if (!newYearName) return;

      await createNewSchoolYear(newYearName);
      Swal.fire("Success", "Data archived and new school year created!", "success");
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Something went wrong. Check console for details.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleArchive}
      disabled={loading}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      {loading ? "Processing..." : "Archive School Year"}
    </button>
  );
}

export default function AdminDashboard() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [attendancePercent, setAttendancePercent] = useState(0);
  const [presenceData, setPresenceData] = useState([
    { name: "Present", value: 0 },
    { name: "Absent", value: 0 },
  ]);
  const [activities, setActivities] = useState([]);

  const attendanceTrends = useMemo(
    () => [
      { name: "Mon", attendance: 90 },
      { name: "Tue", attendance: 95 },
      { name: "Wed", attendance: 88 },
      { name: "Thu", attendance: 92 },
      { name: "Fri", attendance: 94 },
    ],
    []
  );

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [studentSnap, teacherSnap] = await Promise.all([
          getDocs(collection(db, "students")),
          getDocs(collection(db, "teachers")),
        ]);
        setTotalStudents(studentSnap.size || 0);
        setTotalTeachers(teacherSnap.size || 0);
      } catch (err) {
        console.error("Failed to fetch counts:", err);
      }
    };
    fetchCounts();
  }, []);

  function getTodayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function extractDateFromId(id) {
    if (!id) return null;
    const match = id.match(/(\d{4}-\d{2}-\d{2})$/);
    return match ? match[1] : null;
  }
  function pickArrayField(obj, keys) {
    for (const k of keys) {
      const v = obj?.[k];
      if (Array.isArray(v)) return v;
    }
    return null;
  }

  useEffect(() => {
    const todayKey = getTodayKey();
    const sessionsRef = collection(db, "attendance_sessions");
    const unsub = onSnapshot(
      sessionsRef,
      (snap) => {
        try {
          const todayDocs = snap.docs.filter((d) => extractDateFromId(d.id) === todayKey);
          let presentSum = 0;
          let absentSum = 0;

          todayDocs.forEach((docSnap) => {
            const data = docSnap.data() || {};
            const presentArr = pickArrayField(data, ["studentsPresent", "present", "presentIds"]) || [];
            const absentArr = pickArrayField(data, ["studentsAbsent", "absent", "absentIds"]) || [];

            presentSum += presentArr.length;
            absentSum += absentArr.length;

            const entries = Array.isArray(data.entries) ? data.entries : [];
            entries.forEach((e) => {
              const st = (e?.status || "unknown").toLowerCase();
              if (st === "present" || st === "late") presentSum++;
              else if (st === "absent") absentSum++;
            });
          });

          const denom = presentSum + absentSum;
          const percent = denom > 0 ? Math.round((presentSum / denom) * 100) : 0;
          setAttendancePercent(percent);
          setPresenceData([
            { name: "Present", value: presentSum },
            { name: "Absent", value: absentSum },
          ]);
        } catch (err) {
          console.error(err);
        }
      },
      (err) => console.error(err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const qAct = collection(db, "recent_activities");
    const unsubscribe = onSnapshot(qAct, (snapshot) => {
      try {
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          const parsedDate = data.timestamp?.toDate?.() || new Date();
          return {
            id: d.id,
            action: data.action || "Activity",
            details: data.details || "",
            actor: data.actor || "Admin",
            parsedDate,
          };
        });
        list.sort((a, b) => b.parsedDate - a.parsedDate);
        setActivities(list);
      } catch (err) {
        console.error(err);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="p-6 space-y-8">
        {/* Archive Button */}
        <div className="mb-4">
          <AdminArchiveSchoolYear adminEmail="aics@admin.edu.ph" />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card title="Total Students" value={totalStudents} iconName="users" />
          <Card title="Total Teachers" value={totalTeachers} iconName="book" />
          <Card title="Attendance % Today" value={`${attendancePercent}%`} iconName="chart" />
        </div>

        {/* Graphs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AttendanceTrendsChart data={attendanceTrends} className="lg:col-span-2" />
          <PresencePie presenceData={presenceData} attendancePercent={attendancePercent} />
        </div>

        {/* Recent Activities */}
        <RecentActivities activities={activities} />
      </div>
    </AdminLayout>
  );
}
