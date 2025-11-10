import { useCallback, useRef, useState } from "react";
import { FaceDetection } from "@mediapipe/face_detection";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export default function useLivenessPipeline() {
  const [faceOk, setFaceOk] = useState(false);
  const [faceMessage, setFaceMessage] = useState("Point your face to the camera");
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [spoofSuspected, setSpoofSuspected] = useState(false);
  const [boxOverlay, setBoxOverlay] = useState(null);

  const [blinkDone, setBlinkDone] = useState(false);
  const [yawLeftDone, setYawLeftDone] = useState(false);
  const [yawRightDone, setYawRightDone] = useState(false);
  const canCapture = faceOk && !spoofSuspected && blinkDone && yawLeftDone && yawRightDone;

  const fdRef = useRef(null);
  const fmRef = useRef(null);
  const camRef = useRef(null);
  const lastBoxRef = useRef(null);
  const stillFramesRef = useRef(0);
  const runningRef = useRef(false);
  const blinkPhaseRef = useRef("idle");
  const closedFramesRef = useRef(0);
  const openingFramesRef = useRef(0);
  const faceLostRef = useRef(false);

  const resetLivenessProgress = useCallback(() => {
    setBlinkDone(false);
    setYawLeftDone(false);
    setYawRightDone(false);
    blinkPhaseRef.current = "idle";
    closedFramesRef.current = 0;
    openingFramesRef.current = 0;
    stillFramesRef.current = 0;
    setFaceMessage("Blink once");
  }, []);

  const stopPipelines = useCallback(() => {
    try {
      camRef.current?.stop();
    } catch (_) {}
    camRef.current = null;
    fdRef.current = null;
    fmRef.current = null;
    setFaceOk(false);
    setSpoofSuspected(false);
    setMultipleFaces(false);
    setBoxOverlay(null);
    setFaceMessage("Point your face to the camera");
    lastBoxRef.current = null;
    stillFramesRef.current = 0;
    faceLostRef.current = true;
    blinkPhaseRef.current = "idle";
    closedFramesRef.current = 0;
    openingFramesRef.current = 0;
  }, []);

  const onFaceResults = useCallback(
    (results) => {
      const dets = results?.detections || [];
      if (!dets.length) {
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
      if (bb && typeof bb.width === "number") {
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
        setFaceMessage("Face detected but box missing");
        setBoxOverlay(null);
        return;
      }
      setBoxOverlay(box);
      const area = box.w * box.h;
      if (area < 0.1) {
        faceLostRef.current = true;
        setFaceOk(false);
        setFaceMessage("Move closer to the camera");
        stillFramesRef.current = 0;
        lastBoxRef.current = box;
        setSpoofSuspected(false);
        return;
      }
      let spoof = false;
      if (lastBoxRef.current) {
        const prev = lastBoxRef.current;
        const delta =
          Math.abs(prev.x - box.x) +
          Math.abs(prev.y - box.y) +
          Math.abs(prev.w - box.w) +
          Math.abs(prev.h - box.h);
        const EPS = 0.01;
        if (delta < EPS) stillFramesRef.current++;
        else stillFramesRef.current = 0;
        if (stillFramesRef.current > 30) spoof = true;
      }
      lastBoxRef.current = box;
      setSpoofSuspected(spoof);
      if (spoof) {
        setFaceOk(false);
        setFaceMessage("Please move your head slightly");
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
    },
    [blinkDone, yawLeftDone, yawRightDone, resetLivenessProgress]
  );

  const onMeshResults = useCallback(
    (results) => {
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
      const EAR_CLOSED = 0.2;
      if (!blinkDone) {
        if (blinkPhaseRef.current === "idle" && EAR < EAR_CLOSED) {
          blinkPhaseRef.current = "closed";
          closedFramesRef.current = 1;
        } else if (blinkPhaseRef.current === "closed") {
          if (EAR < EAR_CLOSED) closedFramesRef.current++;
          else {
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
    },
    [blinkDone, yawLeftDone, yawRightDone, faceOk]
  );

  const startPipelines = useCallback((videoEl) => {
    if (!videoEl) return;
    const detector = new FaceDetection({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });
    detector.setOptions({ model: "short", minDetectionConfidence: 0.6 });
    detector.onResults(onFaceResults);
    fdRef.current = detector;

    const mesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    mesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    mesh.onResults(onMeshResults);
    fmRef.current = mesh;

    const cam = new Camera(videoEl, {
      onFrame: async () => {
        if (runningRef.current) return;
        runningRef.current = true;
        try {
          await fdRef.current?.send({ image: videoEl });
          await fmRef.current?.send({ image: videoEl });
        } catch (_) {
        } finally {
          runningRef.current = false;
        }
      },
      width: 640,
      height: 640,
    });

    stillFramesRef.current = 0;
    lastBoxRef.current = null;
    faceLostRef.current = true;
    setFaceOk(false);
    setSpoofSuspected(false);
    setMultipleFaces(false);
    setFaceMessage("Detecting face...");
    resetLivenessProgress();
    cam.start();
    camRef.current = cam;
  }, [onFaceResults, onMeshResults, resetLivenessProgress]);

  return {
    // states
    faceOk,
    faceMessage,
    multipleFaces,
    spoofSuspected,
    boxOverlay,
    blinkDone,
    yawLeftDone,
    yawRightDone,
    canCapture,
    // controls
    startPipelines,
    stopPipelines,
    resetLivenessProgress,
  };
}