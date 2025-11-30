import { Download } from "lucide-react";
import AdminLayout from "../../components/adminLayout";
import useAdminReports from "./components/adminReports/hooks/useAdminReports";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminReports() {
  const {
    reportKind, setReportKind,
    month, setMonth,
    studentQuery, setStudentQuery, studentOptions, pickStudent, selectedStudentName,
    teacherQuery, setTeacherQuery, teacherOptions, pickTeacher, selectedTeacherName,
    loading, rows, meta, error,
    fetchReport, clearReport,
  } = useAdminReports();

  const hasData = rows.length > 0;

  // Student percent rule:
  // - Each "late" counts as present for percentage up to 3 lates.
  // - After 3 lates, subsequent lates count as absents.
  // Prefer using totalClasses when available to compute percentage.
  function computeAdjustedStudentPercent(r) {
    const present = Number(r.present || 0);
    const late = Number(r.late || 0);
    const absent = Number(r.absent || 0);

    const lateCountedAsPresent = Math.min(late, 3);
    const presentEquivalent = present + lateCountedAsPresent;

    const totalFromEvents = present + absent + late;
    const totalClasses = Number.isFinite(Number(r.totalClasses)) && Number(r.totalClasses) > 0
      ? Number(r.totalClasses)
      : (totalFromEvents || 0);

    if (!totalClasses) return 0;

    const percent = (presentEquivalent / totalClasses) * 100;
    return Number(Math.min(percent, 100).toFixed(1));
  }

  function formatPercent(value) {
    if (value === null || value === undefined || value === "") return "";
    const num = Number(value);
    return Number.isFinite(num) ? `${num}%` : `${value}`;
  }

  function exportCSV() {
    if (!rows.length) return;
    let headers = [];
    let mapped = [];

    if (reportKind === "student") {
      headers = ["Student Name","Grade & Section","Total Classes","Total Days","Present","Absent","Late","Attendance %"];
      mapped = rows.map(r => {
        const pct = computeAdjustedStudentPercent(r);
        return [r.studentName, r.gradeSection, r.totalClasses ?? "", r.totalDays ?? "", r.present ?? "", r.absent ?? "", r.late ?? "", formatPercent(pct)];
      });
    } else if (reportKind === "teacher") {
      headers = ["Teacher Name","Attendance Submitted","Missed Days","Submission Rate"];
      mapped = rows.map(r => [r.teacherName,r.attendanceSubmitted,r.missedDays,formatPercent(r.submissionRate)]);
    } else {
      // Monthly: include Total Classes
      headers = ["Month","Total Classes","Total Days","Total Presents","Total Absences","Late Entries","Avg Attendance %"];
      mapped = rows.map(r => [r.month, r.totalClasses ?? "", r.totalDays ?? "", r.totalPresents ?? "", r.totalAbsences ?? "", r.lateEntries ?? "", formatPercent(r.avgAttendancePercent)]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers,...mapped].map(e=>e.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = encodeURI(csvContent);
    a.download = `attendance_${reportKind}_overall.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // helper: load an image from public path and return a data URL
  async function loadImageDataUrl(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load image: ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function exportPDF() {
    if (!rows.length) return;
    try {
      const orientation = reportKind === "student" ? "landscape" : "portrait";
      const doc = new jsPDF({ orientation, unit: "pt", format: "A4" });

      const brand = [52, 152, 219];
      const gray = [90, 99, 110];

      const titleMap = {
        student: "Student Attendance Report (Overall)",
        teacher: "Teacher Attendance Compliance Report (Overall)",
        monthly: "Monthly Attendance Summary"
      };

      // Try to load logo from public folder. If it fails, continue without logo.
      let logoDataUrl = null;
      try {
        // public files are typically served at the root path
        logoDataUrl = await loadImageDataUrl('/aics_logo.png');
      } catch (err) {
        // couldn't load logo, proceed without it
        console.warn('Could not load logo for PDF export:', err);
      }

      // Header layout defaults
      const titleX = 40;
      let titleY = 48;
      const logoTop = 16;
      let lineY = 78;

      if (logoDataUrl) {
        // create image element to read natural sizes
        const imgEl = new Image();
        await new Promise((resolve, reject) => {
          imgEl.onload = resolve;
          imgEl.onerror = reject;
          imgEl.src = logoDataUrl;
        });
        // desired width in points
        const imgWidth = 60;
        const ratio = imgEl.naturalWidth ? (imgEl.naturalHeight / imgEl.naturalWidth) : 1;
        const imgHeight = imgWidth * ratio;

        // place logo on the right side, respecting right margin (40)
        const pageWidth = doc.internal.pageSize.getWidth();
        const imgX = pageWidth - 40 - imgWidth;
        doc.addImage(logoDataUrl, 'PNG', imgX, logoTop, imgWidth, imgHeight);

        // ensure the header line sits below both title and logo
        titleY = 48;
        lineY = Math.max(titleY + 30, logoTop + imgHeight + 8);
      }

      const title = titleMap[reportKind] || "Attendance Report";
      const subline =
        reportKind === "monthly" && meta?.month
          ? `Month: ${meta.month} • Generated: ${new Date().toLocaleString()}`
          : `Generated: ${new Date().toLocaleString()}`;

      doc.setTextColor(0,0,0);
      doc.setFont("helvetica","bold");
      doc.setFontSize(18);
      doc.text(title, titleX, titleY);

      doc.setFont("helvetica","normal");
      doc.setTextColor(...gray);
      doc.setFontSize(11);
      doc.text(subline, titleX, titleY + 20);

      doc.setDrawColor(...brand);
      doc.setLineWidth(2);
      doc.line(40, lineY, doc.internal.pageSize.getWidth() - 40, lineY);

      let columns = [];
      let data = [];

      if (reportKind === "student") {
        columns = ["#", "Student Name", "Grade & Section", "Total Classes", "Total Days", "Present", "Absent", "Late", "Attendance %"];
        data = rows.map((r,i)=>[
          i+1, r.studentName, r.gradeSection, r.totalClasses ?? "", r.totalDays ?? "", r.present ?? "", r.absent ?? "", r.late ?? "", formatPercent(computeAdjustedStudentPercent(r))
        ]);
      } else if (reportKind === "teacher") {
        columns = ["#", "Teacher Name", "Attendance Submitted", "Missed Days", "Submission Rate"];
        data = rows.map((r,i)=>[
          i+1, r.teacherName, r.attendanceSubmitted, r.missedDays, formatPercent(r.submissionRate)
        ]);
      } else {
        // Monthly: include Total Classes
        columns = ["#", "Month", "Total Classes", "Total Days", "Total Presents", "Total Absences", "Late Entries", "Avg Attendance %"];
        data = rows.map((r,i)=>[
          i+1, r.month, r.totalClasses ?? "", r.totalDays ?? "", r.totalPresents ?? "", r.totalAbsences ?? "", r.lateEntries ?? "", formatPercent(r.avgAttendancePercent)
        ]);
      }

      if (typeof autoTable !== "function") {
        throw new Error("autoTable is not a function. Check jspdf-autotable installation.");
      }

      autoTable(doc, {
        startY: lineY + 18,
        head: [columns],
        body: data,
        styles: {
          font: "helvetica",
          fontSize: 10,
          textColor: [30,33,36],
          cellPadding: 6,
          lineColor: [235,238,241],
          lineWidth: 0.5
        },
        headStyles: {
          fillColor: brand,
          textColor: 255,
          fontStyle: "bold"
        },
        alternateRowStyles: { fillColor: [245,250,255] },
        columnStyles: (() => {
          const cs = { 0: { halign: "right", cellWidth: 30 } };
          if (reportKind === "student") {
            // indices: 3..8 are numeric in the student table (Total Classes, Total Days, Present, Absent, Late, Attendance %)
            cs[3] = cs[4] = cs[5] = cs[6] = cs[7] = cs[8] = { halign: "right" };
          } else if (reportKind === "teacher") {
            cs[3] = cs[4] = cs[5] = { halign: "right" };
          } else {
            // monthly: indices 2..7 numeric (Total Classes, Total Days, Total Presents, Total Absences, Late Entries, Avg %)
            cs[2] = { halign: "right" };
            cs[3] = { halign: "right" };
            cs[4] = { halign: "right" };
            cs[5] = { halign: "right" };
            cs[6] = { halign: "right" };
            cs[7] = { halign: "right" };
          }
          return cs;
        })(),
        margin: { top: 90, left: 40, right: 40, bottom: 40 },
        didDrawPage: () => {
          const pageWidth = doc.internal.pageSize.getWidth();
          doc.setDrawColor(...brand);
          doc.setLineWidth(2);
          doc.line(40, lineY, pageWidth - 40, lineY);
        }
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let p=1; p<=pageCount; p++) {
        doc.setPage(p);
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        doc.setFontSize(9);
        doc.setTextColor(...gray);
        doc.text(`Page ${p} of ${pageCount}`, pw - 40, ph - 20, { align: "right" });
      }

      doc.save(`attendance_${reportKind}_overall.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed: " + (err?.message || err));
    }
  }

  return (
    <AdminLayout title="Reports">
      <div className="bg-white shadow-md rounded-lg p-6 text-black">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Filters */}
          <div className="space-y-4">
            <h3 className="font-medium">Filters</h3>
            <div className="flex gap-2">
              <button onClick={()=>setReportKind('student')} className={`px-3 py-1 rounded ${reportKind==='student'?'bg-blue-600 text-white':'bg-gray-100'}`}>Student</button>
              <button onClick={()=>setReportKind('teacher')} className={`px-3 py-1 rounded ${reportKind==='teacher'?'bg-blue-600 text-white':'bg-gray-100'}`}>Teacher</button>
              <button onClick={()=>setReportKind('monthly')} className={`px-3 py-1 rounded ${reportKind==='monthly'?'bg-blue-600 text-white':'bg-gray-100'}`}>Monthly</button>
            </div>

            {reportKind === 'monthly' && (
              <div>
                <label className="block text-sm mb-1">Month (optional)</label>
                <input
                  type="month"
                  value={month}
                  onChange={e=>setMonth(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to aggregate all months.</p>
              </div>
            )}

            {reportKind === 'student' && (
              <div>
                <label className="block text-sm mb-1">Student Search</label>
                <input
                  value={studentQuery}
                  onChange={e=>setStudentQuery(e.target.value)}
                  placeholder="Student name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3498db]"
                />
                {studentQuery.trim().length >= 2 && (
                  <div className="mt-1 max-h-44 overflow-y-auto border rounded">
                    {studentOptions.map(opt=>(
                      <button
                        key={opt.id}
                        type="button"
                        onClick={()=> pickStudent(opt)}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {opt.name}
                      </button>
                    ))}
                    {!studentOptions.length && <div className="px-3 py-2 text-xs text-gray-500">No results</div>}
                  </div>
                )}
                {selectedStudentName && (
                  <div className="text-xs text-gray-600 mt-1">Selected: {selectedStudentName}</div>
                )}
              </div>
            )}

            {reportKind === 'teacher' && (
              <div>
                <label className="block text-sm mb-1">Teacher Search</label>
                <input
                  value={teacherQuery}
                  onChange={e=>setTeacherQuery(e.target.value)}
                  placeholder="Teacher Name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3498db]"
                />
                {teacherQuery.trim().length >= 2 && (
                  <div className="mt-1 max-h-44 overflow-y-auto border rounded">
                    {teacherOptions.map(opt=>(
                      <button
                        key={opt.id}
                        type="button"
                        onClick={()=> pickTeacher(opt)}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {opt.name}
                      </button>
                    ))}
                    {!teacherOptions.length && <div className="px-3 py-2 text-xs text-gray-500">No results</div>}
                  </div>
                )}
                {selectedTeacherName && (
                  <div className="text-xs text-gray-600 mt-1">Selected: {selectedTeacherName}</div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="font-medium">Description</h3>
            <div className="text-sm bg-gray-50 rounded-lg p-3 border">
              {reportKind==='student' && <p>Overall Student Attendance (all sessions). Select a student to narrow.</p>}
              {reportKind==='teacher' && <p>Overview of each teacher’s attendance reporting and submission rate.</p>}
              {reportKind==='monthly' && <p>Monthly Summary: aggregated by month. Choose a month or leave empty for all months.</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="font-medium">Actions</h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 items-center">
                <button onClick={exportPDF} disabled={!hasData} className="flex items-center gap-2 bg-[#3498db] hover:bg-[#2f89ca] text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50">
                  <Download size={16}/> Export PDF
                </button>
                <button onClick={exportCSV} disabled={!hasData} className="flex items-center gap-2 bg-[#3498db] hover:bg-[#2f89ca] text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50">
                  <Download size={16}/> Export CSV
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchReport} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">
                  {loading ? 'Generating...' : 'Generate'}
                </button>
                <button onClick={clearReport} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">Clear</button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 bg-gray-50 border border-dashed p-4 rounded">
          <h4 className="font-medium mb-2">Preview</h4>
          {!rows.length && !loading && !error && <p>No report generated yet.</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {loading && <p className="text-sm text-gray-600">Processing...</p>}
          {rows.length>0 && !loading && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-blue-50 text-left text-gray-700">
                    {reportKind==='student' && <>
                      <Th>#</Th><Th>Student Name</Th><Th>Grade & Section</Th><Th>Total Classes</Th><Th>Total Days</Th><Th>Present</Th><Th>Absent</Th><Th>Late</Th><Th>Attendance %</Th>
                    </>}
                    {reportKind==='teacher' && <>
                      <Th>#</Th><Th>Teacher Name</Th><Th>Attendance Submitted</Th><Th>Missed Days</Th><Th>Submission Rate %</Th>
                    </>}
                    {reportKind==='monthly' && <>
                      <Th>#</Th><Th>Month</Th><Th>Total Classes</Th><Th>Total Days</Th><Th>Total Presents</Th><Th>Total Absences</Th><Th>Late Entries</Th><Th>Avg Attendance %</Th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx)=>{
                    const alt = idx%2===0?'bg-white':'bg-gray-50';
                    if (reportKind==='student') return (
                      <tr key={r.studentId||idx} className={`${alt} hover:bg-blue-50`}>
                        <Td>{idx+1}</Td><Td>{r.studentName}</Td><Td>{r.gradeSection}</Td>
                        <Td className="text-gray-700">{r.totalClasses ?? "—"}</Td><Td>{r.totalDays}</Td><Td className="text-green-700">{r.present}</Td>
                        <Td className="text-gray-600">{r.absent}</Td><Td className="text-orange-600">{r.late}</Td>
                        <Td>{formatPercent(computeAdjustedStudentPercent(r))}</Td>
                      </tr>
                    );
                    if (reportKind==='teacher') return (
                      <tr key={r.teacherId||idx} className={`${alt} hover:bg-blue-50`}>
                        <Td>{idx+1}</Td><Td>{r.teacherName}</Td>
                        <Td className="text-green-700">{r.attendanceSubmitted}</Td>
                        <Td className="text-gray-600">{r.missedDays}</Td>
                        <Td>{formatPercent(r.submissionRate)}</Td>
                      </tr>
                    );
                    return (
                      <tr key={r.month||idx} className={`${alt} hover:bg-blue-50`}>
                        <Td>{idx+1}</Td><Td>{r.month}</Td><Td className="text-gray-700">{r.totalClasses ?? "—"}</Td><Td>{r.totalDays}</Td>
                        <Td className="text-green-700">{r.totalPresents}</Td>
                        <Td className="text-gray-600">{r.totalAbsences}</Td>
                        <Td className="text-orange-600">{r.lateEntries}</Td>
                        <Td className="text-green-700">{formatPercent(r.avgAttendancePercent)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {meta && <p className="text-xs text-gray-500 mt-3">Scope: {meta.scope || 'overall'} {meta.month? `| Month: ${meta.month}`:''} | Rows: {rows.length}</p>}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function Th({children}) {
  return <th className="px-4 py-2 text-xs font-semibold tracking-wide text-black">{children}</th>;
}
function Td({children,className=""}) {
  return <td className={`px-4 py-2 text-xs text-black ${className}`}>{children}</td>;
}