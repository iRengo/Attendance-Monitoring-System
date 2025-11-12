import React from "react";

export default function ProfileInfo({ studentData, loading }) {
  if (loading) {
    return (
      <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Profile Info
        </h2>
        <p className="text-gray-500 text-sm">Loading student information...</p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Profile Info
        </h2>
        <p className="text-gray-500 text-sm">
          No profile data found for this student.
        </p>
      </div>
    );
  }

  // ✅ Fields to display (without first, middle, last name)
  const fields = [
    { label: "Student ID", value: studentData.studentId || "—" },
    { label: "Section", value: studentData.section || "—" },
    { label: "Grade Level", value: studentData.gradelevel || "—" },
    { label: "Personal Email", value: studentData.personal_email || "—" },
    { label: "Guardian Name", value: studentData.guardianname || "—" },
    { label: "Guardian Contact", value: studentData.guardiancontact || "—" },
  ];

  return (
    <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Info</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.label} className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">{field.label}</span>
            <span className="text-base text-gray-800">{field.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
