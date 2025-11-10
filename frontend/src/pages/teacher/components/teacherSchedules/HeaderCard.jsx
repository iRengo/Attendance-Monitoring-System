export default function HeaderCard() {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
        <div className="p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-[#1f376b]">
            Manage Attendance Sessions
          </h1>
          <p className="text-sm text-[#415CA0]/80 mt-1">
            Select a class to view its session history, download logs, and review timings.
          </p>
        </div>
      </div>
    );
  }