import React, { useState, useMemo } from "react";

export default function PeopleTab({ students = [] }) {
  const [query, setQuery] = useState("");

  const normalizedQuery = (query || "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return students;
    return students.filter((s) => {
      const name =
        (s.fullName || s.name || `${s.firstName || s.firstname || ""} ${s.lastName || s.lastname || ""}` || "")
          .toString()
          .toLowerCase();
      const email = (s.email || s.personal_email || "").toString().toLowerCase();
      const other = (s.studentId || s.id || "").toString().toLowerCase();
      return name.includes(normalizedQuery) || email.includes(normalizedQuery) || other.includes(normalizedQuery);
    });
  }, [students, normalizedQuery]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Students by Name or Email"
          className="w-full md:w-80 px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-[#3498db] outline-none text-sm"
          aria-label="Search students"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-center">No students found.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => {
            const name =
              s.fullName ||
              s.name ||
              `${s.firstName || s.firstname || ""} ${s.lastName || s.lastname || ""}`.trim() ||
              "Unnamed";
            const email = s.email || s.personal_email || "-";
            return (
              <li key={s.id || email || name} className="flex justify-between items-center">
                <span className="text-gray-800">{name}</span>
                <span className="text-gray-500 text-sm">{email}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}