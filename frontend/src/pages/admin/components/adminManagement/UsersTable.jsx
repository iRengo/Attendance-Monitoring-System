import React from "react";

export default function UsersTable({ loading, users, onView, onEdit, onDelete }) {
  if (loading) {
    return <p className="text-gray-500">Loading users...</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-blue-50 text-left text-gray-700">
            <th className="px-4 py-2 text-sm font-semibold">Name</th>
            <th className="px-4 py-2 text-sm font-semibold">Email</th>
            <th className="px-4 py-2 text-sm font-semibold">Role</th>
            <th className="px-4 py-2 text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="4" className="px-6 py-3 text-center text-gray-500">
                No records found
              </td>
            </tr>
          ) : (
            users.map((u, idx) => (
              <tr
                key={u.id}
                className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
              >
                <td className="px-4 py-2 text-sm text-gray-800">{u.name}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{u.email}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{u.role}</td>
                <td className="px-4 py-2 text-sm flex gap-3 text-gray-800">
                  <button onClick={() => onView(u)} className="text-blue-600 hover:underline">
                    View
                  </button>
                  <button onClick={() => onEdit(u)} className="text-green-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => onDelete(u)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}