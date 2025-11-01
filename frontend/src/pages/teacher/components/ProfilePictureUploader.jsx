import React from "react";

/**
 * ProfilePictureUploader: shows current picture and upload button.
 * Keeps original markup/behavior (base64 endpoint).
 */
export default function ProfilePictureUploader({ teacherData, uploading, handleProfilePicChange }) {
  return (
    <>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Picture</h2>

      <div className="flex flex-col items-center">
        <img
          src={
            teacherData.profilePic ||
            "https://www.w3schools.com/howto/img_avatar.png"
          }
          alt="Profile"
          className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 mb-4"
        />

        <label className="cursor-pointer bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          {uploading ? "Uploading..." : "Upload New Picture"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfilePicChange}
            disabled={uploading}
          />
        </label>
      </div>
    </>
  );
}