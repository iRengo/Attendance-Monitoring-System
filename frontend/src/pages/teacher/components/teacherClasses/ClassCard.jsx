import React from "react";
import { MoreHorizontal } from "lucide-react";

export default function ClassCard({
  cls,
  studentCount,
  dropdownOpenId,
  setDropdownOpenId,
  handleEditClass,
  handleDeleteClass,
  handleCopyLink,
  setSelectedClass,
}) {
  return (
    <div
      className="relative bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 p-6"
    >
      <div
        className="rounded-xl px-5 py-3 mb-5 text-white font-semibold text-lg shadow-sm"
        style={{ backgroundColor: "#3498db" }}
      >
        {cls.subjectName} - {cls.roomNumber}
      </div>

      <div className="mb-5 space-y-2">
        <span className="font-medium px-4 py-1.5 rounded-full text-sm shadow-sm inline-block bg-blue-50 text-blue-700">
          {cls.section}
        </span>
        <p className="text-gray-600 text-sm">
          <strong>Grade:</strong> {cls.gradeLevel}
        </p>
        <p className="text-gray-600 text-sm">
          <strong>Day:</strong> {cls.days}
        </p>
        <p className="text-gray-600 text-sm">
          <strong>Time:</strong> {cls.time}
        </p>
        <p className="text-gray-600 text-sm">
          <strong>Students:</strong> {studentCount}
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative">
          <button
            onClick={() =>
              setDropdownOpenId((prev) => (prev === cls.id ? null : cls.id))
            }
            className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 transition-all duration-200"
          >
            <MoreHorizontal
              size={18}
              className="text-gray-600 hover:text-[#3498db] transition-colors duration-200"
            />
          </button>

          {dropdownOpenId === cls.id && (
            <div className="absolute top-10 left-0 bg-white border border-gray-200 shadow-lg rounded-lg w-40 z-50">
              <button
                onClick={() => handleEditClass(cls)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteClass(cls.id)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500 text-sm"
              >
                Delete
              </button>
              <button
                onClick={() => handleCopyLink(cls.id)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
              >
                Copy Link
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setSelectedClass(cls)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all"
          style={{ backgroundColor: "#3498db" }}
        >
          View Class
        </button>
      </div>
    </div>
  );
}