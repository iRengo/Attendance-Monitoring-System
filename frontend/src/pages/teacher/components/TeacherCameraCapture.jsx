import React, { useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import { FaceDetection } from "@mediapipe/face_detection";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export default function TeacherCameraCapture({ currentImage, onSave, busy }) {
  const [isOpen, setIsOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  const [faceOk, setFaceOk] = useState(false);
  const [faceMessage, setFaceMessage] = useState("Point your face to the camera");
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [spoofSuspected, setSpoofSuspected] = useState(false);
  const [boxOverlay, setBoxOverlay] = useState(null);

  const [blinkDone, setBlinkDone] = useState(false);
  const [yawLeftDone, setYawLeftDone] = useState(false);
  const [yawRightDone, setYawRightDone] = useState(false);
  const canCapture = faceOk && !spoofSuspected && blinkDone && yawLeftDone && yawRightDone;

  const webcamRef = useRef(null);
  const camRef = useRef(null);
  const fdRef = useRef(null);
  const fmRef = useRef(null);
  const runningRef = useRef(false);

  const lastBoxRef = useRef(null);
  const stillFramesRef = useRef(0);

  const blinkPhaseRef = useRef("idle");
  const closedFramesRef = useRef(0);
  const openingFramesRef = useRef(0);

  const faceLostRef = useRef(true);

  const videoConstraints = useMemo(
    () => ({ facingMode: "user", width: 480, height: 480 }),
    []
  );

  useEffect(() => {
    if (!isOpen) {
      stopPipelines();
      return;
    }
    startPipelines();
    return stopPipelines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function openCamera() {
    resetAll();
    setIsOpen(true);
  }

  function closeCamera() {
    setIsOpen(false);
    setCapturedImage(null);
  }

  function resetAll() {
    setCapturedImage(null);
    setFaceOk(false);
    setFaceMessage("Detecting face...");
    setMultipleFaces(false);
    setSpoofSuspected(false);
    setBoxOverlay(null);
    setBlinkDone(false);
    setYawLeftDone(false);
    setYawRightDone(false);
    lastBoxRef.current = null;
    stillFramesRef.current = 0;
    blinkPhaseRef.current = "idle";
    closedFramesRef.current = 0;
    openingFramesRef.current = 0;
    faceLostRef.current = true;
  }

  function resetLivenessProgress() {
    setBlinkDone(false);
    setYawLeftDone(false);
    setYawRightDone(false);
    blinkPhaseRef.current = "idle";
    closedFramesRef.current = 0;
    openingFramesRef.current = 0;
    stillFramesRef.current = 0;
    setSpoofSuspected(false);
    setFaceMessage("Blink once");
  }

  function startPipelines() {
    if (!webcamRef.current) return;
    const video = webcamRef.current.video;
    if (!video) return;

    const detector = new FaceDetection({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });
    detector.setOptions({ model: "short", minDetectionConfidence: 0.6 });
    detector.onResults(onFaceResults);
    fdRef.current = detector;

    const mesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    mesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    mesh.onResults(onMeshResults);
    fmRef.current = mesh;

    const cam = new Camera(video, {
      onFrame: async () => {
        if (runningRef.current) return;
        runningRef.current = true;
        try {
          if (fdRef.current) await fdRef.current.send({ image: video });
          if (fmRef.current) await fmRef.current.send({ image: video });
        } catch (_) {} finally {
          runningRef.current = false;
        }
      },
      width: 480,
      height: 480,
    });
    cam.start();
    camRef.current = cam;
  }

  function stopPipelines() {
    try {
      if (camRef.current) camRef.current.stop();
      camRef.current = null;
    } catch (_) {}
    fdRef.current = null;
    fmRef.current = null;
  }

  function onFaceResults(results) {
    const dets = results?.detections || [];

    if (dets.length === 0) {
      faceLostRef.current = true;
      setFaceOk(false);
      setFaceMessage("No face detected");
      setMultipleFaces(false);
      setBoxOverlay(null);
      stillFramesRef.current = 0;
      lastBoxRef.current = null;
      setSpoofSuspected(false);
      return;
    }

    setMultipleFaces(dets.length > 1);
    if (dets.length > 1) {
      faceLostRef.current = true;
      setFaceOk(false);
      setFaceMessage("Multiple faces detected");
      setBoxOverlay(null);
      setSpoofSuspected(false);
      return;
    }

    const d = dets[0];
    let box = null;
    const bb = d?.boundingBox;
    if (bb && typeof bb.width === "number" && typeof bb.height === "number") {
      const x = Math.max(0, Math.min(1, (bb.xCenter ?? 0) - bb.width / 2));
      const y = Math.max(0, Math.min(1, (bb.yCenter ?? 0) - bb.height / 2));
      box = { x, y, w: bb.width, h: bb.height };
    } else if (d.locationData?.relativeBoundingBox) {
      const r = d.locationData.relativeBoundingBox;
      box = { x: r.xMin, y: r.yMin, w: r.width, h: r.height };
    }

    if (!box) {
      faceLostRef.current = true;
      setFaceOk(false);
      setFaceMessage("Face box missing");
      setBoxOverlay(null);
      return;
    }

    setBoxOverlay(box);

    const area = (box.w || 0) * (box.h || 0);
    if (area < 0.10) {
      faceLostRef.current = true;
      setFaceOk(false);
      setFaceMessage("Move closer");
      stillFramesRef.current = 0;
      lastBoxRef.current = box;
      setSpoofSuspected(false);
      return;
    }

    let spoof = false;
    if (!yawRightDone && lastBoxRef.current) {
      const prev = lastBoxRef.current;
      const delta =
        Math.abs(prev.x - box.x) +
        Math.abs(prev.y - box.y) +
        Math.abs(prev.w - box.w) +
        Math.abs(prev.h - box.h);
      const EPS = 0.012;
      if (delta < EPS) stillFramesRef.current++;
      else stillFramesRef.current = 0;

      if (stillFramesRef.current > 45) spoof = true;
    }
    lastBoxRef.current = box;

    setSpoofSuspected(spoof);
    if (spoof) {
      setFaceOk(false);
      setFaceMessage("Move a bit (avoid static photo)");
      return;
    }

    if (faceLostRef.current) {
      resetLivenessProgress();
      faceLostRef.current = false;
    }

    setFaceOk(true);
    setFaceMessage(
      `Liveness: ${blinkDone ? "Blink ✓" : "Blink"} · ${yawLeftDone ? "Left ✓" : "Left"} · ${yawRightDone ? "Right ✓" : "Right"}`
    );
  }

  function onMeshResults(results) {
    const faces = results?.multiFaceLandmarks || [];
    if (!faces.length) return;
    const lm = faces[0];

    const L = [33, 159, 158, 133, 153, 144];
    const R = [362, 386, 385, 263, 373, 374];
    const left = L.map((i) => lm[i]);
    const right = R.map((i) => lm[i]);

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const earEye = (eye) => {
      const v1 = dist(eye[1], eye[5]);
      const v2 = dist(eye[2], eye[4]);
      const h = dist(eye[0], eye[3]);
      return h === 0 ? 0 : ((v1 + v2) / 2) / h;
    };
    const EAR = (earEye(left) + earEye(right)) / 2;
    const EAR_CLOSED = 0.20;

    if (!blinkDone) {
      if (blinkPhaseRef.current === "idle") {
        if (EAR < EAR_CLOSED) {
          blinkPhaseRef.current = "closed";
          closedFramesRef.current = 1;
        }
      } else if (blinkPhaseRef.current === "closed") {
        if (EAR < EAR_CLOSED) {
          closedFramesRef.current++;
        } else {
          blinkPhaseRef.current = "opening";
          openingFramesRef.current = 0;
        }
      } else if (blinkPhaseRef.current === "opening") {
        openingFramesRef.current++;
        if (EAR > EAR_CLOSED) {
          if (closedFramesRef.current >= 2) setBlinkDone(true);
          blinkPhaseRef.current = "idle";
          closedFramesRef.current = 0;
          openingFramesRef.current = 0;
        }
      }
    }

    const NOSE = lm[1];
    const ELO = lm[33];
    const ERO = lm[263];
    const midX = (ELO.x + ERO.x) / 2;
    const yawMetric = NOSE.x - midX;
    const YAW_THRESH = 0.02;

    if (!yawLeftDone && yawMetric < -YAW_THRESH) setYawLeftDone(true);
    if (!yawRightDone && yawMetric > YAW_THRESH) setYawRightDone(true);

    if (faceOk) {
      setFaceMessage(
        `Liveness: ${blinkDone ? "Blink ✓" : "Blink"} · ${yawLeftDone ? "Left ✓" : "Left"} · ${yawRightDone ? "Right ✓" : "Right"}`
      );
    }
  }

  const capture = () => {
    if (!canCapture || !webcamRef.current) return;
    const dataUrl = webcamRef.current.getScreenshot();
    if (!dataUrl) return;
    setCapturedImage(dataUrl);
  };

  const retake = () => {
    setCapturedImage(null);
    resetLivenessProgress();
  };

  const save = async () => {
    if (!capturedImage || busy) return;
    await onSave?.(capturedImage);
    closeCamera();
    resetAll();
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Profile Picture</h2>
      
      {!isOpen && !capturedImage && (
        <>
          <img
            src={currentImage || "https://www.w3schools.com/howto/img_avatar.png"}
            alt="Current"
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 mb-3"
          />
          <button
            onClick={openCamera}
            className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Use Camera
          </button>
        </>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-[500px] max-w-[90%] p-4 flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Take Photo</h2>

            {!capturedImage && (
              <>
                <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-2">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  mirrored
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user", width: 500, height: 500 }}
                  className="w-[480px] h-[480px]" // removed object-cover
                  style={{ backgroundColor: "transparent" }} // ensure no background
                />

  <div
    className={`absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium ${
      canCapture
        ? "bg-green-600 text-white"
        : spoofSuspected
        ? "bg-yellow-600 text-white"
        : faceOk
        ? "bg-indigo-600 text-white"
        : "bg-gray-700 text-white"
    }`}
  >
    {faceMessage}
  </div>
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


                <div className="text-xs text-gray-600 mb-3">
                  Liveness: Blink {blinkDone ? "✓" : ""} · Left {yawLeftDone ? "✓" : ""} · Right{" "}
                  {yawRightDone ? "✓" : ""}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={capture}
                    disabled={!canCapture}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      canCapture
                        ? "bg-[#3498db] hover:bg-[#2980b9] text-white"
                        : "bg-gray-300 text-gray-600 cursor-not-allowed"
                    }`}
                  >
                    Capture
                  </button>
                  <button
                    onClick={closeCamera}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {capturedImage && (
              <div className="flex flex-col items-center">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={retake}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Retake
                  </button>
                  <button
                    onClick={save}
                    disabled={busy}
                    className="bg-[#3498db] hover:bg-[#2980b9] disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    {busy ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      closeCamera();
                      resetAll();
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
