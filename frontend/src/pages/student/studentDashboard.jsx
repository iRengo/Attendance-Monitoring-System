import { useEffect, useState } from "react";
import StudentLayout from "../../components/studentLayout";
import { UserCheck, UserX, Clock, Activity, Megaphone, FileDown } from "lucide-react";
import { db, auth } from "../../firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import logoImage from "../../assets/images/aics_logo.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function StudentDashboard() {
  const [announcements, setAnnouncements] = useState([]);
  const [schedules, setSchedules] = useState([]); // array of full class objects from top-level classes collection
  const [teachers, setTeachers] = useState({});
  const [studentId, setStudentId] = useState(null);

  const attendance = {
    present: 18,
    absent: 2,
    late: 1,
    rate: "90%",
  };

  // ✅ Track logged-in student
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setStudentId(user.uid);
      else setStudentId(null);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Fetch Announcements
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

  // ✅ Fetch student’s schedules from top-level classes collection
  useEffect(() => {
    if (!studentId) return;

    const fetchSchedules = async () => {
      try {
        const studentDoc = await getDoc(doc(db, "students", studentId));
        if (!studentDoc.exists()) {
          setSchedules([]);
          setTeachers({});
          return;
        }

        const studentData = studentDoc.data() || {};
        const rawClasses = Array.isArray(studentData.classes) ? studentData.classes : [];

        // Support both schemas:
        // - New: classes = ["classId001", "classId002"]
        // - Legacy: classes = [{ id, subjectName, ... }]
        const isIdArray = rawClasses.every((c) => typeof c === "string");

        let classList = [];
        if (isIdArray) {
          // Expand class IDs to full docs from top-level "classes"
          const ids = [...new Set(rawClasses)];
          const docs = await Promise.all(
            ids.map(async (id) => {
              const snap = await getDoc(doc(db, "classes", id));
              return snap.exists() ? { id: snap.id, ...snap.data() } : null;
            })
          );
          classList = docs.filter(Boolean);
        } else {
          // Legacy embedded objects — use as-is
          classList = rawClasses
            .map((c) => (c && typeof c === "object" ? c : null))
            .filter(Boolean);
        }

        setSchedules(classList);

        // Fetch teacher names for display
        const teacherIds = [...new Set(classList.map((c) => c.teacherId).filter(Boolean))];
        const teacherMap = {};
        await Promise.all(
          teacherIds.map(async (id) => {
            const tDoc = await getDoc(doc(db, "teachers", id));
            if (tDoc.exists()) {
              const t = tDoc.data() || {};
              const name = `${t.firstName || t.firstname || ""} ${t.middleName || t.middlename || ""} ${t.lastName || t.lastname || ""}`
                .replace(/\s+/g, " ")
                .trim();
              teacherMap[id] = name || "Unknown Teacher";
            } else {
              teacherMap[id] = "Unknown Teacher";
            }
          })
        );
        setTeachers(teacherMap);
      } catch (err) {
        console.error("Error fetching schedules:", err);
        setSchedules([]);
        setTeachers({});
      }
    };

    fetchSchedules();
  }, [studentId]);

  // ✅ PDF Export Function
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

      const gradeLevel =
        schedules.length > 0 ? schedules[0].gradeLevel || "N/A" : "N/A";

      const docPDF = new jsPDF();

      // ✅ Add imported logo (top-right)
      const logo = new Image();
      logo.src = logoImage;
      logo.onload = () => {
        docPDF.addImage(logo, "PNG", 170, 7, 25, 25); // x, y, width, height

        // ✅ Header Section
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(18);
        docPDF.text("Asian Institute of Computer Studies", 14, 20);

        docPDF.setFontSize(14);
        docPDF.text("Student Class Schedule", 14, 30);

        // ✅ Blue underline for styling
        docPDF.setDrawColor(66, 133, 244);
        docPDF.setLineWidth(0.7);
        docPDF.line(14, 35, 195, 35);

        // ✅ Student Info
        docPDF.setFont("helvetica", "normal");
        docPDF.setFontSize(11);
        docPDF.text(`Name: ${fullName}`, 14, 45);
        docPDF.text(`Grade Level: ${gradeLevel}`, 14, 51);

        docPDF.setFontSize(9);
        docPDF.setTextColor(100);
        docPDF.text(`Generated on: ${new Date().toLocaleString()}`, 14, 58);

        if (schedules.length === 0) {
          docPDF.text("No schedules available.", 14, 70);
        } else {
          const tableColumn = ["Days", "Time", "Subject", "Room", "Teacher"];
          const tableRows = schedules.map((sched) => [
            sched.days || "N/A",
            sched.time || "N/A",
            sched.subjectName || "N/A",
            sched.roomNumber || "N/A",
            teachers[sched.teacherId] || "Unknown",
          ]);

          // ✅ Styled Table
          autoTable(docPDF, {
            head: [tableColumn],
            body: tableRows,
            startY: 65,
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

        // ✅ Footer
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
                  <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">
                    Days
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">
                    Time
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">
                    Subject
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">
                    Room
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">
                    Teacher
                  </th>
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
                      {teachers[sched.teacherId] || "Loading..."}
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