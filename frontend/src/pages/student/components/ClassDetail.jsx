import React from "react";

/**
 * ClassDetail
 * Props: selectedClass, posts, teachers, onBack
 * Renders the selected class header and posts similar to original file.
 */
export default function ClassDetail({ selectedClass, posts, teachers, onBack }) {
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
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-5"
            >
              <p className="text-gray-800 mb-2">{post.content}</p>
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt="Post"
                  className="rounded-lg w-full max-h-80 object-cover mb-2"
                />
              )}
              {post.fileUrl && (
                <a
                  href={post.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3498db] text-sm underline flex items-center gap-1"
                >
                  📎 Attached File
                </a>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {post.timestamp ? new Date(post.timestamp).toLocaleString() : ""}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-center">No posts yet.</p>
      )}
    </div>
  );
}