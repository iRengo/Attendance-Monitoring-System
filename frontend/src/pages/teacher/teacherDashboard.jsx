import { useState } from "react";
import TeacherLayout from "../../components/teacherLayout";
import AttendanceOverview from "./components/teacherDashboard/AttendanceOverview";
import SummaryCards from "./components/teacherDashboard/SummaryCards";  
import IncomingClassCard from "./components/teacherDashboard/IncomingClassCard";  
import AbsentStudentsModal from "./components/teacherDashboard/AbsentStudentsModal";  
import useDashboardData from "./components/teacherDashboard/hooks/useDashboardData";
import useStudentNames from "./components/teacherDashboard/hooks/useStudentNames";  

export default function TeacherDashboard() {
  const {
    loading,
    totalClasses,
    totalStudents,
    totalSubjects,
    incomingClass,
    attendanceData,
    attendanceLoading,
    absentMap,
  } = useDashboardData();

  const { getStudentNames } = useStudentNames();

  // Modal state
  const [selectedDay, setSelectedDay] = useState(null);
  const [absentStudentsForDay, setAbsentStudentsForDay] = useState([]); // { studentId, name, section }
  const [absentLoading, setAbsentLoading] = useState(false);

  const handleDayAbsentClick = async (dayShort) => {
    setSelectedDay(dayShort);
    setAbsentLoading(true);
    try {
      const idsSet = absentMap?.[dayShort];
      if (!idsSet || idsSet.size === 0) {
        setAbsentStudentsForDay([]);
        return;
      }
      const ids = Array.from(idsSet);
      const resolved = await getStudentNames(ids);
      setAbsentStudentsForDay(resolved);
    } finally {
      setAbsentLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedDay(null);
    setAbsentStudentsForDay([]);
  };

  return (
    <TeacherLayout title="Dashboard">
      <div className="p-6 space-y-8">
        <h1 className="text-3xl font-semibold text-gray-800">Welcome, Teacher!</h1>

        <SummaryCards
          loading={loading}
          totalClasses={totalClasses}
          totalStudents={totalStudents}
          totalSubjects={totalSubjects}
        />

        <div className="flex flex-col md:flex-row gap-6">
          <AttendanceOverview
            data={attendanceData}
            loading={attendanceLoading}
            onAbsentBarClick={handleDayAbsentClick}
          />

          <IncomingClassCard incomingClass={incomingClass} />
        </div>
      </div>

      <AbsentStudentsModal
        open={!!selectedDay}
        dayLabel={selectedDay}
        loading={absentLoading}
        students={absentStudentsForDay}
        onClose={closeModal}
      />
    </TeacherLayout>
  );
}