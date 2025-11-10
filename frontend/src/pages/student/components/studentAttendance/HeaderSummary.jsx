import { BookOpen, CheckCircle2, XCircle, Clock } from "lucide-react";
import StatChip from "./StatChip";

export default function HeaderSummary({ studentName, stats, filtered }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-100">
      <div className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#1f376b]">
              Hello{studentName ? `, ${studentName}` : ""}!
            </h2>
            <p className="text-sm text-[#415CA0]/80 mt-1">
              Here’s a quick look at your attendance. {filtered ? "(filtered view)" : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatChip
              icon={<BookOpen size={16} className="text-indigo-600" />}
              label="Records"
              value={stats.total}
              colorClasses="border-indigo-100"
            />
            <StatChip
              icon={<CheckCircle2 size={16} className="text-green-600" />}
              label="Present"
              value={stats.present}
              colorClasses="border-green-100"
            />
            <StatChip
              icon={<XCircle size={16} className="text-red-600" />}
              label="Absent"
              value={stats.absent}
              colorClasses="border-red-100"
            />
            <StatChip
              icon={<Clock size={16} className="text-amber-600" />}
              label="Late"
              value={stats.late}
              colorClasses="border-amber-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}