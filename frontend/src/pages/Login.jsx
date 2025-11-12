import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, getDocs, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import ReCAPTCHA from "react-google-recaptcha";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import RegisterForm from "../components/registerForm";

import bannerBottom from "../assets/images/banner1.png";
import aicsLogo from "../assets/images/aics_logo.png";
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

  // ✅ Real-time announcement sync
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

  // ✅ LOGIN FUNCTION WITH MAINTENANCE CHECK
  // ✅ LOGIN FUNCTION WITH MAINTENANCE CHECK
const handleLogin = async (e) => {
  e.preventDefault();

  if (!captchaValue) {
    toast.error("Please complete the CAPTCHA!");
    return;
  }

  setLoading(true);

  try {
    const emailTrimmed = email.trim().toLowerCase();

    // Step 1: Check maintenance mode
    const maintenanceDoc = await getDoc(doc(db, "system_settings", "maintenance_mode"));
    const isMaintenance = maintenanceDoc.exists() ? maintenanceDoc.data().enabled : false;

    // Step 2: If under maintenance, only allow admins
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

    // Step 3: Check Admins collection
    const adminSnapshot = await getDocs(collection(db, "admins"));
    const adminDoc = adminSnapshot.docs.find(
      (doc) => doc.data().email === emailTrimmed
    );

    if (adminDoc) {
      await signInWithEmailAndPassword(auth, emailTrimmed, password);
      // ✅ Save admin info
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

    // Step 4: Check students or teachers
    const userCredential = await signInWithEmailAndPassword(
      auth,
      emailTrimmed,
      password
    );

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

    // ✅ Save student or teacher info
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
    toast.error("Login failed: " + error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen w-screen flex overflow-hidden bg-[#f2f4fa] relative">
      {/* LEFT SIDE */}
      <div className="relative w-[70%] overflow-hidden">
        <AnimatePresence mode="wait">
          {!showRegister ? (
            <motion.div
              key="login-left"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -200, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="absolute inset-0 flex flex-col bg-white"
            >
              {/* HEADER */}
              <div className="relative h-24 w-full mb-4 mt-2">
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
                  <div className="flex items-center space-x-20">
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

              {/* LOGIN FORM */}
              <div className="flex-1 flex items-center justify-center">
                <div className="bg-white border border-[#5F75AF] rounded-md p-8 w-full max-w-sm shadow-lg">
                  <h2 className="text-xl font-bold text-center mb-2 text-[#5F75AF]">
                    Attendance Monitoring Portal
                  </h2>
                  <p className="text-center text-sm text-[#5F75AF] mb-8">
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

                {/* 👁 Simple eye icon toggle (no external library) */}
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 cursor-pointer text-[#5F75AF]"
                >
                  {showPassword ? (
                    // 👁 Eye-slash icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 15.937 7.24 19.5 12 19.5c1.563 0 3.06-.34 4.417-.95M9.88 9.88a3 3 0 104.24 4.24"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 15l5.25 5.25M4.5 4.5l15 15"
                      />
                    </svg>
                  ) : (
                    // 👁 Regular eye icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.272 4.5 12 4.5c4.728 0 8.577 3.01 9.964 7.183a1.012 1.012 0 010 .639C20.577 16.49 16.728 19.5 12 19.5c-4.728 0-8.577-3.01-9.964-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </span>
              </div>
                    <div className="flex justify-center">
                      <ReCAPTCHA
                        sitekey="6LdzQNErAAAAAKIH3fsDMMAszSHEjjzWrhFwNVg9"
                        onChange={(value) => setCaptchaValue(value)}
                      />
                    </div>

                    <p className="text-sm text-[#5F75AF] text-right cursor-pointer">
                      Forgot password?
                    </p>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 rounded text-white bg-[#5F75AF] disabled:opacity-50"
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </button>
                  </form>

                  {/* Register Link */}
                  <p
                    onClick={() => setShowRegister(true)}
                    className="text-center mt-4 text-sm text-[#5F75AF] cursor-pointer hover:underline"
                  >
                    Don’t have an account? Register
                  </p>
                </div>
              </div>

              {/* FOOTER */}
              <div className="h-5 w-full flex items-center justify-center">
                <img
                  src={bannerBottom}
                  alt="Bottom Banner"
                  className="h-full w-full object-cover"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="register-left"
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center bg-[#5F75AF]"
            >
              <div className="text-white text-center">
                <h1 className="text-3xl font-bold mb-2">
                  Welcome to AICS Attendance Portal
                </h1>
                <p className="text-sm opacity-90">
                  Join us and manage your attendance seamlessly.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT SIDE - 🔔 ANNOUNCEMENTS PANEL */}
      <div className="relative w-[30%] overflow-hidden">
        <AnimatePresence mode="wait">
          {!showRegister ? (
            <motion.div
              key="announcements"
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 200, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 flex flex-col items-center justify-start p-6"
              style={{
                backgroundImage: `url(${announcementBg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="w-full h-full bg-[#00000060] border-2 border-white rounded-lg p-6 overflow-hidden">
                <h2 className="text-lg font-bold text-white mb-3">
                  Announcements
                </h2>

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
                        <p className="text-xs opacity-90 whitespace-pre-line">
                          {a.content}
                        </p>

                        <p className="text-[10px] text-gray-300 mt-1">
                          Expires:{" "}
                          {new Date(a.expiration).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="register-right"
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 200, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center bg-white p-6"
            >
              <div className="w-full max-w-md">
                <h2 className="text-xl font-bold text-[#5F75AF] text-center mb-6">
                  Create Your Account
                </h2>

                <RegisterForm onClose={() => setShowRegister(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
