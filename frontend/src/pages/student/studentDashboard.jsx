import { useState, useEffect } from "react";
import AttendanceTable from "../../components/AttendanceTable";
import CardBox from "../../components/CardBox";

export default function Dashboard() {
  const studentId = "20200044"; // replace with dynamic user ID if needed

  // State for attendance and student info
  const [attendance, setAttendance] = useState([]);
  const [student, setStudent] = useState({
    first_name: "",
    last_name: "",
    id: studentId,
    section: "",
  });

  // Fetch attendance data
  useEffect(() => {
    fetch(`http://localhost:5000/api/attendance/${studentId}`)
      .then((res) => res.json())
      .then((data) => setAttendance(data))
      .catch((err) => console.error(err));
  }, [studentId]);

  // Fetch student info
  useEffect(() => {
    fetch(`http://localhost:5000/api/student/${studentId}`)
      .then((res) => res.json())
      .then((data) =>
        setStudent({
          first_name: data.first_name,
          last_name: data.last_name,
          id: data.id,
          section: data.section,
        })
      )
      .catch((err) => console.error(err));
  }, [studentId]);

  // Calculate summaries
  const presentDays = attendance.filter((a) => a.status === "present").length;
  const absentDays = attendance.filter((a) => a.status === "absent").length;

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
              <h2 className="font-bold text-xl text-black">
                Name: {student.first_name} {student.last_name}
              </h2>
              <p className="text-sm text-black">Student ID: {student.id}</p>
              <p className="text-sm text-black">{student.section}</p>
            </div>
          </div>

          <CardBox title="Present Days" value={presentDays} subtitle="This Month" />
          <CardBox title="Absent Days" value={absentDays} subtitle="All Time" />
        </div>

        {/* Attendance status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 w-full">
          <CardBox title="Present" value="✔️" subtitle="This Month" />
          <CardBox title="Total Absences" value={absentDays} subtitle="All Time" />
        </div>

        {/* Attendance table */}
        <div className="mb-6 w-full">
          <AttendanceTable data={attendance} />
        </div>

        {/* Warning */}
        {absentDays >= 4 && (
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded border border-yellow-400 w-full">
            ⚠️ You currently have {absentDays} absences. Parents will be notified after 1 more absence.
          </div>
        )}
      </div>
    </div>
  );
}
