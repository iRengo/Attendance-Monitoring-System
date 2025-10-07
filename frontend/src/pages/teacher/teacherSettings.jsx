import { useState } from "react";
import TeacherLayout from "../../components/teacherLayout";

export default function teacherSettings() {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "John Doe",
    email: "john.doe@example.com",
    contact: "09123456789",
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  return (
    <TeacherLayout title="Settings">
      <div className="min-h-screen bg-gray-50 p-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Container: Profile Section */}
          <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Profile Information
            </h2>

            <div className="space-y-5">
              <div>
                <label className="text-gray-600 text-sm">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleProfileChange}
                  disabled={!isEditingProfile}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#3498db] focus:outline-none disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="text-gray-600 text-sm">Email</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  disabled={!isEditingProfile}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#3498db] focus:outline-none disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="text-gray-600 text-sm">Contact Number</label>
                <input
                  type="text"
                  name="contact"
                  value={profile.contact}
                  onChange={handleProfileChange}
                  disabled={!isEditingProfile}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#3498db] focus:outline-none disabled:bg-gray-100"
                />
              </div>

              <div className="flex justify-end mt-6">
                {isEditingProfile ? (
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="bg-[#3498db] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#2980b9] transition"
                  >
                    Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="bg-gray-200 text-gray-800 px-5 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Container: Password Section */}
          <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Change Password
            </h2>

            <div className="space-y-5">
              <div>
                <label className="text-gray-600 text-sm">Current Password</label>
                <input
                  type="password"
                  name="current"
                  value={passwords.current}
                  onChange={handlePasswordChange}
                  disabled={!isEditingPassword}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#3498db] focus:outline-none disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="text-gray-600 text-sm">New Password</label>
                <input
                  type="password"
                  name="new"
                  value={passwords.new}
                  onChange={handlePasswordChange}
                  disabled={!isEditingPassword}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#3498db] focus:outline-none disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="text-gray-600 text-sm">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirm"
                  value={passwords.confirm}
                  onChange={handlePasswordChange}
                  disabled={!isEditingPassword}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#3498db] focus:outline-none disabled:bg-gray-100"
                />
              </div>

              <div className="flex justify-end mt-6">
                {isEditingPassword ? (
                  <button
                    onClick={() => setIsEditingPassword(false)}
                    className="bg-[#3498db] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#2980b9] transition"
                  >
                    Update Password
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingPassword(true)}
                    className="bg-gray-200 text-gray-800 px-5 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
