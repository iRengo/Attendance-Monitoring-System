import React from "react";
import AdminLayout from "../../components/adminLayout";
import useAdminSettings from "./components/hooks/useAdminSettings";
import AdminInfo from "./components/AdminInfo";
import PasswordUploaderCard from "./components/PasswordUploaderCard";
import MaintenanceSection from "./components/MaintenanceSection";

/**
 * AdminSettings page — Confirmations handled by SweetAlert2 inside the hook.
 */
export default function AdminSettings() {
  const props = useAdminSettings();

  if (props.loading)
    return (
      <AdminLayout title="System Settings">
        <div className="flex justify-center py-10 text-gray-600">Loading admin data...</div>
      </AdminLayout>
    );

  return (
    <AdminLayout title="System Settings">
      <div className="w-full max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-8 space-y-10 box-border">
        <section>
          <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">👤 Admin Profile Information</h2>
          <AdminInfo adminData={props.adminData} />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">🔒 Change Password</h2>
          <PasswordUploaderCard
            newPassword={props.newPassword}
            confirmPassword={props.confirmPassword}
            setNewPassword={props.setNewPassword}
            setConfirmPassword={props.setConfirmPassword}
            handlePasswordUpdate={props.handlePasswordUpdate}
            uploading={props.uploading}
            adminData={props.adminData}
            handleProfilePicChange={props.handleProfilePicChange}
          />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">⚙️ System Preferences</h2>
          <MaintenanceSection isMaintenance={props.isMaintenance} handleToggleMaintenance={props.handleToggleMaintenance} />
        </section>
      </div>
    </AdminLayout>
  );
}