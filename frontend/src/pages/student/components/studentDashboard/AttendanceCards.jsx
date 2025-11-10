import { UserCheck, UserX, Clock, Activity } from "lucide-react";

const CARD_DEF = [
  { icon: UserCheck, label: "Present", key: "present" },
  { icon: UserX, label: "Absent", key: "absent" },
  { icon: Clock, label: "Late", key: "late" },
  { icon: Activity, label: "Attendance Rate", key: "rate" },
];

export default function AttendanceCards({ attendance }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {CARD_DEF.map(({ icon: Icon, label, key }, idx) => (
        <div
          key={idx}
          className="border border-gray-200 rounded-xl p-5 flex flex-col items-center shadow-sm hover:shadow-lg transition duration-200"
        >
          <Icon size={32} className="mb-2 text-gray-600" />
          <h2 className="text-sm font-medium mb-1 text-gray-700">{label}</h2>
          <p className="text-2xl font-bold text-gray-900">{attendance[key]}</p>
        </div>
      ))}
    </div>
  );
}