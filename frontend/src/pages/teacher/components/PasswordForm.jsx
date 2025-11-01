import React from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * PasswordForm: handles new/confirm password inputs and visibility toggles.
 */
export default function PasswordForm({
  passwords,
  showNewPassword,
  showConfirmPassword,
  setShowNewPassword,
  setShowConfirmPassword,
  handlePasswordChange,
  handleChangePassword,
}) {
  return (
    <div className="space-y-5">
      <div className="relative">
        <label className="text-gray-600 text-sm">New Password</label>
        <input
          type={showNewPassword ? "text" : "password"}
          name="new"
          value={passwords.new}
          onChange={handlePasswordChange}
          className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-[#3498db] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShowNewPassword((s) => !s)}
          className="absolute right-3 top-8 text-gray-500"
        >
          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className="relative">
        <label className="text-gray-600 text-sm">Confirm New Password</label>
        <input
          type={showConfirmPassword ? "text" : "password"}
          name="confirm"
          value={passwords.confirm}
          onChange={handlePasswordChange}
          className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-[#3498db] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword((s) => !s)}
          className="absolute right-3 top-8 text-gray-500"
        >
          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleChangePassword}
          className="bg-[#3498db] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#2980b9] transition"
        >
          Update Password
        </button>
      </div>
    </div>
  );
}