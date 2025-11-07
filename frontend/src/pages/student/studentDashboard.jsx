import { useEffect, useState } from "react";
import StudentLayout from "../../components/studentLayout";
import { UserCheck, UserX, Clock, Activity, Megaphone, FileDown } from "lucide-react";
import { db, auth } from "../../firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import logoImage from "../../assets/images/aics_logo.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function normalizeArrayOrNumericMap(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => value[k]);
  }
  return [];
}

function normalizeItem(it) {
  if (!it || typeof it !== "object") return null;

  // subject fallback includes accidental "section" key used in your sample
  const subjectName = it.Subject ?? it.subjectName ?? it.subject ?? it.section ?? "N/A";
  const days = it.days ?? it.Days ?? it.day ?? it.Day ?? "N/A";
  const time = it.time ?? it.Time ?? "N/A";
  const roomNumber = it.roomNumber ?? it.room ?? it.Room ?? "N/A";
  const teacherName = it.Teacher ?? it.teacherName ?? it.teacher ?? null;
  const teacherId = it.teacherId ?? null;

  return { subjectName, days, time, roomNumber, teacherName, teacherId };
}

function sortByDay(a, b) {
  const ai = DAY_ORDER.indexOf(a.days);
  const bi = DAY_ORDER.indexOf(b.days);
  if (ai === -1 && bi === -1) return 0;
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}

function buildSectionKey(gradeLevelRaw, sectionRaw) {
  const gl = String(gradeLevelRaw ?? "").trim();
  const sec = String(sectionRaw ?? "").trim();
  if (gl && sec) return `${gl}-${sec}`;
  return gl || sec || ""; // partial fallback
}

