import CameraView from "./CameraView";

export default function ProfilePictureSection({
  profilePic,
  isCameraOpen,
  capturedImage,
  openCamera,
  closeCamera,
  capturePhoto,
  retakePhoto,
  saveCapturedPhoto,
  uploading,
  canCapture,
  webcamRef,
  videoConstraints,
  handleUserMediaError,
  boxOverlay,
  faceMessage,
  faceOk,
  spoofSuspected,
  blinkDone,
  yawLeftDone,
  yawRightDone,
  // NEW: wire liveness controls from your hook
  startPipelines,
  stopPipelines,
}) {
  const handleClose = () => {
    try { stopPipelines && stopPipelines(); } catch {}
    closeCamera();
  };

  return (
    <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200 flex flex-col items-center">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Picture</h2>
      <div className="flex flex-col items-center w-full">
        {!isCameraOpen && !capturedImage && (
          <>
            <img
              src={profilePic || "https://www.w3schools.com/howto/img_avatar.png"}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 mb-4"
            />
            <button
              onClick={openCamera}
              className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Use Camera
            </button>
          </>
        )}

        {isCameraOpen && !capturedImage && (
          <div className="w-full flex flex-col items-center">
            <CameraView
              webcamRef={webcamRef}
              videoConstraints={videoConstraints}
              onError={handleUserMediaError}
              onStarted={(videoEl) => startPipelines && startPipelines(videoEl)} // NEW
              boxOverlay={boxOverlay}
              faceMessage={faceMessage}
              faceOk={faceOk}
              spoofSuspected={spoofSuspected}
              canCapture={canCapture}
            />
            <div className="text-xs text-gray-600 mb-3">
              Liveness: Blink {blinkDone ? "✓" : ""} · Left {yawLeftDone ? "✓" : ""} · Right {yawRightDone ? "✓" : ""}
            </div>
            <div className="flex gap-3">
              <button
                onClick={capturePhoto}
                disabled={!canCapture}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  canCapture
                    ? "bg-[#3498db] hover:bg-[#2980b9] text-white"
                    : "bg-gray-300 text-gray-600 cursor-not-allowed"
                }`}
              >
                Capture Photo
              </button>
              <button
                onClick={handleClose}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {capturedImage && (
          <div className="w-full flex flex-col items-center">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { try { stopPipelines && stopPipelines(); } catch {}; retakePhoto(); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Retake
              </button>
              <button
                onClick={saveCapturedPhoto}
                disabled={uploading}
                className="bg-[#3498db] hover:bg-[#2980b9] disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                {uploading ? "Saving..." : "Save Photo"}
              </button>
              <button
                onClick={handleClose}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}