import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../../../firebase";
import TeacherCameraCapture from "../TeacherCameraCapture";

export default function ProfileTab({ teacherData, uploading, onCaptureFromCamera }) {
  const [profileInfo, setProfileInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExtraProfileInfo = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const teacherRef = doc(db, "teachers", user.uid);
        const snap = await getDoc(teacherRef);

        if (snap.exists()) {
          const data = snap.data();
          setProfileInfo({
            guardiancontact: data.guardiancontact || "N/A",
            guardianname: data.guardianname || "N/A",
            contactno: data.contactno || "N/A",
            personal_email: data.personal_email || "N/A",
          });
        }
      } catch (err) {
        console.error("Error fetching extra profile info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExtraProfileInfo();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LEFT SIDE — PROFILE INFO */}
      <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Info</h2>

        {loading ? (
          <p className="text-gray-500">Loading profile information...</p>
        ) : profileInfo ? (
          <div className="space-y-4 text-gray-700 text-sm">
            <p>
              <span className="font-medium text-gray-800">Guardian Name:</span>{" "}
              {profileInfo.guardianname}
            </p>
            <p>
              <span className="font-medium text-gray-800">Guardian Contact:</span>{" "}
              {profileInfo.guardiancontact}
            </p>
            <p>
              <span className="font-medium text-gray-800">Contact No:</span>{" "}
              {profileInfo.contactno}
            </p>
            <p>
              <span className="font-medium text-gray-800">Personal Email:</span>{" "}
              {profileInfo.personal_email}
            </p>
          </div>
        ) : (
          <p className="text-gray-500">No profile info found.</p>
        )}
      </div>

      {/* RIGHT SIDE — CAMERA CAPTURE */}
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
