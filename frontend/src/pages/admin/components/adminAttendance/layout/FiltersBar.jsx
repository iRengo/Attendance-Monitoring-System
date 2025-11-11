import SectionSelect from "./SectionSelect";
import ViewToggle from "./ViewToggle";
import SearchInput from "./SearchInput";

export default function FiltersBar({
  sections,
  selectedSection,
  onSectionChange,
  activeTab,
  setActiveTab,
  teacherQuery,
  setTeacherQuery,
  studentQuery,
  setStudentQuery,
  showTeacherSearch,
  showStudentSearch,
  loadingClasses,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 mb-6">
      <div className="grid md:grid-cols-3 gap-4">
        <SectionSelect
          sections={sections}
          value={selectedSection}
          onChange={onSectionChange}
          loading={loadingClasses}
        />
        <ViewToggle activeTab={activeTab} setActiveTab={setActiveTab} />
        {showTeacherSearch && (
          <SearchInput
            label="Search Teacher"
            placeholder="Search teacher..."
            value={teacherQuery}
            onChange={setTeacherQuery}
          />
        )}
        {showStudentSearch && (
          <SearchInput
            label="Search Student"
            placeholder="Search student..."
            value={studentQuery}
            onChange={setStudentQuery}
          />
        )}
      </div>
    </div>
  );
}