import React, { useState } from "react";
import StudentPostsList from "../StudentPostsList";
import PreviewModal from "../PreviewModal";

/**
 * ClassDetail
 * Props: selectedClass, posts, teachers, onBack
 * Renders the selected class header and posts using the same design/preview logic as teacher side.
 */
export default function ClassDetail({ selectedClass, posts, teachers, onBack }) {
  const [preview, setPreview] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#3498db]">
            {selectedClass.subjectName} - {selectedClass.section}
          </h1>
          <p className="text-gray-500 text-sm">
            {selectedClass.days} | {selectedClass.time} | {selectedClass.roomNumber}
          </p>
          <p className="text-gray-600 text-sm">
            <strong>Grade Level:</strong> {selectedClass.gradeLevel || "N/A"}
          </p>
          <p className="text-gray-600 text-sm">
            <strong>Teacher:</strong> {teachers[selectedClass.teacherId] || "Loading..."}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-5 py-2 bg-gray-200 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-300 transition"
        >
          Back to Classes
        </button>
      </div>

      {posts.length > 0 ? (
        <div className="space-y-5">
          <StudentPostsList posts={posts} setPreview={setPreview} />
        </div>
      ) : (
        <p className="text-gray-400 text-center">No posts yet.</p>
      )}

      <PreviewModal preview={preview} setPreview={setPreview} />
    </div>
  );
}