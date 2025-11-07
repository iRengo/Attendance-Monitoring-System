import React from "react";

export default function AddStudentModal({
  user,
  onChange,
  onSave,
  onCancel,
  creating,
}) {
  if (!user) return null;

  const fields = [
    { key: "firstname", label: "First name", required: true },
    { key: "middlename", label: "Middle name" },
    { key: "lastname", label: "Last name", required: true },
    { key: "personal_email", label: "Personal email", required: true },
    { key: "guardianname", label: "Guardian name" },
    { key: "guardiancontact", label: "Guardian contact" },
    { key: "gradelevel", label: "Grade level" },
    { key: "section", label: "Section" },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 backdrop-blur-sm"></div>
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10">
        <h2 className="text-2xl font-bold mb-4 text-blue-700 border-b pb-2">
          Add Student
        </h2>
        <div className="space-y-3 text-gray-800 max-h-80 overflow-y-auto pr-2">
          {fields.map((f) => (
            <div key={f.key} className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={f.key.includes("email") ? "email" : "text"}
                placeholder={f.label}
                value={user[f.key] || ""}
                onChange={(e) => onChange({ ...user, [f.key]: e.target.value })}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          ))}
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
            onClick={onSave}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}