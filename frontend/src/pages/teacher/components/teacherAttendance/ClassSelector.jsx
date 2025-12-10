import { Users, Calendar } from "lucide-react";

export default function ClassSelector({
  classes,
  selectedClassId,
  onClassChange,
  selectedSchoolYear,
  onSchoolYearChange,
}) {
  // Extract unique school years from classes
  const schoolYears = Array.from(
    new Set(classes.map((cls) => cls.schoolYear).filter(Boolean))
  ).sort();

  // Filter classes based on selected school year
  const filteredClasses = classes.filter((cls) => {
    if (!selectedSchoolYear) {
      // Current year → classes without schoolYear
      return !cls.schoolYear;
    }
    // Specific school year → classes with that schoolYear
    return cls.schoolYear === selectedSchoolYear;
  });

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
      {/* School Year Dropdown */}
      <div className="flex flex-col w-full sm:w-48">
        <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
          <Calendar size={14} className="text-[#3498db]" /> School Year
        </label>
        <select
          value={selectedSchoolYear}
          onChange={(e) => onSchoolYearChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] shadow-sm bg-white text-gray-700"
        >
          <option value="">Current Year</option>
          {schoolYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Class Dropdown */}
      <div className="flex flex-col w-full sm:w-64">
        <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
          <Users size={14} className="text-[#3498db]" /> Class (Section • Subject)
        </label>
        <select
          value={selectedClassId}
          onChange={(e) => onClassChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] shadow-sm bg-white text-gray-700"
        >
          <option value="">Select Class</option>
          {filteredClasses.map((cls) => {
            const labelParts = [];
            if (cls.section) labelParts.push(cls.section);
            if (cls.subjectName) labelParts.push(cls.subjectName);
            if (cls.schoolYear) labelParts.push(`(${cls.schoolYear})`);
            const label = labelParts.join(" - ");
            return (
              <option key={cls.id} value={cls.id}>
                {label}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
