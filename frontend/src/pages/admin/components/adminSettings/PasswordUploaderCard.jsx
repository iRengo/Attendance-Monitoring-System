import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordUploaderCard({
  newPassword,
  confirmPassword,
  setNewPassword,
  setConfirmPassword,
  handlePasswordUpdate,
  uploading,
  adminData,
  handleProfilePicChange,
}) {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="bg-gray-50 p-6 rounded-xl shadow-inner">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Password Update Section */}
        <div className="flex-1 max-w-full">
          <div className="space-y-3">
            {/* New Password */}
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-lg p-2 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg p-2 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="mt-3">
              <button
                onClick={handlePasswordUpdate}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>

        {/* Profile Picture Section */}
        <div className="w-full md:w-48 flex-shrink-0">
          <h3 className="text-sm text-gray-600 mb-3">Profile Picture</h3>

          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-gray-200 mb-3 mx-auto">
            <img
              alt="Admin Profile"
              src={adminData?.profilePic || "https://www.w3schools.com/howto/img_avatar.png"}
              loading="lazy"
              className="w-full h-full object-cover block"
              style={{ display: "block", width: "112px", height: "112px" }}
            />
          </div>

          <div className="text-center">
            <label className="cursor-pointer bg-[#3498db] hover:bg-[#2f89ca] text-white px-3 py-1 rounded-lg text-sm font-medium transition inline-block">
              {uploading ? "Uploading..." : "Upload Picture"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePicChange}
                disabled={uploading}
              />
            </label>
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            Used across the admin console.
          </p>
        </div>
      </div>
    </div>
  );
}
