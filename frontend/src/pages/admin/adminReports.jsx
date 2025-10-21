import { useState } from "react";
import { Download } from "lucide-react";
import AdminLayout from "../../components/adminLayout";

export default function adminReports() {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [scope, setScope] = useState("all"); // all | student | teacher | class
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedStudent, setSelectedStudent] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState("");
    const [reportType, setReportType] = useState("summary");
    const [format, setFormat] = useState("pdf");
    const [generatedReport, setGeneratedReport] = useState(null);

    const classes = ["Math - Room 101", "Science - Room 202", "English - Room 303"];
    const students = ["2025-001 - John Santos", "2025-002 - Maria Lopez", "2025-003 - Carlos Reyes"];
    const teachers = ["T-100 - Mr. Ramos", "T-101 - Ms. Lopez", "T-102 - Mrs. Garcia"];
    const sampleSubjects = ["Math", "Science", "English", "History", "PE"];

    function generateReport() {
        // For the UI demo we'll just create a mock report object
        const meta = {
            from: fromDate || "(not set)",
            to: toDate || "(not set)",
            scope,
            reportType,
            format,
            generatedAt: new Date().toLocaleString(),
        };

        // helper to format times
        function time(h, m) { return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }

        let rows = [];

        if (scope === 'student' && selectedStudent) {
            const [stuId, name] = selectedStudent.split(' - ');
            rows = sampleSubjects.slice(0, 4).map((subj, i) => ({
                id: stuId,
                name: name,
                subject: subj,
                teacher: teachers[i % teachers.length].split(' - ')[1],
                timeIn: time(8, 0 + i*5),
                timeOut: time(12, 0),
                status: ['Present','Absent','Late'][i % 3]
            }));
        } else if (scope === 'teacher' && selectedTeacher) {
            const teacherName = selectedTeacher.split(' - ')[1] || selectedTeacher;
            rows = Array.from({ length: 6 }).map((_, i) => ({
                id: `2025-${String(1 + i).padStart(3, '0')}`,
                name: `Student ${i+1}`,
                subject: sampleSubjects[i % sampleSubjects.length],
                teacher: teacherName,
                timeIn: time(8, 0 + i*3),
                timeOut: time(12, 0),
                status: ['Present','Absent','Late'][i % 3]
            }));
        } else if (scope === 'class' && selectedClass) {
            const teacherForClass = teachers[0].split(' - ')[1];
            rows = Array.from({ length: 8 }).map((_, i) => ({
                id: `2025-${String(i+1).padStart(3,'0')}`,
                name: `Student ${i+1}`,
                subject: selectedClass.split(' - ')[0],
                teacher: teacherForClass,
                timeIn: time(8, 0 + (i%3)*5),
                timeOut: time(12, 0),
                status: ['Present','Absent','Late'][i % 3]
            }));
        } else {
            // all: produce a more comprehensive mixed dataset across classes and teachers
            rows = [];
            const studentsPerClass = 4;
            classes.forEach((cls, ci) => {
                const clsSubject = cls.split(' - ')[0];
                const clsTeacher = teachers[ci % teachers.length].split(' - ')[1];
                for (let s = 0; s < studentsPerClass; s++) {
                    const idx = rows.length + 1;
                    rows.push({
                        id: `C${ci+1}-S${s+1}`,
                        name: `Student ${idx}`,
                        subject: clsSubject,
                        teacher: clsTeacher,
                        timeIn: time(8, 0 + (s%3)*5),
                        timeOut: time(12, 0),
                        status: ['Present','Absent','Late'][idx % 3]
                    });
                }
            });
        }

        setGeneratedReport({ meta, rows });
    }

    function downloadReport(fmt) {
        const useFmt = fmt || format;
        if (!generatedReport) return;

        if (useFmt === 'csv') {
            // export only the preview columns shown in the table: ID, Name, Status
            const headers = ["ID", "Name", "Status"];
            const rows = generatedReport.rows.map(r => [r.id, r.name, r.status]);
            const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Attendance_Report.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        if (useFmt === 'pdf') {
            const lines = [];
            lines.push(`Report generated at: ${generatedReport.meta.generatedAt}`);
            lines.push(`Type: ${generatedReport.meta.reportType}`);
            lines.push('\nRows:');
            generatedReport.rows.forEach(r => {
                lines.push(`${r.id}. ${r.name} - ${r.status}`);
            });

            const blob = new Blob([lines.join("\n")], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Attendance_Report.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }
    }

    return (
        <AdminLayout title="Reports">
            <div className="bg-white shadow-md rounded-lg p-6 text-black">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Filters */}
                    <div className="space-y-3">
                        <h3 className="font-medium">Filters</h3>
                        <label className="block text-sm">Date range</label>
                        <div className="flex gap-2">
                            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] bg-white text-gray-700" />
                            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] bg-white text-gray-700" />
                        </div>

                            <div>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setScope('all')} className={`px-3 py-1 rounded ${scope === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>All</button>
                                <button onClick={() => setScope('student')} className={`px-3 py-1 rounded ${scope === 'student' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Student</button>
                                <button onClick={() => setScope('teacher')} className={`px-3 py-1 rounded ${scope === 'teacher' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Teacher</button>
                                <button onClick={() => setScope('class')} className={`px-3 py-1 rounded ${scope === 'class' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Class</button>
                            </div>

                            {scope === 'class' && (
                                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="mt-2 border px-2 py-1 rounded w-full">
                                    <option value="">Select class</option>
                                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            )}

                            {scope === 'student' && (
                                <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="mt-2 border px-2 py-1 rounded w-full">
                                    <option value="">Select student</option>
                                    {students.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            )}
                            {scope === 'teacher' && (
                                <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} className="mt-2 border px-2 py-1 rounded w-full">
                                    <option value="">Select teacher</option>
                                    {teachers.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Middle: Report Types */}
                    <div className="space-y-3">
                        <h3 className="font-medium">Types of reports</h3>
                        <div className="flex flex-col gap-2 border border-gray-300 rounded-lg p-3 bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#3498db]">
                            <label className={`p-3 rounded ${reportType === 'summary' ? 'bg-blue-50 border-blue-200' : ''}`}>
                                <input type="radio" name="report" checked={reportType === 'summary'} onChange={() => setReportType('summary')} /> <span className="ml-2">Attendance summary per class</span>
                            </label>
                            <label className={`p-3 rounded ${reportType === 'individual' ? 'bg-blue-50 border-blue-200' : ''}`}>
                                <input type="radio" name="report" checked={reportType === 'individual'} onChange={() => setReportType('individual')} /> <span className="ml-2">Individual student attendance report</span>
                            </label>
                            <label className={`p-3 rounded ${reportType === 'teacher' ? 'bg-blue-50 border-blue-200' : ''}`}>
                                <input type="radio" name="report" checked={reportType === 'teacher'} onChange={() => setReportType('teacher')} /> <span className="ml-2">Teacher's class attendance report</span>
                            </label>
                            <label className={`p-3 rounded ${reportType === 'system' ? 'bg-blue-50 border-blue-200' : ''}`}>
                                <input type="radio" name="report" checked={reportType === 'system'} onChange={() => setReportType('system')} /> <span className="ml-2">System-wide monthly report</span>
                            </label>
                        </div>
                    </div>

                    {/* Right: Export options & Actions */}
                    <div className="space-y-3">
                        <h3 className="font-medium">Export options</h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2 items-center">
                                <button onClick={() => downloadReport('pdf')} disabled={!generatedReport} className="flex items-center gap-2 bg-[#3498db] hover:bg-[#2f89ca] text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition" title="Export as PDF">
                                    <Download size={16} /> Export as PDF
                                </button>
                                <button onClick={() => downloadReport('csv')} disabled={!generatedReport} className="flex items-center gap-2 bg-[#3498db] hover:bg-[#2f89ca] text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition" title="Export as CSV">
                                    <Download size={16} /> Export as CSV
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={generateReport} className="bg-green-600 text-white px-4 py-2 rounded">Generate</button>
                                <button onClick={() => setGeneratedReport(null)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">Clear</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview area */}
                        <div className="mt-6 bg-gray-50 border border-dashed p-4 rounded text-black">
                            <h4 className="font-medium mb-2">Preview</h4>
                            {!generatedReport ? (
                                <p className="">No report generated yet. Set filters and click Generate to preview a sample.</p>
                            ) : (
                                            <div>
                                                <div className="text-sm mb-3">Report generated at: {generatedReport.meta.generatedAt}</div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full border-collapse rounded-lg overflow-hidden">
                                                        <thead>
                                                            <tr className="bg-blue-50 text-left text-gray-700">
                                                                <th className="px-6 py-3 text-sm font-semibold text-black">#</th>
                                                                <th className="px-6 py-3 text-sm font-semibold text-black">Name</th>
                                                                <th className="px-6 py-3 text-sm font-semibold text-black">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {generatedReport.rows.map((r, idx) => (
                                                                <tr key={r.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                                                    <td className="px-6 py-3 text-sm text-black">{r.id}</td>
                                                                    <td className="px-6 py-3 text-sm text-black">{r.name}</td>
                                                                    <td className="px-6 py-3 text-sm" style={{ color: r.status === 'Present' ? '#2a9d8f' : r.status === 'Late' ? '#e76f51' : '#6c757d' }}>{r.status}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}