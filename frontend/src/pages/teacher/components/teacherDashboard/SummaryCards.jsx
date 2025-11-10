import { Layers, Users, BookOpen } from "lucide-react";

export default function SummaryCards({ loading, totalClasses, totalStudents, totalSubjects }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <Card
        title="Total Classes"
        value={loading ? "..." : totalClasses}
        icon={<Layers className="text-blue-500" size={32} />}
      />
      <Card
        title="Total Students"
        value={loading ? "..." : totalStudents}
        icon={<Users className="text-green-500" size={32} />}
      />
      <Card
        title="Total Subjects"
        value={loading ? "..." : totalSubjects}
        icon={<BookOpen className="text-purple-500" size={32} />}
      />
    </div>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="p-5 rounded-xl shadow-md border bg-white hover:shadow-lg transition">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-600 text-sm font-medium">{title}</h2>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}