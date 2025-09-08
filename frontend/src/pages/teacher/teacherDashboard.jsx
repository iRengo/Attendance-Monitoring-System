export default function TeacherDashboard() {
  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col items-center justify-center">
      {/* Top bar */}
      <div className="bg-blue-600 text-white w-full p-4 flex justify-between items-center">
        <h1 className="font-bold text-lg">TEACHER DASHBOARD</h1>
        <button className="hover:underline">Log Out</button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <h1 className="text-4xl font-bold text-black">
          Welcome, Teacher!
        </h1>
        <p className="text-lg text-gray-700 mt-4">
          You are logged in with a teacher account.
        </p>
      </div>
    </div>
  );
}
