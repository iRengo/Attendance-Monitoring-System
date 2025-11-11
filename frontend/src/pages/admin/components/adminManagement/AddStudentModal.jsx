import React from "react";

const SECTION_OPTIONS = ["BM1MA", "HU1MA", "HU2AA", "IC1MA", "IC2AA"];

export default function AddStudentModal({
  user,
  onChange,
  onSave,
  onCancel,
  creating,
}) {
  if (!user) return null;

  // Normalize studentId casing before saving
  const handleSave = () => {
    const normalized = { ...user };
    if (normalized.studentid && !normalized.studentId) {
      normalized.studentId = normalized.studentid;
    }
    delete normalized.studentid;
    onSave(normalized);
  };

  const fields = [
    { key: "firstname", label: "First name", required: true },
    { key: "middlename", label: "Middle name" },
    { key: "lastname", label: "Last name", required: true },
    { key: "studentId", label: "Student ID", required: true }, // ensure camelCase
    { key: "personal_email", label: "Personal email", required: true },
    { key: "guardianname", label: "Guardian name" },
    { key: "guardiancontact", label: "Guardian contact" },
    { key: "gradelevel", label: "Grade level" }, // will render as dropdown
    { key: "section", label: "Section" }, // will render as dropdown
  ];

  // If current section value isn't in predefined list, include it so it's selectable
  const resolvedSectionOptions =
    !user?.section || SECTION_OPTIONS.includes(user.section)
      ? SECTION_OPTIONS
      : [user.section, ...SECTION_OPTIONS];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 backdrop-blur-sm"></div>
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10">
        <h2 className="text-2xl font-bold mb-4 text-blue-700 border-b pb-2">
          Add Student
        </h2>
        <div className="space-y-3 text-gray-800 max-h-80 overflow-y-auto pr-2">
          {fields.map((f) => {
            const isEmail = f.key.includes("email");

            // Render Grade Level as a dropdown
            if (f.key === "gradelevel") {
              return (
                <div key={f.key} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={String(user.gradelevel ?? "")}
                    onChange={(e) => onChange({ ...user, gradelevel: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm text-gray-700"
                  >
                    <option value="">Select Grade Level</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>
              );
            }

            // Render Section as a dropdown
            if (f.key === "section") {
              return (
                <div key={f.key} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={user.section || ""}
                    onChange={(e) => onChange({ ...user, section: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm text-gray-700"
                  >
                    <option value="">Select Section</option>
                    {resolvedSectionOptions.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            // Default: text/email input
            return (
              <div key={f.key} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={isEmail ? "email" : "text"}
                  placeholder={f.label}
                  value={
                    f.key === "studentId"
                      ? (user.studentId ?? user.studentid ?? "")
                      : (user[f.key] || "")
                  }
                  onChange={(e) => {
                    if (f.key === "studentId") {
                      onChange({ ...user, studentId: e.target.value });
                    } else {
                      onChange({ ...user, [f.key]: e.target.value });
                    }
                  }}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-5 py-2 rounded-xl shadow-md"
            onClick={onCancel}
            disabled={creating}
          >
            Cancel
          </button>
          <button
            className={`bg-blue-600 text-white px-5 py-2 rounded-xl shadow-md hover:bg-blue-700 font-semibold ${
              creating ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={handleSave}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}