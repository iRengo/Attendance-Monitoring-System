import { useState, useEffect } from "react";
import StudentLayout from "../../components/studentLayout";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { updatePassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";

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

  // ✅ Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return toast.error("No logged-in user found!");
        const docRef = doc(db, "students", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
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
      } catch (error) {
        console.error(error);
        toast.error("Failed to fetch student data");
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, []);

  // ✅ Password handlers
  const handlePasswordChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });
  const handleChangePassword = async () => {
    if (!passwords.new || !passwords.confirm) return toast.error("Please fill both fields");
    if (passwords.new !== passwords.confirm) return toast.error("Passwords do not match");
    try {
      const user = auth.currentUser;
      if (!user) return toast.error("User not logged in");
      await updatePassword(user, passwords.new);
      toast.success("Password updated successfully!");
      setPasswords({ new: "", confirm: "" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update password: " + error.message);
    }
  };

  // ✅ Upload profile picture (actual image)
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const user = auth.currentUser;
    if (!user) return toast.error("User not logged in");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await fetch(`http://localhost:3000/student/upload-profile-picture/${user.uid}`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Upload failed");
      setStudentData((prev) => ({ ...prev, profilePic: result.imageUrl }));
      toast.success("Profile picture uploaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  return (
    <StudentLayout title="Settings">
      <div className="flex border-b border-[#415CA0] mb-6 gap-6">
        <button
          onClick={() => setActiveTab("account")}
          className={`pb-3 font-semibold transition-colors ${activeTab==="account"?"text-[#415CA0] border-b-2 border-[#415CA0]":"text-gray-400 hover:text-[#415CA0]"}`}>
          Account
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-3 font-semibold transition-colors ${activeTab==="profile"?"text-[#415CA0] border-b-2 border-[#415CA0]":"text-gray-400 hover:text-[#415CA0]"}`}>
          Profile
        </button>
      </div>

      {activeTab === "account" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Account Information</h2>
            {loading ? <p className="text-gray-500">Loading account info...</p> :
            <div className="space-y-5">
              {["firstname","middlename","lastname","school_email"].map(field=>(
                <div key={field}>
                  <label className="text-gray-600 text-sm capitalize">{field.replace("_"," ")}</label>
                  <input type="text" value={studentData[field]} readOnly className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 cursor-not-allowed"/>
                </div>
              ))}
            </div>}
          </div>

          <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Change Password</h2>
            <div className="space-y-5">
              <div className="relative">
                <label className="text-gray-600 text-sm">New Password</label>
                <input type={showNewPassword?"text":"password"} name="new" value={passwords.new} onChange={handlePasswordChange} className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-[#3498db] focus:outline-none"/>
                <button type="button" onClick={()=>setShowNewPassword(!showNewPassword)} className="absolute right-3 top-8 text-gray-500">{showNewPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
              </div>
              <div className="relative">
                <label className="text-gray-600 text-sm">Confirm New Password</label>
                <input type={showConfirmPassword?"text":"password"} name="confirm" value={passwords.confirm} onChange={handlePasswordChange} className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-[#3498db] focus:outline-none"/>
                <button type="button" onClick={()=>setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-8 text-gray-500">{showConfirmPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={handleChangePassword} className="bg-[#3498db] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#2980b9] transition">Update Password</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Info</h2>
            <p className="text-gray-700 text-sm">Customize your profile details here (coming soon).</p>
          </div>
          <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200 flex flex-col items-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Picture</h2>
            <div className="flex flex-col items-center">
              <img src={studentData.profilePic || "https://www.w3schools.com/howto/img_avatar.png"} alt="Profile" className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 mb-4"/>
              <label className="cursor-pointer bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                {uploading?"Uploading...":"Upload New Picture"}
                <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} disabled={uploading}/>
              </label>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
