import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp, collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import axios from "axios";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

import bannerBottom from "../assets/images/banner1.png";
import aicsLogo from "../../public/aics_logo.png";
import peoples from "../assets/images/peoples.png";
import anniversary29 from "../assets/images/29y.png";
import announcementBg from "../assets/images/announcements.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [resetDoc, setResetDoc] = useState(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [mobileAnnouncementsOpen, setMobileAnnouncementsOpen] = useState(false);

  const touchStartY = useRef(null);
  const touchCurrentY = useRef(null);
  const isDraggingPanel = useRef(false);

  // Validate reset token
  useEffect(() => {
    async function validate() {
      if (!token) {
        setValid(false);
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, "password_resets", token);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setValid(false);
          setLoading(false);
          return;
        }
        const data = snap.data();
        if (!data || data.used) {
          toast.error(data?.used ? "This reset link has already been used." : "Invalid reset link.");
          setValid(false);
          setLoading(false);
          return;
        }
        let expiresAt = data.expiresAt ? (data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)) : null;
        if (expiresAt && expiresAt < new Date()) {
          toast.error("This reset link has expired.");
          setValid(false);
          setLoading(false);
          return;
        }
        setResetDoc({ id: snap.id, ...data });
        setValid(true);
      } catch (err) {
        console.error(err);
        toast.error("Failed to validate reset token.");
        setValid(false);
      } finally {
        setLoading(false);
      }
    }
    validate();
  }, [token]);

  // Fetch announcements (real-time)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const filtered = data.filter((a) => {
        const now = new Date();
        const exp = new Date(a.expiration);
        return (a.target === "students" || a.target === "all") && exp >= now;
      });
      filtered.sort((a, b) => (new Date(b.createdAt?.toDate?.() || 0) - new Date(a.createdAt?.toDate?.() || 0)));
      setAnnouncements(filtered);
    });
    return () => unsub();
  }, []);

  // Mobile swipe handling
  const onTouchStart = useCallback((e) => {
    if (window.innerWidth >= 768) return;
    touchStartY.current = e.touches?.[0]?.clientY ?? null;
    touchCurrentY.current = touchStartY.current;
    isDraggingPanel.current = true;
  }, []);
  const onTouchMove = useCallback((e) => {
    if (!isDraggingPanel.current || touchStartY.current == null) return;
    touchCurrentY.current = e.touches?.[0]?.clientY ?? touchCurrentY.current;
  }, []);
  const onTouchEnd = useCallback(() => {
    if (!isDraggingPanel.current) return;
    const deltaY = (touchCurrentY.current ?? 0) - (touchStartY.current ?? 0);
    if (deltaY > 60) setMobileAnnouncementsOpen(true);
    else if (deltaY < -60) setMobileAnnouncementsOpen(false);
    isDraggingPanel.current = false;
    touchStartY.current = null;
    touchCurrentY.current = null;
  }, []);
  useEffect(() => {
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid || !resetDoc) return;
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) throw new Error("No server endpoint configured.");
      const res = await axios.post(`${apiUrl}/password/complete-reset`, { token, newPassword: password });
      if (!res.data?.success) throw new Error(res.data?.message || "Reset failed");
      toast.success(res.data.message || "Password reset successfully");
      try {
        await updateDoc(doc(db, "password_resets", token), { used: true, usedAt: serverTimestamp() });
      } catch (err) {
        console.warn(err);
      }
      setTimeout(() => navigate("/login"), 1400);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center p-4">Validating reset token...</div>;

  if (!valid)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-2">Invalid or expired link</h3>
          <p className="text-sm text-gray-600 mb-4">
            The password reset link is invalid, expired, or already used.
          </p>
          <div className="flex gap-2">
            <button onClick={() => navigate("/forgot-password")} className="px-4 py-2 rounded bg-[#3498db] text-white">Request new link</button>
            <button onClick={() => navigate("/login")} className="px-4 py-2 rounded bg-gray-100">Back to login</button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row overflow-x-hidden bg-[#f2f4fa] relative">
      {/* LEFT SIDE */}
      <div className="w-full md:w-[70%] flex-shrink-0">
        <AnimatePresence mode="wait">
          <motion.div
            key="reset-left"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -200, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="flex flex-col bg-white min-h-screen"
          >
            {/* HEADER */}
            <div className="relative h-24 w-full">
              <img src={bannerBottom} alt="Top Banner" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-between px-6">
                <div className="flex items-center space-x-3">
                  <img src={aicsLogo} alt="AICS Logo" className="h-30 object-contain" />
                  <div className="text-white font-bold leading-tight">
                    <p>Asian Institute of</p>
                    <p>Computer Studies</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center space-x-20">
                  <img src={anniversary29} alt="29 Years" className="h-25 object-contain" />
                  <img src={peoples} alt="People" className="h-28 object-contain" />
                </div>
              </div>
            </div>

            {/* FORM */}
            <div className="flex-1 flex items-start justify-center py-10 md:py-40">
              <div className="bg-white border border-[#5F75AF] rounded-lg p-6 w-full max-w-sm shadow-lg mx-6">
                <h2 className="text-xl font-bold text-center mb-1 text-[#5F75AF]">
                  Reset Your Password
                </h2>
                <p className="text-center text-sm text-[#5F75AF] mb-6">
                Resetting for: <strong>{resetDoc.authEmail || resetDoc.personalEmail || "Email"}</strong>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full border rounded px-3 py-2 text-[#5F75AF] placeholder-[#5F75AF]"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F75AF] focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>


                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full border rounded px-3 py-2 text-[#5F75AF] placeholder-[#5F75AF]"
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2 rounded text-white bg-[#5F75AF] disabled:opacity-50"
                    >
                      {submitting ? "Saving..." : "Set new password"}
                    </button>
                    <button type="button" onClick={() => navigate("/login")} className="px-4 py-2 text-gray-700 rounded bg-gray-100">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* MOBILE ANNOUNCEMENTS */}
            <AnimatePresence>
              {mobileAnnouncementsOpen && (
                <motion.section
                  key="mobile-announcements"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 z-50 md:hidden flex items-start justify-center bg-black/40 p-6"
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  <motion.div
                    drag="y"
                    dragConstraints={{ top: -600, bottom: 0 }}
                    dragElastic={0.18}
                    onDragEnd={(event, info) => {
                      const offsetY = info.offset.y;
                      setMobileAnnouncementsOpen(offsetY > 0);
                    }}
                    className="relative w-full max-w-md"
                    style={{ touchAction: "pan-y" }}
                  >
                    <div className="w-full bg-gradient-to-b from-[#2b6aa3] to-[#2d5f83] text-white p-5 rounded-2xl shadow-2xl relative overflow-hidden" style={{ minHeight: "50vh" }}>
                      <h3 className="text-white font-semibold text-center mb-4">Announcements</h3>
                      <div className="space-y-4 max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/30">
                        {announcements.length === 0 ? (
                          <div className="text-sm text-white/80 px-2">No announcements at the moment.</div>
                        ) : announcements.map((a) => (
                          <div key={a.id} className="bg-white/6 border border-white/30 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-white/95">{a.title}</h4>
                            <p className="text-[13px] mt-2 leading-snug whitespace-pre-line text-white/90">{a.content}</p>
                            <div className="mt-3 text-[11px] text-white/70 flex items-center justify-between">
                              <span>Expires: {new Date(a.expiration).toLocaleDateString()}</span>
                              <span className="text-xs bg-white/10 px-2 py-0.5 rounded">{a.priority ?? "Info"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm opacity-80 font-semibold">
                        Swipe Up to Close
                      </div>
                    </div>
                  </motion.div>
                </motion.section>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* RIGHT SIDE - Desktop Announcements */}
      <div className="hidden md:block md:w-[30%]">
        <div className="relative w-full h-full overflow-hidden">
          <div
            className="absolute inset-0 flex flex-col items-center justify-start p-6"
            style={{
              backgroundImage: `url(${announcementBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="w-full h-full bg-[#00000060] border-2 border-white rounded-lg p-6 overflow-hidden">
              <h2 className="text-lg font-bold text-white mb-3">Announcements</h2>
              {announcements.length === 0 ? (
                <p className="text-gray-200 text-sm">No announcements yet.</p>
              ) : (
                <ul className="space-y-3 text-lg text-white max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/40">
                  {announcements.map((a) => (
                    <li key={a.id} className="border border-white/30 rounded-lg p-5 hover:bg-white/20 transition">
                      <h4 className="font-semibold">{a.title}</h4>
                      <p className="text-xs opacity-90 whitespace-pre-line">{a.content}</p>
                      <p className="text-[10px] text-gray-300 mt-1">Expires: {new Date(a.expiration).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
