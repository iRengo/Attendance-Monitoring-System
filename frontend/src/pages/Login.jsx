import { signInWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
  getDocs as getDocsQuery,
} from "firebase/firestore";
import { auth, db } from "../firebase";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import ReCAPTCHA from "react-google-recaptcha";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import RegisterForm from "../components/registerForm";

import bannerBottom from "../assets/images/banner1.png";
import aicsLogo from "../../public/aics_logo.png";
import peoples from "../assets/images/peoples.png";
import anniversary29 from "../assets/images/29y.png";
import announcementBg from "../assets/images/announcements.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaValue, setCaptchaValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  // Mobile announcements state (hidden by default)
  const [mobileAnnouncementsOpen, setMobileAnnouncementsOpen] = useState(false);

  // Touch tracking refs (keeps the "swipe anywhere vertically" open/close behavior)
  const touchStartY = useRef(null);
  const touchCurrentY = useRef(null);
  const isDraggingPanel = useRef(false);

  // Real-time announcements
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const filtered = data.filter((a) => {
        const now = new Date();
        const exp = new Date(a.expiration);
        return (a.target === "students" || a.target === "all") && exp >= now;
      });
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt?.toDate?.() || 0) -
          new Date(a.createdAt?.toDate?.() || 0)
      );
      setAnnouncements(filtered);
    });
    return () => unsub();
  }, []);

  // Helper: login attempts tracking
  const ATTEMPTS_COLLECTION = "login_attempts";
  const LOCK_THRESHOLD = 3; // attempts
  const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  // UI state for attempts display (ONLY shown after a sign-in attempt)
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [showAttempts, setShowAttempts] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntilDisplay, setLockedUntilDisplay] = useState(null);
  const [lockedPersonalEmail, setLockedPersonalEmail] = useState(null);

  // read attempts doc and return data (or null)
  const getAttemptsDoc = async (emailLower) => {
    try {
      const ref = doc(db, ATTEMPTS_COLLECTION, emailLower);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.error("Failed to read attempts doc:", e);
      return null;
    }
  };

  // helper: try to find personal_email for a given school_email
  const fetchPersonalEmailForSchoolEmail = async (schoolEmail) => {
    try {
      const studentsQ = query(collection(db, "students"), where("school_email", "==", schoolEmail), limit(1));
      const teachersQ = query(collection(db, "teachers"), where("school_email", "==", schoolEmail), limit(1));

      const [sSnap, tSnap] = await Promise.all([getDocsQuery(studentsQ), getDocsQuery(teachersQ)]);

      if (!sSnap.empty) {
        const d = sSnap.docs[0].data();
        return d.personal_email || d.personalEmail || null;
      }
      if (!tSnap.empty) {
        const d = tSnap.docs[0].data();
        return d.personal_email || d.personalEmail || null;
      }
      return null;
    } catch (err) {
      console.error("Failed to fetch personal email:", err);
      return null;
    }
  };

  // record a failed attempt: increments count, sets lock when threshold reached
  // returns { locked: boolean, remaining: number, lockedUntil?: number }
  const recordFailedAttempt = async (emailLower) => {
    try {
      const ref = doc(db, ATTEMPTS_COLLECTION, emailLower);
      const snap = await getDoc(ref);
      const now = Date.now();
      let failedCount = 1;
      let lockedUntil = null;

      if (snap.exists()) {
        const d = snap.data();
        // If already locked, return locked info
        if (d?.lockedUntil && Number(d.lockedUntil) > now) {
          return { locked: true, remaining: 0, lockedUntil: Number(d.lockedUntil) };
        }
        failedCount = (Number(d?.failedCount || 0) || 0) + 1;
      }

      if (failedCount >= LOCK_THRESHOLD) {
        lockedUntil = now + LOCK_DURATION_MS;
        // reset failedCount after locking (optional)
        failedCount = 0;
      }

      await setDoc(
        ref,
        {
          failedCount,
          lastFailedAt: now,
          lockedUntil: lockedUntil ?? null,
        },
        { merge: true }
      );

      if (lockedUntil) {
        return { locked: true, remaining: 0, lockedUntil };
      }
      // remaining attempts = threshold - failedCount
      const remaining = Math.max(LOCK_THRESHOLD - failedCount, 0);
      return { locked: false, remaining };
    } catch (e) {
      console.error("Failed to record failed attempt:", e);
      return { locked: false, remaining: null };
    }
  };

  // clear attempts on successful login
  const clearAttempts = async (emailLower) => {
    try {
      const ref = doc(db, ATTEMPTS_COLLECTION, emailLower);
      await deleteDoc(ref);
    } catch (e) {
      console.error("Failed to clear attempts:", e);
      try {
        const ref = doc(db, ATTEMPTS_COLLECTION, emailLower);
        await setDoc(
          ref,
          { failedCount: 0, lastFailedAt: null, lockedUntil: null },
          { merge: true }
        );
      } catch (err) {
        console.error("Failed fallback clearAttempts:", err);
      }
    }
  };

  // LOGIN with maintenance & role checks + lock logic
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!captchaValue) {
      toast.error("Please complete the CAPTCHA!");
      return;
    }
    setLoading(true);
    setShowAttempts(false); // hide previous attempt info until we process this click
    setAttemptsLeft(null);
    setIsLocked(false);
    setLockedPersonalEmail(null);
    setLockedUntilDisplay(null);

    try {
      const emailTrimmed = email.trim().toLowerCase();

      // Check lock status BEFORE attempting sign-in
      const attempts = await getAttemptsDoc(emailTrimmed);
      const now = Date.now();
      if (attempts?.lockedUntil && Number(attempts.lockedUntil) > now) {
        const remainingMs = Number(attempts.lockedUntil) - now;
        const minutes = Math.ceil(remainingMs / 60000);
        const personal = await fetchPersonalEmailForSchoolEmail(emailTrimmed);
        if (personal) {
          setLockedPersonalEmail(personal);
          toast.error(
            `Account locked due to multiple failed login attempts. Try again in ${minutes} minute(s).`
          );
        } else {
          toast.error(
            `Account locked due to multiple failed login attempts. Try again in ${minutes} minute(s).`
          );
        }
        setIsLocked(true);
        setLockedUntilDisplay(`${Math.ceil(remainingMs / 60000)} minute(s)`);
        setLoading(false);
        return;
      }

      const maintenanceDoc = await getDoc(doc(db, "system_settings", "maintenance_mode"));
      const isMaintenance = maintenanceDoc.exists() ? maintenanceDoc.data().enabled : false;

      if (isMaintenance) {
        const adminSnapshot = await getDocs(collection(db, "admins"));
        const adminDoc = adminSnapshot.docs.find(
          (doc) => doc.data().email === emailTrimmed
        );
        if (!adminDoc) {
          toast.warning("System is currently under maintenance. Please try again later.");
          setLoading(false);
          return;
        }
      }

      const adminSnapshot = await getDocs(collection(db, "admins"));
      const adminDoc = adminSnapshot.docs.find(
        (doc) => doc.data().email === emailTrimmed
      );
      if (adminDoc) {
        try {
          await signInWithEmailAndPassword(auth, emailTrimmed, password);
        } catch (err) {
          // sign-in failed -> record attempt and surface error + update UI
          const res = await recordFailedAttempt(emailTrimmed);
          setShowAttempts(true);
          if (res.locked) {
            const personal = await fetchPersonalEmailForSchoolEmail(emailTrimmed);
            if (personal) setLockedPersonalEmail(personal);
            setIsLocked(true);
            setLockedUntilDisplay(`${Math.ceil((res.lockedUntil - Date.now()) / 60000)} minute(s)`);
            setAttemptsLeft(0);
            toast.error(
              `Account locked due to multiple failed login attempts. Personal email on file: ${personal ?? "N/A"}`
            );
          } else {
            setAttemptsLeft(res.remaining);
            toast.error(`Invalid credentials. ${res.remaining} attempt(s) left before lock.`);
          }
          throw err;
        }
        // success -> clear attempts
        await clearAttempts(emailTrimmed);

        localStorage.setItem(
          "user",
          JSON.stringify({
            uid: adminDoc.id,
            role: "admin",
            email: emailTrimmed,
          })
        );
        navigate("/admin/dashboard");
        return;
      }

      // Not admin -> normal user sign-in
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, password);
      } catch (err) {
        // failed sign-in -> record attempt and show error + update UI
        const res = await recordFailedAttempt(emailTrimmed);
        setShowAttempts(true);
        if (res.locked) {
          const personal = await fetchPersonalEmailForSchoolEmail(emailTrimmed);
          if (personal) setLockedPersonalEmail(personal);
          setIsLocked(true);
          setLockedUntilDisplay(`${Math.ceil((res.lockedUntil - Date.now()) / 60000)} minute(s)`);
          setAttemptsLeft(0);
          toast.error(
            `Account locked due to multiple failed login attempts. Personal email on file: ${personal ?? "N/A"}`
          );
        } else {
          setAttemptsLeft(res.remaining);
          toast.error(`Invalid credentials. ${res.remaining} attempt(s) left before lock.`);
        }
        throw err;
      }

      // successful auth -> clear attempts
      await clearAttempts(emailTrimmed);

      const collections = ["students", "teachers"];
      let userDoc = null;
      let userRole = null;
      for (const col of collections) {
        const q = await getDocs(collection(db, col));
        const docSnap = q.docs.find(
          (doc) => doc.data().school_email === emailTrimmed
        );
        if (docSnap) {
          userDoc = docSnap.data();
          userRole = col;
          break;
        }
      }

      if (!userDoc) {
        toast.error("No user record found in Firestore!");
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          uid: userCredential.user.uid,
          role: userRole === "students" ? "student" : "teacher",
          email: emailTrimmed,
        })
      );

      if (userRole === "students") {
        navigate("/student/dashboard");
      } else if (userRole === "teachers") {
        navigate("/teacher/dashboard");
      } else {
        toast.error("Unknown user role.");
      }
    } catch (error) {
      console.error(error);
      // Provide clearer message for wrong password vs other errors when possible
      const msg = String(error?.message || error).toLowerCase();
      if (msg.includes("wrong-password") || msg.includes("invalid")) {
        // Already handled attempts and toasts above; show fallback
        toast.error("Invalid credentials. Please try again.");
      } else if (msg.includes("user-not-found")) {
        toast.error("Account not found. Please check your email.");
      } else {
        toast.error("Login failed: " + (error?.message || error));
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Mobile-only swipe handling (NO button toggles) ---
  // Inverted behavior: swipe down (positive deltaY) opens panel, swipe up (negative) closes it.
  const onTouchStart = useCallback((e) => {
    // only on small screens
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
    if (!isDraggingPanel.current || touchStartY.current == null || touchCurrentY.current == null) {
      isDraggingPanel.current = false;
      touchStartY.current = null;
      touchCurrentY.current = null;
      return;
    }
    const deltaY = (touchCurrentY.current ?? 0) - (touchStartY.current ?? 0);
    // NEW: swipe down opens (deltaY > +60), swipe up closes (deltaY < -60)
    if (deltaY > 60) {
      setMobileAnnouncementsOpen(true);
    } else if (deltaY < -60) {
      setMobileAnnouncementsOpen(false);
    }
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

  // Helper used by onDragEnd to decide open/close based on drag offset/velocity
  function decidePanelState(offsetY = 0, velocityY = 0) {
    // offsetY positive => dragged down; negative => dragged up
    // If user drags down enough or with downward velocity => open
    if (offsetY > 80 || velocityY > 800) return true;
    // If user drags up enough or with upward velocity => close
    if (offsetY < -80 || velocityY < -800) return false;
    // Otherwise keep current
    return mobileAnnouncementsOpen;
  }

  // --- Render ---
  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row overflow-x-hidden bg-[#f2f4fa] relative">
      {/* LEFT SIDE - full width on mobile, 70% on desktop */}
      <div className="w-full md:w-[70%] flex-shrink-0">
        <AnimatePresence mode="wait">
          {!showRegister ? (
            <motion.div
              key="login-left"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -200, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="flex flex-col bg-white min-h-screen"
            >
              {/* HEADER */}
              <div className="relative h-24 w-full">
                <img
                  src={bannerBottom}
                  alt="Top Banner"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-between px-6">
                  <div className="flex items-center space-x-3">
                    <img
                      src={aicsLogo}
                      alt="AICS Logo"
                      className="h-30 object-contain"
                    />
                    <div className="text-white font-bold leading-tight">
                      <p>Asian Institute of</p>
                      <p>Computer Studies</p>
                    </div>
                  </div>

                  {/* desktop imagery unchanged */}
                  <div className="hidden md:flex items-center space-x-20">
                    <img
                      src={anniversary29}
                      alt="29 Years"
                      className="h-25 object-contain"
                    />
                    <img
                      src={peoples}
                      alt="People"
                      className="h-28 object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile swipe handle below header (visual only) */}
              <div className="md:hidden w-full">
                <div className="w-full px-6 -mt-2">
                  <div className="h-12 flex items-center justify-center relative">
                    <div className="w-44 h-8 bg-gradient-to-b from-[#1f5b86] to-[#2b79a6] rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-inner">
                      Announcements
                    </div>

                    {/* Animated swipe indicator (chevrons) pointing down */}
                    <motion.div
                      className="absolute -bottom-0 flex flex-col items-center gap-0 pointer-events-none"
                      aria-hidden
                      animate={{ y: [0, 6, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                    >
                      <svg className="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="none">
                        <path d="M6 9l6 6 6-6" stroke="black" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>

                    </motion.div>
                  </div>
                </div>
              </div>

              {/* LOGIN FORM centered */}
              <div className="flex-1 flex items-start justify-center py-10 md:py-40">
                <div className="bg-white border border-[#5F75AF] rounded-lg p-6 w-full max-w-sm shadow-lg mx-6">
                  <h2 className="text-xl font-bold text-center mb-1 text-[#5F75AF]">
                    Attendance Monitoring Portal
                  </h2>
                  <p className="text-center text-sm text-[#5F75AF] mb-6">
                    Bacoor Branch
                  </p>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <InputField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="text-[#5F75AF] placeholder-[#5F75AF]"
                    />

                    <div className="relative">
                      <InputField
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="text-[#5F75AF] placeholder-[#5F75AF]"
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 cursor-pointer text-[#5F75AF]"
                        aria-hidden
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 15.937 7.24 19.5 12 19.5c1.563 0 3.06-.34 4.417-.95M9.88 9.88a3 3 0 104.24 4.24" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l5.25 5.25M4.5 4.5l15 15" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.272 4.5 12 4.5c4.728 0 8.577 3.01 9.964 7.183a1.012 1.012 0 010 .639C20.577 16.49 16.728 19.5 12 19.5c-4.728 0-8.577-3.01-9.964-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </span>
                    </div>

                    {/* Attempts / Locked UI (shows remaining after clicking Sign In) */}
                    <div className="text-right text-sm text-red-600">
                      {isLocked ? (
                        <div>
                          Account locked. Try again in: {lockedUntilDisplay}
                          {lockedPersonalEmail ? (
                            <div className="text-xs text-red-400 mt-1">
                            </div>
                          ) : null}
                        </div>
                      ) : showAttempts && attemptsLeft !== null ? (
                        attemptsLeft > 0 ? (
                          <div className="text-sm text-yellow-700">
                            {attemptsLeft} attempt{attemptsLeft > 1 ? "s" : ""} left
                          </div>
                        ) : (
                          <div className="text-sm text-yellow-700">No attempts left — next failed try will lock the account</div>
                        )
                      ) : null}
                    </div>

                    <div className="flex justify-center">
                      <ReCAPTCHA
                        sitekey="6LdTcQ8sAAAAAEX8gXXKeEvkAKft0STWWZo3jZqK"
                        onChange={(value) => setCaptchaValue(value)}
                      />
                    </div>

                    <p
                      className="text-sm text-[#5F75AF] text-right cursor-pointer"
                      onClick={() => navigate("/forgot-password")}
                    >
                      Forgot password?
                    </p>

                    <button
                      type="submit"
                      disabled={loading || isLocked}
                      className="w-full py-2 rounded text-white bg-[#5F75AF] disabled:opacity-50"
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </button>
                  </form>
                </div>
              </div>

            {/* MOBILE ANNOUNCEMENTS — overlay on top of login */}
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
                      const shouldOpen = decidePanelState(info.offset.y, info.velocity.y);
                      setMobileAnnouncementsOpen(Boolean(shouldOpen));
                    }}
                    className="relative w-full max-w-md"
                    style={{ touchAction: "pan-y" }}
                  >
                    <div
                      className="w-full bg-gradient-to-b from-[#2b6aa3] to-[#2d5f83] text-white p-5 rounded-2xl shadow-2xl relative overflow-hidden"
                      style={{ minHeight: "50vh" }}
                    >
                      <h3 className="text-white font-semibold text-center mb-4">Announcements</h3>
                      <div className="space-y-4 max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/30">
                        {announcements.length === 0 ? (
                          <div className="text-sm text-white/80 px-2">No announcements at the moment.</div>
                        ) : (
                          announcements.map((a) => (
                            <div key={a.id} className="bg-white/6 border border-white/30 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-white/95">{a.title}</h4>
                              <p className="text-[13px] mt-2 leading-snug whitespace-pre-line text-white/90">{a.content}</p>
                              <div className="mt-3 text-[11px] text-white/70 flex items-center justify-between">
                                <span>Expires: {new Date(a.expiration).toLocaleDateString()}</span>
                                <span className="text-xs bg-white/10 px-2 py-0.5 rounded">{a.priority ?? "Info"}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* SWIPE UP hint */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm opacity-80 font-semibold">
                        Swipe Up to Close
                      </div>
                    </div>
                  </motion.div>
                </motion.section>
              )}
            </AnimatePresence>
            </motion.div>
          ) : (
            <div className="text-white text-center p-6">
              <h1 className="text-3xl font-bold mb-2">
                Welcome to AICS Attendance Portal
              </h1>
              <p className="text-sm opacity-90">
                Join us and manage your attendance seamlessly.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT SIDE - Desktop announcements (unchanged) */}
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
                    <li
                      key={a.id}
                      className="border border-white/30 rounded-lg p-5 hover:bg-white/20 transition"
                    >
                      <h4 className="font-semibold">{a.title}</h4>
                      <p className="text-xs opacity-90 whitespace-pre-line">{a.content}</p>
                      <p className="text-[10px] text-gray-300 mt-1">
                        Expires: {new Date(a.expiration).toLocaleDateString()}
                      </p>
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