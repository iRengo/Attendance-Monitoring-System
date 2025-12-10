import React from "react";
import StudentLayout from "../../components/studentLayout";
import { Plus } from "lucide-react";
import useStudentSchedules from "./components/studentClasses/hooks/useStudentSchedules";
import JoinClassForm from "./components/studentClasses/JoinClassForm";
import ClassCard from "./components/studentClasses/ClassCard";
import ClassDetail from "./components/studentClasses/ClassDetail";
import LeaveModal from "./components/studentClasses/LeaveModal";

export default function StudentSchedules() {
  const props = useStudentSchedules();
  const activeClasses = props.classes.filter(cls => cls.stats !== "archived");
  const archivedClasses = props.classes.filter(cls => cls.stats === "archived");
  const [viewArchived, setViewArchived] = React.useState(false);

  if (props.selectedClass) {
    return (
      <StudentLayout
        title={`${props.selectedClass.subjectName} - ${props.selectedClass.section}`}
      >
        <ClassDetail
          selectedClass={props.selectedClass}
          posts={props.posts}
          teachers={props.teachers}
          onBack={() => props.setSelectedClass(null)}
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title={viewArchived ? "Archived Classes" : "My Classes"}>
      <div className="min-h-screen bg-gray-50 p-10">
        {/* Join Class Form only shows for active classes */}
        {!viewArchived && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Join a Class</h2>
            <JoinClassForm
              joinLink={props.joinLink}
              setJoinLink={props.setJoinLink}
              handleJoinLink={props.handleJoinLink}
            />
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 tracking-tight">
              {viewArchived ? "Archived Classes" : "My Classes"}
            </h2>
            <p className="text-gray-500 text-sm">
              {viewArchived
                ? "Manage your archived classes."
                : "Manage your active classes and view enrolled courses."}
            </p>
          </div>

          {archivedClasses.length > 0 && (
            <button
              onClick={() => setViewArchived(!viewArchived)}
              className="px-5 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition"
            >
              {viewArchived ? "Back to Active Classes" : "View Archived Classes"}
            </button>
          )}
        </div>

        {/* Classes grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {(!viewArchived ? activeClasses : archivedClasses).length === 0 ? (
            <p className="text-gray-400 text-center col-span-full">
              {viewArchived ? "No archived classes yet." : "No active classes yet."}
            </p>
          ) : (
            (!viewArchived ? activeClasses : archivedClasses).map((cls) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                teachers={props.teachers}
                gradeLevel={props.gradeLevel}
                dropdownOpenId={props.dropdownOpenId}
                setDropdownOpenId={props.setDropdownOpenId}
                onView={() => props.setSelectedClass(cls)}
                onRequestLeave={() =>
                  props.setLeaveModal({ open: true, classId: cls.id })
                }
              />
            ))
          )}
        </div>

        <LeaveModal
          open={props.leaveModal.open}
          onClose={() => props.setLeaveModal({ open: false, classId: null })}
          onConfirm={props.handleLeaveClass}
        />
      </div>
    </StudentLayout>
  );
}
