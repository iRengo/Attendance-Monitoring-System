studentAttendance
import StudentLayout from "../../components/studentLayout";

export default function studentAttendance() {
    return (
        <StudentLayout title="Attendance">
            <div className="shadow-md border border-[#d6d6d6] rounded-lg p-4 space-y-4">
      
          
                <div className="flex justify-between items-center">
  
                    <button className="flex items-center gap-2 px-3 py-1 border border-[#415CA0] text-[#415CA0] rounded">
                        <span>Filter</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M9 12h6m-3 8v-8" />
                        </svg>
                    </button>

                    <button className="flex items-center gap-1 px-2 py-0 border border-[#415CA0] text-[#415CA0] rounded">
                        <span>Export Attendance</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16V4H4zm4 8h8m-8 4h8" />
                        </svg>
                    </button>
                </div>

     
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-[#415CA0] text-sm text-[#415CA0]">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border border-[#415CA0] px-3 py-2 text-left">Date</th>
                                <th className="border border-[#415CA0] px-3 py-2 text-left">Student Name</th>
                                <th className="border border-[#415CA0] px-3 py-2 text-left">Status</th>
                                <th className="border border-[#415CA0] px-3 py-2 text-left">Time In</th>
                                <th className="border border-[#415CA0] px-3 py-2 text-left">Time Out</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-[#415CA0] px-3 py-2">Sept 26, 2025</td>
                                <td className="border border-[#415CA0] px-3 py-2">Juan Dela Cruz</td>
                                <td className="border border-[#415CA0] px-3 py-2">Present</td>
                                <td className="border border-[#415CA0] px-3 py-2">08:05 AM</td>
                                <td className="border border-[#415CA0] px-3 py-2">04:02 PM</td>
                            </tr>
                            <tr>
                                <td className="border border-[#415CA0] px-3 py-2">Sept 25, 2025</td>
                                <td className="border border-[#415CA0] px-3 py-2">Juan Dela Cruz</td>
                                <td className="border border-[#415CA0] px-3 py-2">Absent</td>
                                <td className="border border-[#415CA0] px-3 py-2">—</td>
                                <td className="border border-[#415CA0] px-3 py-2">—</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center text-sm">
                    <p className="text-[#415CA0]">Showing 10 out of 50 records</p>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 border border-[#415CA0] text-[#415CA0] rounded">Previous</button>
                        <button className="px-3 py-1 border border-[#415CA0] text-[#415CA0] rounded">Next</button>
                    </div>
                </div>
            </div>
        </StudentLayout>
    )
}