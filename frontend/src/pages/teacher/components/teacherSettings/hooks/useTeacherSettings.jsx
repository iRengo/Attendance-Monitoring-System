import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { auth, db } from "../../../../../firebase";
import { toast } from "react-toastify";
import { updatePassword } from "firebase/auth";

/**
 * useTeacherSettings:
 * - Shows banner if temp_password string exists.
 * - Clears ONLY temp_password on update.
 * - Does NOT use mustChangePassword / passwordStatus / passwordChangedAt.
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

  // Banner flag derived solely from temp_password string presence
  const [showTempPasswordBanner, setShowTempPasswordBanner] = useState(false);

  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
      if (!docSnap.exists()) {
        toast.error("Teacher record not found!");
        setLoading(false);
        return;
      }

      const data = docSnap.data();

      // Banner condition: temp_password is a non-empty string
      const tempPwActive =
        typeof data.temp_password === "string" &&
        data.temp_password.trim() !== "";

      setShowTempPasswordBanner(tempPwActive);

      setTeacherData({
        firstname: data.firstname || "",
        middlename: data.middlename || "",
        lastname: data.lastname || "",
        school_email: data.school_email || data.email || "",
        profilePic: data.profilePicUrl
          ? data.profilePicUrl
          : data.profilePicBinary
          ? `data:image/jpeg;base64,${data.profilePicBinary}`
          : "",
      });

      // OPTIONAL one-time cleanup (uncomment if you want to remove old fields automatically)
      /*
      if (data.passwordStatus || data.passwordChangedAt || data.mustChangePassword !== undefined) {
        await updateDoc(docRef, {
          passwordStatus: deleteField(),
          passwordChangedAt: deleteField(),
          mustChangePassword: deleteField(),
        });
      }
      */
    } catch (e) {
      console.error("Error fetching teacher data:", e);
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

  const handleChangePassword = async () => {
    if (!passwords.new || !passwords.confirm)
      return toast.error("Please fill both fields");
    if (passwords.new !== passwords.confirm)
      return toast.error("Passwords do not match");

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(passwords.new)) {
      return toast.error(
        "Password must be at least 8 characters and include uppercase, lowercase and a number."
      );
    }

    try {
      const user = auth.currentUser;
      if (!user) return toast.error("User not logged in");

      await updatePassword(user, passwords.new);

      const docRef = doc(db, "teachers", user.uid);
      // Clear ONLY temp_password
      await updateDoc(docRef, { temp_password: null });

      setShowTempPasswordBanner(false);
      toast.success("Password updated successfully!");
      setPasswords({ new: "", confirm: "" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to update password: " + e.message);
    }
  };

  // Camera capture upload
  const saveCapturedPhotoFromDataURL = async (dataUrl) => {
    try {
      const user = auth.currentUser;
      if (!user) return toast.error("User not logged in");
      if (!dataUrl) return toast.error("No captured image to save");

      const blob = dataURLtoBlob(dataUrl);
      const file = new File([blob], "profile.jpg", { type: blob.type });
      const formData = new FormData();
      formData.append("file", file);

      setUploading(true);
      const res = await fetch(
        `/api/teacher/upload-profile-picture/${user.uid}`,
        {
          method: "POST",
          body: formData,
        }
      );      
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Upload failed");

      setTeacherData((prev) => ({
        ...prev,
        profilePic: result.imageUrl || prev.profilePic,
      }));
      toast.success("Profile picture updated!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save photo");
    } finally {
      setUploading(false);
    }
  };

  function dataURLtoBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const mime = parts[0]?.match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(parts[1] || "");
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }

  return {
    activeTab,
    setActiveTab,
    teacherData,
    setTeacherData,

    showTempPasswordBanner, // renamed flag

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
    saveCapturedPhotoFromDataURL,
  };
}