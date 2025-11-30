import { useEffect, useState } from "react";
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

  // Mobile detection (Tailwind 'sm' breakpoint = 640px)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeRemoveEventListener;
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

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
        {/* Attendance and announcements don't necessarily need different layouts,
            but they will stack naturally on mobile due to tailwind spacing */}
        <AttendanceCards attendance={attendance} />

        <AnnouncementsPanel announcements={announcements} />

        {/* Schedule container: desktop -> table (keeps original desktop dimension),
            mobile -> stacked cards (tap-friendly, readable) */}
        <div className="bg-white shadow-sm rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">My Schedule</h2>
              <SectionBadge computedKey={computedKey} />
            </div>

            <div className="flex items-center gap-3">
              <DownloadScheduleButton onClick={handleExportPDF} />
            </div>
          </div>

          {/* Desktop/Table view: keep original dimensions, allow horizontal scroll */}
          {!isMobile && (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <ScheduleTable schedules={schedules} />
              </div>
            </div>
          )}

          {/* Mobile/Card view */}
          {isMobile && (
            <div className="space-y-3">
              {(!schedules || schedules.length === 0) && (
                <div className="py-6 text-center text-sm text-gray-500">No schedule available.</div>
              )}

              {(schedules || []).map((s, idx) => {
                // Try to handle different possible field names safely
                const subject = s.subject || s.subjectName || s.course || "Untitled";
                const teacher = s.teacher || s.instructor || s.teacherName || "";
                const day = s.day || s.weekday || s.days || "";
                const start = s.startTime || s.from || s.start || "";
                const end = s.endTime || s.to || s.end || "";
                const time = start || end ? `${start || "—"}${start && end ? " — " : ""}${end || ""}` : "";
                const room = s.room || s.roomName || s.location || "";
                const section = s.section || s.sectionName || computedKey || "";

                return (
                  <div
                    key={s.id || idx}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate">
                            <div className="text-sm font-semibold text-gray-900 truncate">{subject}</div>
                            <div className="text-xs text-gray-500 truncate">{teacher}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400">{day}</div>
                            <div className="text-sm font-medium text-gray-700">{time}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                          <div className="inline-flex items-center gap-2">
                            <span className="font-medium text-gray-700">Room:</span>
                            <span className="text-gray-500">{room}</span>
                          </div>

                          {section && (
                            <div className="inline-flex items-center gap-2 ml-3">
                              <span className="font-medium text-gray-700">Section:</span>
                              <span className="text-gray-500">{section}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}