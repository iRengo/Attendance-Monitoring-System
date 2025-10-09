import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

import { useState } from "react";
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

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!captchaValue) {
      toast.error("Please complete the CAPTCHA!");
      return;
    }

    setLoading(true);

    try {
      const emailTrimmed = email.trim().toLowerCase();

      // 🔍 Check Admin collection first
      const adminSnapshot = await getDocs(collection(db, "admins"));
      const adminDoc = adminSnapshot.docs.find((doc) => doc.data().email === emailTrimmed);

      if (adminDoc) {
        const adminData = adminDoc.data();
        const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, password);

        if (adminData.status === "active" || !adminData.status) {
          navigate("/admin/dashboard");
          return;
        } else {
          toast.warning("Admin account is inactive or unapproved.");
          return;
        }
      }

      // 🔍 If not admin, try normal users
      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, password);
      const user = userCredential.user;

      const collections = ["students", "teachers"];
      let userDoc = null;
      let userRole = null;

      for (const col of collections) {
        const q = await getDocs(collection(db, col));
        const docSnap = q.docs.find((doc) => doc.data().email === emailTrimmed);

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

      if (userDoc.status !== "approved") {
        toast.warning("Your account is pending admin approval.");
        return;
      }

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

              <div className="relative h-24 w-full mb-4 mt-2">
                <img src={bannerBottom} alt="Top Banner" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-between px-6">
                  <div className="flex items-center space-x-3">
                    <img src={aicsLogo} alt="AICS Logo" className="h-30 object-contain" />
                    <div className="text-white font-bold leading-tight">
                      <p>Asian Institute of</p>
                      <p>Computer Studies</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-20">
                    <img src={anniversary29} alt="29 Years" className="h-25 object-contain" />
                    <img src={peoples} alt="People" className="h-28 object-contain" />
                  </div>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <div className="bg-white border border-[#5F75AF] rounded-md p-8 w-full max-w-sm shadow-lg">
                  <h2 className="text-xl font-bold text-center mb-2 text-[#5F75AF]">
                    Attendance Monitoring Portal
                  </h2>
                  <p className="text-center text-sm text-[#5F75AF] mb-8">Bacoor Branch</p>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <InputField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="text-[#5F75AF] placeholder-[#5F75AF]"
                    />

                    <InputField
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="text-[#5F75AF] placeholder-[#5F75AF]"
                    />

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
                <img src={bannerBottom} alt="Bottom Banner" className="h-full w-full object-cover" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="register-left"
              initial={{ x: -300, opacity: 0 }}   // Start from the left
              animate={{ x: 0, opacity: 1 }}      // Move to center
              exit={{ x: -300, opacity: 0 }}      // Slide back to the left when exiting
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

      {/* RIGHT SIDE */}
      <div className="relative w-[30%] overflow-hidden">
        <AnimatePresence mode="wait">
          {!showRegister ? (
            <motion.div
              key="announcements"
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 200, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center p-6"
              style={{
                backgroundImage: `url(${announcementBg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="w-full h-full bg-transparent border-2 border-white rounded-lg p-6">
                <h2 className="text-lg font-bold text-white mb-4">Announcements</h2>
                <ul className="space-y-3 text-sm text-white">
                  <li>Class suspension on Sept 25 due to weather conditions.</li>
                </ul>
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

                {/* Our new RegisterForm */}
                <RegisterForm onClose={() => setShowRegister(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
