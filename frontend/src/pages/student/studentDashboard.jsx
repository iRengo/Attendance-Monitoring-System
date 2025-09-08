import AttendanceTable from "../../components/AttendanceTable";
import CardBox from "../../components/CardBox";

export default function Dashboard() {
  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <div className="bg-[#204EA8] text-white p-4 flex justify-between items-center">
        <h3 className="font-bold text-base md:text-lg">STUDENT ATTENDANCE PORTAL</h3>
        <button className="hover:underline">Log Out</button>
      </div>

      {/* Main content container */}
      <div className="flex-1 overflow-auto container mx-auto p-6 w-full">
        {/* Student Info + Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 w-full">
          <div className="col-span-1 flex items-center bg-white shadow rounded p-4 w-full">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center text-3xl mr-4">
              👤
            </div>
            <div>
              <h2 className="font-bold text-xl text-black">JUAN DELA CRUZ</h2>
              <p className="text-sm text-black">Student ID: 20200044</p>
              <p className="text-sm text-black">STEM - Section A</p>
            </div>
          </div>

          <CardBox title="Present Days" value="18" subtitle="This Month" />
          <CardBox title="Absent Days" value="4" subtitle="All Time" />
        </div>

        {/* Attendance status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 w-full">
          <CardBox title="Present" value="✔️" subtitle="This Month" />
          <CardBox title="Total Absences" value="📅" subtitle="All Time" />
        </div>

        {/* Attendance table */}
        <div className="mb-6 w-full">
          <AttendanceTable />
        </div>

        {/* Warning */}
        <div className="bg-yellow-100 text-yellow-800 p-4 rounded border border-yellow-400 w-full">
          ⚠️ You currently have 4 absences. Parents will be notified after 1 more absence.
        </div>
      </div>
    </div>
  );
}
