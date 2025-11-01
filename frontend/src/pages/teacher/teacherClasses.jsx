import { useState } from "react";
import TeacherLayout from "../../components/teacherLayout";
import { Plus } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import Swal from "sweetalert2";

import ClassCard from "./components/ClassCard";
import ClassModal from "./components/ClassModal";
import PostComposer from "./components/PostComposer";
import PostsList from "./components/PostsList";
import PeopleTab from "./components/PeopleTab";
import PreviewModal from "./components/PreviewModal";

import useClasses from "./components/hooks/useClasses";
import usePosts from "./components/hooks/usePosts";
import useStudents from "./components/hooks/useStudents";

/**
 * Concise CurrentClasses page that delegates logic into hooks/components.
 * Behavior and UI identical to your original file.
 */
export default function CurrentClasses() {
  const teacherId = auth.currentUser?.uid;
  const [selectedClass, setSelectedClass] = useState(null);
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [preview, setPreview] = useState(null);

  const {
    classes,
    studentCounts,
    classForm,
    setClassForm,
    showModal,
    setShowModal,
    showDaysDropdown,
    setShowDaysDropdown,
    isEditMode,
    loading,
    handleSaveClass,
    handleDeleteClass,
    handleEditClass,
    handleCopyLink,
    setIsEditMode,
    setClasses,
  } = useClasses(teacherId);

  const { posts, refreshPosts, addPostToState } = usePosts(teacherId, selectedClass);
  const { students, refreshStudents } = useStudents(teacherId, selectedClass);

  // When opening modal from Add Class button we still check profile like before.
  const onAddClassClick = async () => {
    const teacherIdLocal = auth.currentUser?.uid;
    if (!teacherIdLocal) return;

    try {
      const teacherDoc = await getDoc(doc(db, "teachers", teacherIdLocal));
      if (!teacherDoc.exists()) {
        Swal.fire({
          icon: "error",
          title: "Profile Not Found",
          text: "Your teacher record was not found in the system.",
          confirmButtonColor: "#3498db",
        });
        return;
      }

      const teacherData = teacherDoc.data();
      const hasProfilePic = !!teacherData.profilePicBinary;

      if (!hasProfilePic) {
        Swal.fire({
          icon: "warning",
          title: "Profile Picture Required",
          html: `
            <p>You must upload a profile picture first before creating a class.</p>
            <p style="margin-top:6px;">Go to <b>Settings → Profile</b> to upload your picture.</p>
          `,
          showCancelButton: true,
          confirmButtonText: "Upload Now",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#3498db",
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/teacher/settings";
          }
        });
        return;
      }

      setClassForm({
        id: null,
        subject: "",
        room: "",
        section: "",
        gradeLevel: "",
        days: [],
        startTime: "",
        endTime: "",
      });
      setIsEditMode(false);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to check profile picture.",
        confirmButtonColor: "#3498db",
      });
    }
  };

  // keep refresh helpers available (e.g., when class is selected)
  const onViewClass = (cls) => {
    setActiveTab("posts");
    setPreview(null);
    setDropdownOpenId(null);
    setClasses((prev) => prev); // no-op but keeps parity
    setPreview(null);
    setSelectedClass(cls);
    // refresh posts and students for the selected class
    refreshPosts();
    refreshStudents();
  };

  // Short render: all heavy lifting is in hooks/components
  if (selectedClass) {
    return (
      <TeacherLayout title={`${selectedClass.subjectName} - ${selectedClass.section}`}>
        <div className="min-h-screen bg-gray-50 p-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#3498db]">
                {selectedClass.subjectName} - {selectedClass.section}
              </h1>
              <p className="text-gray-500 text-sm">
                Grade {selectedClass.gradeLevel} | {selectedClass.days} | {selectedClass.time} |{" "}
                {selectedClass.roomNumber}
              </p>
            </div>
            <button
              onClick={() => setSelectedClass(null)}
              className="px-5 py-2 bg-gray-200 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-300 transition"
            >
              Back to Classes
            </button>
          </div>

          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-4">
              <button
                onClick={() => setActiveTab("posts")}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "posts"
                    ? "border-b-2 border-[#3498db] text-[#3498db]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab("people")}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "people"
                    ? "border-b-2 border-[#3498db] text-[#3498db]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                People
              </button>
            </nav>
          </div>

          {activeTab === "posts" ? (
            <>
              <PostComposer
                teacherId={teacherId}
                selectedClass={selectedClass}
                onPostAdded={(p) => {
                  addPostToState(p);
                }}
              />
              <div className="space-y-5 mt-4">
                <PostsList posts={posts} setPreview={setPreview} />
              </div>
            </>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <PeopleTab students={students} />
            </div>
          )}
        </div>

        <PreviewModal preview={preview} setPreview={setPreview} />
      </TeacherLayout>
    );
  }

  // default view
  return (
    <TeacherLayout title="Current Classes">
      <div className="min-h-screen bg-gray-50 p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Current Classes</h1>
            <p className="text-gray-500 text-sm">Manage your active classes and view enrolled students.</p>
          </div>

          <button
            onClick={onAddClassClick}
            className="flex items-center gap-2 px-5 py-2 bg-[#3498db] text-white rounded-lg text-sm font-medium hover:bg-[#2f89ca] transition"
          >
            <Plus size={18} /> Add Class
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {classes.length === 0 ? (
            <p className="text-gray-400 text-center col-span-full">No classes yet.</p>
          ) : (
            classes.map((cls) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                studentCount={studentCounts[cls.id] ?? 0}
                dropdownOpenId={dropdownOpenId}
                setDropdownOpenId={setDropdownOpenId}
                handleEditClass={handleEditClass}
                handleDeleteClass={handleDeleteClass}
                handleCopyLink={handleCopyLink}
                setSelectedClass={onViewClass}
              />
            ))
          )}
        </div>
      </div>

      {showModal && (
        <ClassModal
          showModal={showModal}
          setShowModal={setShowModal}
          classForm={classForm}
          setClassForm={setClassForm}
          showDaysDropdown={showDaysDropdown}
          setShowDaysDropdown={setShowDaysDropdown}
          handleSaveClass={handleSaveClass}
          isEditMode={isEditMode}
          loading={loading}
        />
      )}
    </TeacherLayout>
  );
}