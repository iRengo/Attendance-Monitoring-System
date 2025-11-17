import StudentLayout from "../../components/studentLayout";
import logoImage from "../../../public/aics_logo.png";

import useStudentDashboardData from "./components/studentDashboard/hooks/useStudentDashboardData";
import {
  AttendanceCards,
  AnnouncementsPanel,
  ScheduleTable,
  DownloadScheduleButton,
  SectionBadge,
} from "./components/studentDashboard";
import { exportSchedulePDF } from "./components/studentDashboard/utils/pdfScheduleExport";
import { buildSectionKey } from "./components/studentDashboard/utils/scheduleHelpers";

export default function StudentDashboard() {
  const {
    studentId,
    attendance,
    announcements,
    schedules,
    computedKey,
    fetchStudentData,
  } = useStudentDashboardData();

  const handleExportPDF = async () => {
    if (!studentId) return;
    const studentData = await fetchStudentData();
    if (!studentData) return;
    exportSchedulePDF({
      studentData,
      schedules,
      logoImage,
      buildSectionKey,
    });
  };

  return (
    <StudentLayout title="Dashboard">
      <div className="p-6 space-y-6">

        <AttendanceCards attendance={attendance} />

        <AnnouncementsPanel announcements={announcements} />

        <div className="bg-white shadow-sm rounded-xl p-5 overflow-x-auto space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">My Schedule</h2>
            <SectionBadge computedKey={computedKey} />
            <DownloadScheduleButton onClick={handleExportPDF} />
          </div>
          <ScheduleTable schedules={schedules} />
        </div>

      </div>
    </StudentLayout>
  );
}