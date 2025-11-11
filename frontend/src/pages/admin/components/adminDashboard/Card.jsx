import { Users, BookOpen, BarChart3 } from "lucide-react";

export default function Card({ title, value, iconName }) {
  const icon =
    iconName === "users" ? (
      <Users className="text-blue-500" size={32} />
    ) : iconName === "book" ? (
      <BookOpen className="text-yellow-500" size={32} />
    ) : (
      <BarChart3 className="text-purple-500" size={32} />
    );

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