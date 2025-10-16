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
  });

  const [passwords, setPasswords] = useState({
    new: "",
    confirm: "",
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch teacher data (case-insensitive)
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

          // Normalize keys to lowercase
          const normalizedData = Object.keys(data).reduce((acc, key) => {
            acc[key.toLowerCase()] = data[key];
            return acc;
          }, {});

          const firstname =
            normalizedData.firstname || normalizedData.first_name || "";
          const middlename =
            normalizedData.middlename || normalizedData.middle_name || "";
          const lastname =
            normalizedData.lastname || normalizedData.last_name || "";
          const school_email =
            normalizedData.school_email ||
            normalizedData.email ||
            normalizedData.schoolemail ||
            "";

          setTeacherData({
            firstname,
            middlename,
            lastname,
            school_email,
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

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleChangePassword = async () => {
    if (!passwords.new || !passwords.confirm) {
      toast.error("Please fill in both fields");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("User not logged in");
        return;
      }

      await updatePassword(user, passwords.new);

      toast.success("Password updated successfully!");
      setPasswords({ new: "", confirm: "" });
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password: " + error.message);
    }
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
                <div>
                  <label className="text-gray-600 text-sm">First Name</label>
                  <input
                    type="text"
                    value={teacherData.firstname}
                    readOnly
                    className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-gray-600 text-sm">Middle Name</label>
                  <input
                    type="text"
                    value={teacherData.middlename}
                    readOnly
                    className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-gray-600 text-sm">Last Name</label>
                  <input
                    type="text"
                    value={teacherData.lastname}
                    readOnly
                    className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-gray-600 text-sm">Email</label>
                  <input
                    type="email"
                    value={teacherData.school_email}
                    readOnly
                    className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 cursor-not-allowed"
                  />
                </div>
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-8 text-gray-500"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
    </TeacherLayout>
  );
}
