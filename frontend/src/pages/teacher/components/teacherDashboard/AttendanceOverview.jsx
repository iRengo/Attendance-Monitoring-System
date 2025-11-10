import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
  } from "recharts";
  
  export default function AttendanceOverview({ data, loading, onAbsentBarClick }) {
    return (
      <div className="flex-1 bg-white border rounded-xl shadow-md p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">📊 Attendance Overview (This Week)</h2>
        <p className="text-xs text-gray-500 mb-3">
          Click a red (Absent) bar to view absent students for that day.
        </p>
        <div className="w-full h-64">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Loading attendance...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Present" fill="#60a5fa" barSize={18} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Absent" fill="#f87171" barSize={18} radius={[6, 6, 0, 0]}>
                  {data.map((entry, idx) => (
                    <Cell
                      key={`cell-absent-${idx}`}
                      cursor="pointer"
                      onClick={() => onAbsentBarClick?.(entry.day)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  }