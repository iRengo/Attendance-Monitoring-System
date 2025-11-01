import React from "react";
import ProfilePictureUploader from "./ProfilePictureUploader";

/**
 * ProfileTab: left column placeholder, right column profile picture uploader
 */
export default function ProfileTab({ teacherData, uploading, handleProfilePicChange }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Info</h2>
        <p className="text-gray-700 text-sm">
          Customize your profile details here (coming soon).
        </p>
      </div>

      <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200 flex flex-col items-center">
        <ProfilePictureUploader
          teacherData={teacherData}
          uploading={uploading}
          handleProfilePicChange={handleProfilePicChange}
        />
      </div>
    </div>
  );
}