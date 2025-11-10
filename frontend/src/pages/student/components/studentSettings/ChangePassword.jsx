import PasswordField from "./PasswordField";

export default function ChangePassword({
  passwords,
  handlePasswordChange,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  changePassword,
}) {
  return (
    <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Change Password</h2>
      <div className="space-y-5">
        <PasswordField
          label="New Password"
          name="new"
          value={passwords.new}
          onChange={handlePasswordChange}
          show={showNewPassword}
          toggleShow={() => setShowNewPassword((s) => !s)}
        />
        <PasswordField
          label="Confirm New Password"
          name="confirm"
          value={passwords.confirm}
          onChange={handlePasswordChange}
          show={showConfirmPassword}
          toggleShow={() => setShowConfirmPassword((s) => !s)}
        />
        <div className="flex justify-end mt-6">
          <button
            onClick={changePassword}
            className="bg-[#3498db] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#2980b9] transition"
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}