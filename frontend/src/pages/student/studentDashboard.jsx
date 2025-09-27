import StudentLayout from "../../components/studentLayout";

export default function studentDashboard() {
  return (
    <StudentLayout title="Dashboard">
      <div className="p-4 space-y-8">

        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white shadow-md border border-[#d6d6d6] rounded-xl p-6 text-center text-[#415CA0]">
            Absent Count
          </div>
          <div className="bg-white shadow-md border border-[#d6d6d6] rounded-xl p-6 text-center text-[#415CA0]">
            Present Count
          </div>
          <div className="bg-white shadow-md border border-[#d6d6d6] rounded-xl p-6 text-center text-[#415CA0]">
            Late Count
          </div>
          <div className="bg-white shadow-md border border-[#d6d6d6] rounded-xl p-6 text-center text-[#415CA0]">
            Attendance Rate
          </div>

          <div className="bg-white shadow-md border border-[#d6d6d6] rounded-xl p-6 col-span-2">
            <h5 className="text-lg font-semibold text-[#415CA0] mb-4">
              Attendance Trend
            </h5>
            <div className="h-64 flex items-center justify-center text-gray-400">
              Line Graph
            </div>
          </div>

          <div className="bg-white shadow-md border border-[#d6d6d6] rounded-xl p-6 col-span-2">
            <h5 className="text-lg font-semibold text-[#415CA0] mb-4">
              Attendance Distribution
            </h5>
            <div className="h-64 flex items-center justify-center text-gray-400">
              Donut Chart
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
