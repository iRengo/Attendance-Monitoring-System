import { useMemo, useState } from "react";
import AdminLayout from "../../components/adminLayout";
import { Download, Search } from "lucide-react";

const MOCK_DATA = [
    { id: 1, name: "Juan Dela Cruz", subject: "Math", teacher: "Juan Dela Cruz", role: "student", timeIn: "08:00", timeOut: "12:00", status: "Present" },
    { id: 2, name: "Maria Santos", subject: "Science", teacher: "Maria Santos", role: "student", timeIn: "", timeOut: "", status: "Absent" },
    { id: 3, name: "Pedro Reyes", subject: "English", teacher: "Pedro Reyes", role: "student", timeIn: "08:15", timeOut: "12:00", status: "Late" },
    { id: 4, name: "Anna Mendoza", subject: "History", teacher: "Anna Mendoza", role: "student", timeIn: "08:00", timeOut: "12:00", status: "Present" },
    { id: 5, name: "Mark Villanueva", subject: "PE", teacher: "Mark Villanueva", role: "student", timeIn: "08:00", timeOut: "12:00", status: "Present" },
    { id: 6, name: "Sofia Lopez", subject: "Art", teacher: "Sofia Lopez", role: "student", timeIn: "", timeOut: "", status: "Absent" },
    { id: 7, name: "Carlo Fernandez", subject: "Music", teacher: "Carlo Fernandez", role: "student", timeIn: "08:20", timeOut: "12:00", status: "Late" },
    { id: 8, name: "Angela Ramos", subject: "Math", teacher: "Angela Ramos", role: "student", timeIn: "08:00", timeOut: "12:00", status: "Present" },
    { id: 9, name: "Daniel Cruz", subject: "Science", teacher: "Daniel Cruz", role: "student", timeIn: "", timeOut: "", status: "Absent" },
    { id: 10, name: "Jasmine Bautista", subject: "English", teacher: "Jasmine Bautista", role: "student", timeIn: "08:00", timeOut: "12:00", status: "Present" },
    { id: 11, name: "Mr. Ramos", nameDisplay: "Mr. Ramos (Teacher)", subject: "Math", teacher: "Mr. Ramos", role: "teacher", timeIn: "08:00", timeOut: "16:00", status: "Present" },
    { id: 12, name: "Ms. Lopez", nameDisplay: "Ms. Lopez (Teacher)", subject: "Science", teacher: "Ms. Lopez", role: "teacher", timeIn: "08:05", timeOut: "16:00", status: "Present" }
];

export default function adminAttendance() {
    const [filterRole, setFilterRole] = useState("all");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    // filter and search
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return MOCK_DATA.filter((r) => {
            if (filterRole !== "all" && r.role !== filterRole) return false;
            if (!q) return true;
            // search by name or id
            if (String(r.id).includes(q)) return true;
            if ((r.name || "").toLowerCase().includes(q)) return true;
            if ((r.nameDisplay || "").toLowerCase().includes(q)) return true;
            return false;
        });
    }, [filterRole, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageData = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, page]);

    function goTo(newPage) {
        if (newPage < 1) newPage = 1;
        if (newPage > totalPages) newPage = totalPages;
        setPage(newPage);
    }

    // Export filtered data to CSV
    function exportToCSV() {
        const headers = ["ID", "Name", "Subject", "Teacher", "Time In", "Time Out", "Status"];
        const rows = filtered.map(r => [r.id, r.nameDisplay || r.name, r.subject, r.teacher, r.timeIn || '-', r.timeOut || '-', r.status]);

        let csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Records.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
            <AdminLayout title="Attendance Records">
                <div className="bg-white shadow-md rounded-lg p-4">

                    {/* Filters + Search + Export */}
                            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-2">
                                        <button onClick={() => { setFilterRole('all'); setPage(1); }} className={`px-4 py-1 rounded ${filterRole === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>All</button>
                                        <button onClick={() => { setFilterRole('student'); setPage(1); }} className={`px-4 py-1 rounded ${filterRole === 'student' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>Students</button>
                                        <button onClick={() => { setFilterRole('teacher'); setPage(1); }} className={`px-4 py-1 rounded ${filterRole === 'teacher' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>Teachers</button>
                                    </div>

                                                <div className="relative w-full sm:w-72 ml-2">
                                                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search by name or ID..."
                                                        value={query}
                                                        onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                                                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] bg-white text-gray-700 placeholder-gray-500 shadow-sm"
                                                    />
                                                </div>
                                </div>

                                            <div>
                                                <button onClick={exportToCSV} className="flex items-center gap-2 bg-[#3498db] hover:bg-[#2f89ca] text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition">
                                                    <Download size={18} /> Export as CSV
                                                </button>
                                            </div>
                            </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse rounded-lg overflow-hidden">
                            <thead>
                                <tr className="bg-blue-50 text-left text-gray-700">
                                    <th className="px-6 py-3 text-sm font-semibold text-black">Student Name</th>
                                    <th className="px-6 py-3 text-sm font-semibold text-black">Subject</th>
                                    <th className="px-6 py-3 text-sm font-semibold text-black">Teacher</th>
                                    <th className="px-6 py-3 text-sm font-semibold text-black">Time In/Time Out</th>
                                    <th className="px-6 py-3 text-sm font-semibold text-black">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-3 text-center text-gray-500">No records found</td>
                                    </tr>
                                ) : (
                                    pageData.map((row, idx) => (
                                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                            <td className="px-6 py-3 text-sm text-black">{row.nameDisplay || row.name}</td>
                                            <td className="px-6 py-3 text-sm text-black">{row.subject}</td>
                                            <td className="px-6 py-3 text-sm text-black">{row.teacher}</td>
                                            <td className="px-6 py-3 text-sm text-black">{row.timeIn || '-'} / {row.timeOut || '-'}</td>
                                            <td className="px-6 py-3 text-sm" style={{ color: row.status === 'Present' ? '#2a9d8f' : row.status === 'Late' ? '#e76f51' : '#6c757d' }}>{row.status}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                        <div>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)} - {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</div>

                        <div className="flex items-center gap-2">
                            <button onClick={() => goTo(page - 1)} disabled={page <= 1} className="px-3 py-1 rounded bg-gray-100">Prev</button>
                            <div className="flex gap-2">
                                {Array.from({ length: totalPages }).map((_, i) => {
                                    const p = i + 1;
                                    return (
                                        <button key={p} onClick={() => goTo(p)} className={`px-3 py-1 rounded ${p === page ? 'bg-gray-300' : 'bg-white'}`}>{p}</button>
                                    );
                                })}
                            </div>
                            <button onClick={() => goTo(page + 1)} disabled={page >= totalPages} className="px-3 py-1 rounded bg-gray-100">Next</button>
                        </div>
                    </div>
                </div>
            </AdminLayout>
    );
}