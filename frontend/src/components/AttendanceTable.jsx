export default function AttendanceTable() {
  const records = [
    { date: "SEPTEMBER 1", status: "PRESENT", remarks: "WARNING 0/5" },
    { date: "SEPTEMBER 2", status: "PRESENT", remarks: "WARNING 1/5" },
    { date: "SEPTEMBER 3", status: "PRESENT", remarks: "WARNING 2/5" },
  ];

  return (
    <table className="w-full bg-white shadow rounded">
      <thead>
        <tr className="bg-gray-200 text-left text-black">
          <th className="py-2 px-4">DATE</th>
          <th className="py-2 px-4">STATUS</th>
          <th className="py-2 px-4">REMARKS</th>
        </tr>
      </thead>
      <tbody>
        {records.map((rec, i) => (
          <tr key={i} className="border-t text-black">
            <td className="py-2 px-4">{rec.date}</td>
            <td className="py-2 px-4">{rec.status}</td>
            <td className="py-2 px-4">{rec.remarks}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