export default function StudentDashboard() {
  const [announcements, setAnnouncements] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [studentId, setStudentId] = useState(null);
  const [computedKey, setComputedKey] = useState("");

  // Dynamic attendance stats (computed from Firestore)
  const [attendance, setAttendance] = useState({
    present: 0,
    absent: 0,
    late: 0,
    rate: "0%",
  });

  // Auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setStudentId(user.uid);
      else setStudentId(null);
    });
    return () => unsubscribe();
  }, []);

  // Announcements
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const filtered = data.filter((a) => {
        const isExpired = new Date(a.expiration) < new Date();
        return !isExpired && (a.target === "students" || a.target === "all");
      });
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt?.toDate?.() || 0) -
          new Date(a.createdAt?.toDate?.() || 0)
      );
      setAnnouncements(filtered);
    });
    return () => unsub();
  }, []);

  // Attendance stats (present/absent/late + rate) from students/{id}/attendance
  useEffect(() => {
    if (!studentId) return;
    const attendRef = collection(db, "students", studentId, "attendance");
    const unsub = onSnapshot(
      attendRef,
      (snap) => {
        let present = 0;
        let absent = 0;
        let late = 0;

        snap.docs.forEach((d) => {
          const status = String(d.data()?.status || "").toLowerCase();
          if (status === "present") present += 1;
          else if (status === "absent") absent += 1;
          else if (status === "late") late += 1;
        });

        const total = present + absent + late;
        // If you want to treat "late" as present for the rate, change numerator to (present + late)
        const ratePct = total ? Math.round((present / total) * 100) : 0;
        setAttendance({
          present,
          absent,
          late,
          rate: `${ratePct}%`,
        });
      },
      (err) => {
        console.error("Error loading attendance stats:", err);
        setAttendance({ present: 0, absent: 0, late: 0, rate: "0%" });
      }
    );

    return () => unsub();
  }, [studentId]);

  // Schedules by SectionKey (e.g., "11-A")
  useEffect(() => {
    if (!studentId) return;

    const studentRef = doc(db, "students", studentId);
    let unsubSchedule = null;

    const unsubStudent = onSnapshot(
      studentRef,
      (snap) => {
        if (!snap.exists()) {
          setSchedules([]);
          setComputedKey("");
          if (unsubSchedule) unsubSchedule();
          unsubSchedule = null;
          return;
        }
        const data = snap.data() || {};
        const section = String(data.section || "").trim();
        const gradeLevel = String(data.gradelevel ?? data.gradeLevel ?? "").trim();

        // Build "11-A" like key
        const sectionKey = buildSectionKey(gradeLevel, section);
        if (!sectionKey) {
          setSchedules([]);
          setComputedKey("");
          if (unsubSchedule) unsubSchedule();
          unsubSchedule = null;
          return;
        }
        setComputedKey(sectionKey);

        const scheduleRef = doc(db, "schedules", "sectionschedule");
        if (unsubSchedule) unsubSchedule();
        unsubSchedule = onSnapshot(
          scheduleRef,
          (s) => {
            if (!s.exists()) {
              setSchedules([]);
              return;
            }
            const schedData = s.data() || {};

            // Try strict "11-A" first; then fallbacks for migration period
            let bySection =
              schedData[sectionKey] ??
              schedData[section] ?? // A
              schedData[gradeLevel]; // 11

            const arr = normalizeArrayOrNumericMap(bySection)
              .map(normalizeItem)
              .filter(Boolean)
              .sort(sortByDay);
            setSchedules(arr);
          },
          (e) => {
            console.error("Failed to load schedules:", e);
            setSchedules([]);
          }
        );
      },
      (e) => {
        console.error("Failed to listen to student:", e);
        setSchedules([]);
      }
    );

    return () => {
      unsubStudent();
      if (unsubSchedule) unsubSchedule();
    };
  }, [studentId]);

  // PDF Export
  const exportToPDF = async () => {
    if (!studentId) return;

    try {
      const studentRef = doc(db, "students", studentId);
      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) {
        console.error("Student not found");
        return;
      }

      const studentData = studentSnap.data() || {};
      const fullName = `${studentData.firstname || ""} ${studentData.middlename || ""} ${studentData.lastname || ""}`
        .replace(/\s+/g, " ")
        .trim();

      const gradeLevel = studentData.gradelevel || studentData.gradeLevel || "N/A";
      const section = studentData.section || "N/A";

      const docPDF = new jsPDF();
      const logo = new Image();
      logo.src = logoImage;
      logo.onload = () => {
        docPDF.addImage(logo, "PNG", 170, 7, 25, 25);

        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(18);
        docPDF.text("Asian Institute of Computer Studies", 14, 20);

        docPDF.setFontSize(14);
        docPDF.text("Student Class Schedule", 14, 30);

        docPDF.setDrawColor(66, 133, 244);
        docPDF.setLineWidth(0.7);
        docPDF.line(14, 35, 195, 35);

        docPDF.setFont("helvetica", "normal");
        docPDF.setFontSize(11);
        docPDF.text(`Name: ${fullName}`, 14, 45);
        docPDF.text(`Grade Level: ${gradeLevel}`, 14, 51);
        docPDF.text(`Section: ${buildSectionKey(gradeLevel, section) || section}`, 14, 57);

        docPDF.setFontSize(9);
        docPDF.setTextColor(100);
        docPDF.text(`Generated on: ${new Date().toLocaleString()}`, 14, 64);

        if (schedules.length === 0) {
          docPDF.text("No schedules available.", 14, 76);
        } else {
          const tableColumn = ["Days", "Time", "Subject", "Room", "Teacher"];
          const tableRows = schedules.map((sched) => [
            sched.days || "N/A",
            sched.time || "N/A",
            sched.subjectName || "N/A",
            sched.roomNumber || "N/A",
            sched.teacherName || "-",
          ]);

          autoTable(docPDF, {
            head: [tableColumn],
            body: tableRows,
            startY: 71,
            theme: "striped",
            headStyles: {
              fillColor: [66, 133, 244],
              textColor: 255,
              fontStyle: "bold",
              halign: "center",
            },
            bodyStyles: {
              textColor: 50,
              halign: "center",
              cellPadding: 3,
            },
            styles: { fontSize: 10, lineColor: [220, 220, 220], lineWidth: 0.2 },
            alternateRowStyles: { fillColor: [245, 248, 255] },
          });
        }

        const pageHeight = docPDF.internal.pageSize.height;
        docPDF.setFontSize(9);
        docPDF.setTextColor(120);
        docPDF.text(
          "This report is system-generated and does not require a signature.",
          14,
          pageHeight - 10
        );

        docPDF.save(`${fullName || "My"}_Schedule.pdf`);
      };
    } catch (error) {
      console.error("PDF generation error:", error);
    }
  };

  return (
    <StudentLayout title="Dashboard">
      <div className="p-6 space-y-6">
        {/* Attendance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: UserCheck, label: "Present", value: attendance.present },
            { icon: UserX, label: "Absent", value: attendance.absent },
            { icon: Clock, label: "Late", value: attendance.late },
            { icon: Activity, label: "Attendance Rate", value: attendance.rate },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="border border-gray-200 rounded-xl p-5 flex flex-col items-center shadow-sm hover:shadow-lg transition duration-200"
              >
                <Icon size={32} className="mb-2 text-gray-600" />
                <h2 className="text-sm font-medium mb-1 text-gray-700">
                  {card.label}
                </h2>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Announcements */}
        <div className="bg-white shadow-sm rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Megaphone className="text-blue-500" />
            Announcements
          </h2>
          {announcements.length > 0 ? (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-blue-50 transition"
                >
                  <h3 className="font-semibold text-gray-800">{a.title}</h3>
                  <p className="text-gray-700 text-sm mt-1">{a.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Posted by {a.author} • Expires on{" "}
                    {new Date(a.expiration).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No current announcements.</p>
          )}
        </div>

        {/* Schedules */}
        <div className="bg-white shadow-sm rounded-xl p-5 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">My Schedule</h2>
            <div className="text-sm text-gray-500">{computedKey && `Section: ${computedKey}`}</div>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
            >
              <FileDown size={16} /> Download PDF
            </button>
          </div>

          {schedules.length === 0 ? (
            <p className="text-gray-400 italic">No schedules yet.</p>
          ) : (
            <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Days</th>
                  <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Time</th>
                  <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Subject</th>
                  <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Room</th>
                  <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Teacher</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedules.map((sched, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-4 text-gray-800">{sched.days || "N/A"}</td>
                    <td className="py-2 px-4 text-gray-800">{sched.time || "N/A"}</td>
                    <td className="py-2 px-4 text-gray-800">{sched.subjectName || "N/A"}</td>
                    <td className="py-2 px-4 text-gray-800">{sched.roomNumber || "N/A"}</td>
                    <td className="py-2 px-4 text-gray-800">
                      {sched.teacherName || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}