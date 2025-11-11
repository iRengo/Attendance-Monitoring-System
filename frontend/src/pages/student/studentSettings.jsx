import { useEffect, useMemo, useRef, useState } from "react";
import StudentLayout from "../../components/studentLayout";
import useStudentProfile from "./components/studentSettings/hooks/useStudentProfile";
import useLivenessPipeline from "./components/studentSettings/hooks/useLivenessPipeline";

import Tabs from "./components/studentSettings/Tabs";
import AccountInfo from "./components/studentSettings/AccountInfo";
import ChangePassword from "./components/studentSettings/ChangePassword";
import ProfilePictureSection from "./components/studentSettings/ProfilePictureSection";

export default function StudentSettings() {
  const {
    studentData,
    loading,
    passwords,
    uploading,
    handlePasswordChange,
    changePassword,
    uploadProfilePhoto,
    setPasswords,
  } = useStudentProfile();

  const {
    faceOk,
    faceMessage,
    multipleFaces,
    spoofSuspected,
    boxOverlay,
    blinkDone,
    yawLeftDone,
    yawRightDone,
    canCapture,
    startPipelines,
    stopPipelines,
    resetLivenessProgress,
  } = useLivenessPipeline();

  const [activeTab, setActiveTab] = useState("account");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const webcamRef = useRef(null);

  const videoConstraints = useMemo(
    () => ({ facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } }),
    []
  );

  const openCamera = () => {
    setCapturedImage(null);
    resetLivenessProgress();
    setIsCameraOpen(true);
  };
  const closeCamera = () => {
    setIsCameraOpen(false);
    setCapturedImage(null);
  };

  const handleUserMediaError = (err) => {
    console.error("Camera error:", err);
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!canCapture) return;
    const img = webcamRef.current?.getScreenshot();
    if (!img) return;
    setCapturedImage(img);
  };
  const retakePhoto = () => {
    setCapturedImage(null);
    resetLivenessProgress();
  };
  const saveCapturedPhoto = async () => {
    if (!capturedImage) return;
    const success = await uploadProfilePhoto(capturedImage);
    if (success) closeCamera();
  };

  // IMPORTANT: Do NOT auto-start pipelines here to avoid double-start race.
  // Camera starts via CameraView onUserMedia -> startPipelines(videoEl)

  return (
    <StudentLayout title="Settings">
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "account" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <AccountInfo loading={loading} studentData={studentData} />
          <ChangePassword
            passwords={passwords}
            handlePasswordChange={handlePasswordChange}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            changePassword={changePassword}
          />
        </div>
      )}

      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Info</h2>
            <p className="text-gray-700 text-sm">Customize your profile details here (coming soon).</p>
            {multipleFaces && (
              <p className="mt-4 text-sm text-red-600">
                Multiple faces detected — only one person should be in frame.
              </p>
            )}
            {spoofSuspected && (
              <p className="mt-1 text-sm text-yellow-700">
                Please move slightly to prove liveness (anti-spoof triggered).
              </p>
            )}
          </div>

          <ProfilePictureSection
            profilePic={studentData.profilePic}
            isCameraOpen={isCameraOpen}
            capturedImage={capturedImage}
            openCamera={openCamera}
            closeCamera={closeCamera}
            capturePhoto={capturePhoto}
            retakePhoto={retakePhoto}
            saveCapturedPhoto={saveCapturedPhoto}
            uploading={uploading}
            canCapture={canCapture}
            webcamRef={webcamRef}
            videoConstraints={videoConstraints}
            handleUserMediaError={handleUserMediaError}
            boxOverlay={boxOverlay}
            faceMessage={faceMessage}
            faceOk={faceOk}
            spoofSuspected={spoofSuspected}
            blinkDone={blinkDone}
            yawLeftDone={yawLeftDone}
            yawRightDone={yawRightDone}
            // pass liveness controls so CameraView starts only once from onUserMedia
            startPipelines={startPipelines}
            stopPipelines={stopPipelines}
          />
        </div>
      )}
    </StudentLayout>
  );
}