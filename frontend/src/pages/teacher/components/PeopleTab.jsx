import React from "react";

export default function PeopleTab({ students }) {
  return (
    <>
      {students.length === 0 ? (
        <p className="text-gray-400 text-center">No students yet.</p>
      ) : (
        <ul className="space-y-3">
          {students.map((s) => (
            <li key={s.id} className="flex justify-between items-center">
              <span className="text-gray-800">{s.fullName}</span>
              <span className="text-gray-500 text-sm">{s.email}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}