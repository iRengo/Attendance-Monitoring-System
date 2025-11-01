import React from "react";
import TeacherLayout from "../../components/teacherLayout";
import useTeacherSettings from "./components/hooks/useTeacherSettings";
import SettingsTabs from "./components/SettingsTabs";
import AccountTab from "./components/AccountTab";
import ProfileTab from "./components/ProfileTab";

/**
 * Concise TeacherSettings page.
 * All logic moved into useTeacherSettings hook and UI split into small components.
 * Behavior, endpoints and UI/classes are unchanged.
 */
export default function TeacherSettings() {
  const props = useTeacherSettings();

  return (
    <TeacherLayout title="Settings">
      <SettingsTabs activeTab={props.activeTab} setActiveTab={props.setActiveTab} />

      {props.activeTab === "account" && (
        <AccountTab
          loading={props.loading}
          teacherData={props.teacherData}
          passwords={props.passwords}
          showNewPassword={props.showNewPassword}
          showConfirmPassword={props.showConfirmPassword}
          setShowNewPassword={props.setShowNewPassword}
          setShowConfirmPassword={props.setShowConfirmPassword}
          handlePasswordChange={props.handlePasswordChange}
          handleChangePassword={props.handleChangePassword}
        />
      )}

      {props.activeTab === "profile" && (
        <ProfileTab
          teacherData={props.teacherData}
          uploading={props.uploading}
          handleProfilePicChange={props.handleProfilePicChange}
        />
      )}
    </TeacherLayout>
  );
}