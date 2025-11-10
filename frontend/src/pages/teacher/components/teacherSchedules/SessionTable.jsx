/**
 * SessionTable
 * Displays sessions for a selected class.
 * Props:
 *  - sessions: array of session objects
 *  - formatDateTime: function to format date strings
 */
export default function SessionTable({ sessions, formatDateTime }) {
    return (
      <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr className="text-gray-700">
              <th className="px-3 py-2 text-left font-medium">Started</th>
              <th className="px-3 py-2 text-left font-medium">Ended</th>
              <th className="px-3 py-2 text-left font-medium">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sessions.map((s, idx) => {
              const duration =
                s.timeStarted && s.timeEnded
                  ? Math.round(
                      (new Date(s.timeEnded).getTime() -
                        new Date(s.timeStarted).getTime()) /
                        60000
                    )
                  : null;
              return (
                <tr
                  key={s.id}
                  className={`transition ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                  } hover:bg-blue-50/50`}
                >
                  <td className="px-3 py-2 text-gray-700">
                    {formatDateTime(s.timeStarted)}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {formatDateTime(s.timeEnded)}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {duration != null ? `${duration} min` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }