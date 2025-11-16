import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#4CAF50", "#F87171"];

export default function PresencePie({ presenceData, attendancePercent }) {
  return (
    <div className="bg-white border rounded-xl shadow-md p-5 flex flex-col items-center justify-center relative">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        🧍‍♂️ Presence vs Absence (Today)
      </h2>
      <div className="flex flex-col items-center relative">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie
              data={presenceData}
              cx="50%"
              cy="60%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
            >
              {presenceData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute top-[105px] text-center pointer-events-none">
          <p className="text-2xl font-bold text-gray-800">{attendancePercent}%</p>
          <p className="text-sm text-gray-500">Present</p>
        </div>

        <div className="flex mt-4 gap-4 text-sm">
          <div className="flex items-center text-gray-500 gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <p>Present / Late</p>
          </div>
          <div className="flex items-center text-gray-500 gap-1">
            <span className="w-3 h-3 bg-red-400 rounded-full"></span>
            <p>Absent</p>
          </div>
        </div>
      </div>
    </div>
  );
}