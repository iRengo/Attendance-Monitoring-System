import { useEffect, useState } from "react";
import { auth, db } from "../../../../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { toast } from "react-toastify";

export default function useStudentProfile() {
  const [studentData, setStudentData] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    school_email: "",
    profilePic: "",
  });
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return toast.error("No logged-in user found!");
        const ref = doc(db, "students", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setStudentData({
            firstname: data.firstname || "",
            middlename: data.middlename || "",
            lastname: data.lastname || "",
            studentId: data.studentId?.toString() || "", // convert number to string
            section: data.section || "",
            gradelevel: data.gradelevel || "",
            personal_email: data.personal_email || "",
            guardianname: data.guardianname || "",
            guardiancontact: data.guardiancontact || "",
            school_email: data.school_email || data.email || "",
            profilePic: data.profilePicUrl || "",
          });
        } else {
          toast.error("Student record not found!");
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to fetch student data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePasswordChange = (e) =>
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const changePassword = async () => {
    if (!passwords.new || !passwords.confirm) return toast.error("Please fill both fields");
    if (passwords.new !== passwords.confirm) return toast.error("Passwords do not match");
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regex.test(passwords.new)) {
      return toast.error(
        "Password must be at least 8 characters long and include 1 uppercase, 1 lowercase, and 1 number."
      );
    }
    try {
      const user = auth.currentUser;
      if (!user) return toast.error("User not logged in");
      await updatePassword(user, passwords.new);
      await updateDoc(doc(db, "students", user.uid), { temp_password: null });
      toast.success("Password updated successfully!");
      setPasswords({ new: "", confirm: "" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to update password: " + e.message);
    }
  };

  // Upload captured image
  const uploadProfilePhoto = async (dataUrl) => {
    try {
      const user = auth.currentUser;
      if (!user) return toast.error("User not logged in");
      if (!dataUrl) return toast.error("No captured image");
      setUploading(true);
      const blob = dataURLtoBlob(dataUrl);
      const file = new File([blob], "profile.jpg", { type: blob.type });
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `http://localhost:3000/student/upload-profile-picture/${user.uid}`,
        { method: "POST", body: formData }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");
      setStudentData((prev) => ({ ...prev, profilePic: json.imageUrl }));
      toast.success("Profile picture updated!");
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Failed to save photo");
      return false;
    } finally {
      setUploading(false);
    }
  };

  function dataURLtoBlob(dataUrl) {
    const [meta, data] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(data || "");
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }

  return {
    studentData,
    loading,
    passwords,
    uploading,
    setPasswords,
    handlePasswordChange,
    changePassword,
    uploadProfilePhoto,
  };
}