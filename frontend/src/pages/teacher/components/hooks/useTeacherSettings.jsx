import { useState, useEffect, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../../firebase";
import { toast } from "react-toastify";
import { updatePassword } from "firebase/auth";

/**
 * useTeacherSettings: encapsulates teacher data fetching, password change and profile upload handler.
 * Updated: profile upload now uses FormData file upload (Cloudinary via backend), same approach as StudentSettings.
 */
export default function useTeacherSettings() {
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

  // Fetch teacher data
  const fetchTeacherData = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("No logged-in user found!");
        setLoading(false);
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
          // use profilePicUrl if present (cloudinary), fallback to profilePicBinary base64 if still present
          profilePic: data.profilePicUrl
            ? data.profilePicUrl
            : data.profilePicBinary
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
  }, []);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  // Password input handler
  const handlePasswordChange = (e) =>
    setPasswords((p) => ({ ...p, [e.target.name]: e.target.value }));

  // Change password
  const handleChangePassword = async () => {
    if (!passwords.new || !passwords.confirm)
      return toast.error("Please fill both fields");
  
    if (passwords.new !== passwords.confirm)
      return toast.error("Passwords do not match");
  
    // ✅ Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(passwords.new)) {
      return toast.error(
        "Password must be at least 8 characters long and include 1 uppercase, 1 lowercase, and 1 number."
      );
    }
  
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
  

  // Handle profile picture upload (Actual Image) — matches StudentSettings approach
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) {
      toast.error("User not logged in!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await fetch(
        `http://localhost:3000/teacher/upload-profile-picture/${user.uid}`,
        {
          method: "POST",
          body: formData,
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Upload failed");

      // Expecting backend to return { success: true, imageUrl }
      setTeacherData((prev) => ({
        ...prev,
        profilePic: result.imageUrl || prev.profilePic,
      }));

      toast.success("Profile picture uploaded successfully!");
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    teacherData,
    setTeacherData,
    passwords,
    setPasswords,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    loading,
    uploading,
    handlePasswordChange,
    handleChangePassword,
    handleProfilePicChange,
  };
}