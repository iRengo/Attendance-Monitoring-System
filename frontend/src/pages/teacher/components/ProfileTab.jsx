import React from "react";
import TeacherCameraCapture from "./TeacherCameraCapture";

/**
 * ProfileTab: camera-only capture with full liveness (blink + left + right).
 */
export default function ProfileTab({ teacherData, uploading, onCaptureFromCamera }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Info</h2>
        <p className="text-gray-700 text-sm">
          Use your camera to capture a new profile picture. Complete blink + turn head left + turn head right.
        </p>
      </div>

      <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200 flex flex-col items-center">
        <TeacherCameraCapture
          currentImage={teacherData.profilePic}
          busy={uploading}
          onSave={(dataUrl) => onCaptureFromCamera(dataUrl)}
        />
      </div>
    </div>
  );
}