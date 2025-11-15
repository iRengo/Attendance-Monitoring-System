import Webcam from "react-webcam";
import LivenessBadge from "./LivenessBadge";

export default function CameraView({
  webcamRef,
  videoConstraints,
  onError,
  onStarted,
  boxOverlay,
  faceMessage,
  faceOk,
  spoofSuspected,
  canCapture,
}) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-2 bg-black">
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored
        screenshotFormat="image/jpeg"
        videoConstraints={{ ...videoConstraints, width: 640, height: 640 }}
        className="w-[480px] h-[480px] object-cover"
        onUserMediaError={onError}
        onUserMedia={() => {
          const videoEl = webcamRef?.current?.video || null;
          if (onStarted && videoEl) setTimeout(() => onStarted(videoEl), 0);
        }}
      />
      <LivenessBadge
        faceMessage={faceMessage}
        faceOk={faceOk}
        spoofSuspected={spoofSuspected}
        canCapture={canCapture}
      />
      {boxOverlay && (
        <div
          className="absolute border-2 border-yellow-400 pointer-events-none"
          style={{
            left: `${boxOverlay.x * 100}%`,
            top: `${boxOverlay.y * 100}%`,
            width: `${boxOverlay.w * 100}%`,
            height: `${boxOverlay.h * 100}%`,
          }}
        />
      )}
    </div>
  );
}
