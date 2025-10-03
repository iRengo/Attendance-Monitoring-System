import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import ReCAPTCHA from "react-google-recaptcha";
import { toast } from "react-toastify";

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

      if (emailTrimmed.startsWith("s")) {
        navigate("/student/dashboard");
      } else if (emailTrimmed.startsWith("t")) {
        navigate("/teacher/dashboard");
      } else if (emailTrimmed.startsWith("a")) {
        navigate("/admin/dashboard");
      } else {
        toast.error("Invalid role. Use email starting with s, t, or a.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex">
      <div className="w-[70%] flex flex-col bg-white">
        <div className="relative h-24 w-full mb-4 mt-2">
          <img
            src={bannerBottom}
            alt="Top Banner"
            className="h-full w-full object-cover"
          />
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
                placeholder="Enter any password"
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
          </div>
        </div>

        <div className="h-5 w-full flex items-center justify-center">
          <img
            src={bannerBottom}
            alt="Bottom Banner"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div
        className="w-[30%] relative flex items-center justify-center p-6"
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
      </div>
    </div>
  );
}
