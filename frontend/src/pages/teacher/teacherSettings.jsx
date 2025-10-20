// frontend/src/pages/teacher/TeacherSettings.jsx
import { useState, useEffect } from "react";
import TeacherLayout from "../../components/teacherLayout";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { toast } from "react-toastify";
import { updatePassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";

export default function TeacherSettings() {
  const [activeTab, setActiveTab] = useState("account");
  const [teacherData, setTeacherData] = useState({
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

  // ✅ Fetch teacher data
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          toast.error("No logged-in user found!");
          return;
        }

        const docRef = doc(db, "teachers", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setTeacherData({
            firstname: data.firstname || "",
            middlename: data.middlename || "",
            lastname: data.lastname || "",
            school_email: data.school_email || data.email || "",
            profilePic: data.profilePicBinary
              ? `data:image/jpeg;base64,${data.profilePicBinary}`
              : "",
          });
        } else {
          toast.error("Teacher record not found!");
        }
      } catch (error) {
        console.error("Error fetching teacher data:", error);
        toast.error("Failed to fetch teacher data");
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, []);

  // ✅ Password input handler
  const handlePasswordChange = (e) =>
    setPasswords({ ...passwords, [e.target.name]: e.target.value });

  // ✅ Change password
  const handleChangePassword = async () => {
    if (!passwords.new || !passwords.confirm)
      return toast.error("Please fill in both password fields");

    if (passwords.new !== passwords.confirm)
      return toast.error("Passwords do not match!");

    try {
      const user = auth.currentUser;
      if (!user) return toast.error("User not logged in!");

      await updatePassword(user, passwords.new);
      toast.success("Password updated successfully!");
      setPasswords({ new: "", confirm: "" });
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password: " + error.message);
    }
  };

  // ✅ Handle profile picture upload (Base64)
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) {
      toast.error("User not logged in!");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result.split(",")[1];

      try {
        setUploading(true);
        const response = await fetch(
          `http://localhost:3000/teacher/upload-profile-picture/${user.uid}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64String }),
          }
        );

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Upload failed");

        setTeacherData((prev) => ({
          ...prev,
          profilePic: `data:image/jpeg;base64,${base64String}`,
        }));

        toast.success("Profile picture uploaded successfully!");
      } catch (error) {
        console.error("Error uploading profile picture:", error);
        toast.error("Failed to upload profile picture");
      } finally {
        setUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <TeacherLayout title="Settings">
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

      {/* ✅ Account Tab */}
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
                {["firstname", "middlename", "lastname", "school_email"].map(
                  (field) => (
                    <div key={field}>
                      <label className="text-gray-600 text-sm capitalize">
                        {field.replace("_", " ")}
                      </label>
                      <input
                        type="text"
                        value={teacherData[field]}
                        readOnly
                        className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 cursor-not-allowed"
                      />
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Change Password
            </h2>

            <div className="space-y-5">
              <div className="relative">
                <label className="text-gray-600 text-sm">New Password</label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="new"
                  value={passwords.new}
                  onChange={handlePasswordChange}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-[#3498db] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-8 text-gray-500"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <label className="text-gray-600 text-sm">
                  Confirm New Password
                </label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirm"
                  value={passwords.confirm}
                  onChange={handlePasswordChange}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-[#3498db] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-8 text-gray-500"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

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

      {/* ✅ Profile Tab */}
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

            <div className="flex flex-col items-center">
              <img
                src={
                  teacherData.profilePic ||
                  "https://www.w3schools.com/howto/img_avatar.png"
                }
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 mb-4"
              />

              <label className="cursor-pointer bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                {uploading ? "Uploading..." : "Upload New Picture"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePicChange}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
