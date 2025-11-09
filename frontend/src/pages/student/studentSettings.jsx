import { useState, useEffect, useRef, useMemo } from "react";
import StudentLayout from "../../components/studentLayout";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { updatePassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import Webcam from "react-webcam";
import { FaceDetection } from "@mediapipe/face_detection";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export default function StudentSettings() {
  const [activeTab, setActiveTab] = useState("account");
  const [studentData, setStudentData] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    school_email: "",
    profilePic: "",
  });

  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const webcamRef = useRef(null);

  // Face & liveness
  const [faceOk, setFaceOk] = useState(false);
  const [faceMessage, setFaceMessage] = useState("Point your face to the camera");
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [spoofSuspected, setSpoofSuspected] = useState(false);
  const [boxOverlay, setBoxOverlay] = useState(null);

  const [blinkDone, setBlinkDone] = useState(false);
  const [yawLeftDone, setYawLeftDone] = useState(false);
  const [yawRightDone, setYawRightDone] = useState(false);
  const canCapture = faceOk && !spoofSuspected && blinkDone && yawLeftDone && yawRightDone;

  // Internals
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

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return toast.error("No logged-in user found!");
        const ref = doc(db, "students", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setStudentData({
            firstname: data.firstname || "",
            middlename: data.middlename || "",
            lastname: data.lastname || "",
            school_email: data.school_email || data.email || "",
            profilePic: data.profilePicUrl || "",
          });
        } else {
          toast.error("Student record not found!");
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to fetch student data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePasswordChange = (e) =>
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleChangePassword = async () => {
    if (!passwords.new || !passwords.confirm) return toast.error("Please fill both fields");
    if (passwords.new !== passwords.confirm) return toast.error("Passwords do not match");
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regex.test(passwords.new))
      return toast.error(
        "Password must be at least 8 characters long and include 1 uppercase, 1 lowercase, and 1 number."
      );

    try {
      const user = auth.currentUser;
      if (!user) return toast.error("User not logged in");
      await updatePassword(user, passwords.new);
      // Clear temp_password so banner in layout disappears
      await updateDoc(doc(db, "students", user.uid), { temp_password: null });
      toast.success("Password updated successfully!");
      setPasswords({ new: "", confirm: "" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to update password: " + e.message);
    }
  };

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
    toast.error("Allow camera permissions or try another browser.");
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!canCapture) return toast.error("Complete blink + left + right first.");
    const img = webcamRef.current?.getScreenshot();
    if (!img) return toast.error("Failed to capture photo.");
    setCapturedImage(img);
  };
  const retakePhoto = () => {
    setCapturedImage(null);
    resetLivenessProgress();
  };

  function dataURLtoBlob(dataUrl) {
    const [meta, data] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(data || "");
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }

  const saveCapturedPhoto = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return toast.error("User not logged in");
      if (!capturedImage) return toast.error("No captured image");
      const blob = dataURLtoBlob(capturedImage);
      const file = new File([blob], "profile.jpg", { type: blob.type });
      const formData = new FormData();
      formData.append("file", file);
      setUploading(true);
      const res = await fetch(
        `http://localhost:3000/student/upload-profile-picture/${user.uid}`,
        { method: "POST", body: formData }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");
      setStudentData((prev) => ({ ...prev, profilePic: json.imageUrl }));
      toast.success("Profile picture updated!");
      closeCamera();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save photo");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!isCameraOpen) {
      stopPipelines();
      return;
    }
    startPipelines();
    return stopPipelines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOpen]);

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

    const cam = new Camera(video, {
      onFrame: async () => {
        if (runningRef.current) return;
        runningRef.current = true;
        try {
          await fdRef.current?.send({ image: video });
          await fmRef.current?.send({ image: video });
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
  }

  function stopPipelines() {
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
  }

  function resetLivenessProgress() {
    setBlinkDone(false);
    setYawLeftDone(false);
    setYawRightDone(false);
    blinkPhaseRef.current = "idle";
    closedFramesRef.current = 0;
    openingFramesRef.current = 0;
    stillFramesRef.current = 0;
    setFaceMessage("Blink once");
  }

  function onFaceResults(results) {
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
  }

  return (
    <StudentLayout title="Settings">
      <div className="flex border-b border-[#415CA0] mb-6 gap-6">
        <button
          onClick={() => setActiveTab("account")}
          className={`pb-3 font-semibold transition-colors ${
            activeTab === "account"
              ? "text-[#415CA0] border-b-2 border-[#415CA0]"
              : "text-gray-400 hover:text-[#415CA0]"
          }`}
        >
          Account
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-3 font-semibold transition-colors ${
            activeTab === "profile"
              ? "text-[#415CA0] border-b-2 border-[#415CA0]"
              : "text-gray-400 hover:text-[#415CA0]"
          }`}
        >
          Profile
        </button>
      </div>

      {activeTab === "account" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Account Information
            </h2>
            {loading ? (
              <p className="text-gray-500">Loading account info...</p>
            ) : (
              <div className="space-y-5">
                {["firstname", "middlename", "lastname", "school_email"].map((field) => (
                  <div key={field}>
                    <label className="text-gray-600 text-sm capitalize">
                      {field.replace("_", " ")}
                    </label>
                    <input
                      type="text"
                      value={studentData[field]}
                      readOnly
                      className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 cursor-not-allowed"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Change Password
            </h2>
            <div className="space-y-5">
              <PasswordField
                label="New Password"
                name="new"
                value={passwords.new}
                onChange={handlePasswordChange}
                show={showNewPassword}
                toggleShow={() => setShowNewPassword((s) => !s)}
              />
              <PasswordField
                label="Confirm New Password"
                name="confirm"
                value={passwords.confirm}
                onChange={handlePasswordChange}
                show={showConfirmPassword}
                toggleShow={() => setShowConfirmPassword((s) => !s)}
              />
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleChangePassword}
                  className="bg-[#3498db] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#2980b9] transition"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Profile Info
            </h2>
            <p className="text-gray-700 text-sm">
              Customize your profile details here (coming soon).
            </p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200 flex flex-col items-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Profile Picture
            </h2>
            <div className="flex flex-col items-center w-full">
              {!isCameraOpen && !capturedImage && (
                <>
                  <img
                    src={
                      studentData.profilePic ||
                      "https://www.w3schools.com/howto/img_avatar.png"
                    }
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
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-2 bg-black">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      mirrored
                      screenshotFormat="image/jpeg"
                      videoConstraints={videoConstraints}
                      className="w-64 h-64 object-cover"
                      onUserMediaError={handleUserMediaError}
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
                    Liveness: Blink {blinkDone ? "✓" : "…"} · Left {yawLeftDone ? "✓" : "…"} · Right {yawRightDone ? "✓" : "…"}
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
                      onClick={closeCamera}
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
                      onClick={retakePhoto}
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
                      onClick={closeCamera}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}

function PasswordField({ label, name, value, onChange, show, toggleShow }) {
  return (
    <div className="relative">
      <label className="text-gray-600 text-sm">{label}</label>
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-[#3498db] focus:outline-none"
      />
      <button
        type="button"
        onClick={toggleShow}
        className="absolute right-3 top-8 text-gray-500"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}