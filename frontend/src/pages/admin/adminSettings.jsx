import React, { useState } from "react";
import AdminLayout from "../../components/adminLayout";
import useAdminSettings from "./components/adminSettings/hooks/useAdminSettings";
import AdminInfo from "./components/adminSettings/AdminInfo";
import PasswordUploaderCard from "./components/adminSettings/PasswordUploaderCard";
import MaintenanceSection from "./components/adminSettings/MaintenanceSection";
import AdminArchiveSchoolYear from "./components/adminDashboard/AdminArchiveSchoolYear"; // adjust path
import BackupButton from "./components/adminDashboard/BackupButton"; // adjust path
import RestoreBackupButton from "./components/adminDashboard/RestoreBackupButton";

export default function AdminSettings() {
  const props = useAdminSettings();
  const [activeTab, setActiveTab] = useState("profile"); // "profile" or "system"

  if (props.loading)
    return (
      <AdminLayout title="System Settings">
        <div className="flex justify-center py-10 text-gray-600">Loading admin data...</div>
      </AdminLayout>
    );

  return (
    <AdminLayout title="System Settings">
      <div className="w-full max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-8 box-border">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-semibold ${
              activeTab === "profile" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            Admin Profile Information
          </button>
          <button
            className={`px-4 py-2 font-semibold ${
              activeTab === "system" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"
            }`}
            onClick={() => setActiveTab("system")}
          >
            System Preferences
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && (
          <div className="space-y-10">
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
          </div>
        )}

        {activeTab === "system" && (
          <div className="space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">⚙️ System Preferences</h2>
              <MaintenanceSection
                isMaintenance={props.isMaintenance}
                handleToggleMaintenance={props.handleToggleMaintenance}
              />
            </section>

            <section>
              {/* Archive + Backup */}
              <div className="w-full mb-6 p-4 rounded-xl bg-gray-50 border border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-all duration-300">
                <h3 className="font-bold text-gray-700 text-sm tracking-wide mb-2">System Actions</h3>
                <p className="text-xs text-gray-600 mb-4">Manage backups and reset the system for a new school year.</p>

                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <AdminArchiveSchoolYear adminEmail={props.adminData.email} />
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <BackupButton adminEmail={props.adminData.email} />
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <RestoreBackupButton adminEmail={props.adminData.email} />
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
