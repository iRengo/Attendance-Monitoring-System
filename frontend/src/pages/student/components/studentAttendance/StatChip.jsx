export default function StatChip({ icon, label, value, colorClasses }) {
    return (
      <div className={`flex items-center gap-2 rounded-full bg-white shadow-sm border px-3 py-1.5 ${colorClasses}`}>
        {icon}
        <span className="text-xs text-[#415CA0]">{label}</span>
        <span className="text-sm font-semibold text-[#1f376b]">{value}</span>
      </div>
    );
  }