import React from "react";

/**
 * AdminInfo: displays basic admin profile fields (readonly)
 */
export default function AdminInfo({ adminData }) {
  if (!adminData) return <p className="text-gray-500 text-sm">No admin data found in Firestore.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">First Name</p>
        <p className="font-semibold text-gray-900 text-lg">{adminData.firstname || "—"}</p>
      </div>
      <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">Last Name</p>
        <p className="font-semibold text-gray-900 text-lg">{adminData.lastname || "—"}</p>
      </div>
      <div className="col-span-1 sm:col-span-2 p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm">
        <p className="text-sm text-gray-600">Email Address</p>
        <p className="font-semibold text-gray-900 text-lg">{adminData.email || "—"}</p>
      </div>
    </div>
  );
}