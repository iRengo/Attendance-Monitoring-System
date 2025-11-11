export default function TeacherSessionGroup({ subject, sessions, isOpen, toggle }) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={toggle}
          className="w-full flex items-center px-5 py-3.5 bg-gradient-to-r from-indigo-50 to-sky-50 hover:from-indigo-100 hover:to-sky-100 transition-colors text-left"
        >
          <span className="text-sm font-semibold text-gray-800">{subject}</span>
        </button>
        {isOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-gray-700">
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Time In</th>
                  <th className="px-5 py-3 text-left font-medium">Time Out</th>
                  <th className="px-5 py-3 text-left font-medium">Duration (min)</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, idx) => {
                  const start = s.timeStarted ? new Date(s.timeStarted) : null;
                  const end = s.timeEnded ? new Date(s.timeEnded) : null;
                  const duration =
                    start && end
                      ? Math.max(
                          0,
                          Math.round((end.getTime() - start.getTime()) / 60000)
                        )
                      : "";
                  return (
                    <tr
                      key={s.id}
                      className={`${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-indigo-50/60 transition-colors`}
                    >
                      <td className="px-5 py-3 text-gray-900">
                        {start
                          ? start.toLocaleDateString()
                          : end
                          ? end.toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-5 py-3 text-gray-900">
                        {start
                          ? start.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-5 py-3 text-gray-900">
                        {end
                          ? end.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-5 py-3 text-gray-900">
                        {duration !== "" ? duration : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }