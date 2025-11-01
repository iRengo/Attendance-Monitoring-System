import React from "react";
import StudentLayout from "../../components/studentLayout";
import { Plus } from "lucide-react";
import useStudentSchedules from "./components/hooks/useStudentSchedules";
import JoinClassForm from "./components/JoinClassForm";
import ClassCard from "./components/ClassCard";
import ClassDetail from "./components/ClassDetail";
import LeaveModal from "./components/LeaveModal";

/**
 * StudentSchedules (concise)
 * All heavy logic lives in useStudentSchedules hook. UI split into small components.
 * Behavior, endpoints and UI are unchanged.
 */
export default function StudentSchedules() {
  const props = useStudentSchedules();

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
    <StudentLayout title="My Classes">
      <div className="min-h-screen bg-gray-50 p-10">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Join a Class</h2>
          <JoinClassForm
            joinLink={props.joinLink}
            setJoinLink={props.setJoinLink}
            handleJoinLink={props.handleJoinLink}
          />
        </div>

        <h2 className="text-xl text-gray-800 font-bold mb-4">My Classes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {props.classes.length === 0 ? (
            <p className="text-gray-400 text-center col-span-full">No classes yet.</p>
          ) : (
            props.classes.map((cls) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                teachers={props.teachers}
                gradeLevel={props.gradeLevel}
                dropdownOpenId={props.dropdownOpenId}
                setDropdownOpenId={props.setDropdownOpenId}
                onView={() => {
                  props.setSelectedClass(cls);
                }}
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