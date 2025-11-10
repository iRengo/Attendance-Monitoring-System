import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../../../../../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { toast } from "react-toastify";
import { logActivity } from "../../../../../utils/logActivity";
import Swal from "sweetalert2";

/**
 * Encapsulates admin settings logic and uses SweetAlert2 for confirmations/alerts.
 */
export default function useAdminSettings() {
  const [adminData, setAdminData] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [pendingState, setPendingState] = useState(false);
  const [uploading, setUploading] = useState(false);

  const settingsRef = doc(db, "system_settings", "maintenance_mode");

  const fetchAdminData = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const adminRef = doc(db, "admins", user.uid);
      const adminSnap = await getDoc(adminRef);

      if (adminSnap.exists()) {
        const data = adminSnap.data();
        setAdminData({
          ...data,
          profilePic: data.profilePicUrl ? data.profilePicUrl : data.profilePicBinary ? `data:image/jpeg;base64,${data.profilePicBinary}` : "",
        });
      } else {
        toast.error("Admin data not found in Firestore.");
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setIsMaintenance(snapshot.data().enabled);
      }
    });
    return () => unsubscribe();
  }, [fetchAdminData]);

  // Show confirmation via SweetAlert2 and then toggle maintenance
  const handleToggleMaintenance = async () => {
    const newState = !isMaintenance;
    const result = await Swal.fire({
      title: newState ? "Enable Maintenance Mode?" : "Disable Maintenance Mode?",
      text: newState
        ? "Activating maintenance mode will restrict access to only admins. Are you sure you want to proceed?"
        : "Disabling maintenance mode will allow all users to log in again. Continue?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: newState ? "Enable" : "Disable",
      cancelButtonText: "Cancel",
      confirmButtonColor: newState ? "#e11d48" : "#16a34a",
      reverseButtons: true,
      allowOutsideClick: false,
    });

    if (result.isConfirmed) {
      try {
        setIsMaintenance(newState);
        await setDoc(settingsRef, { enabled: newState }, { merge: true });

        await logActivity(
          newState ? "Enabled Maintenance Mode" : "Disabled Maintenance Mode",
          newState
            ? "The system is now in maintenance mode. Only admins can log in."
            : "Maintenance mode disabled. All users can access again."
        );

        Swal.fire({
          icon: "success",
          title: newState ? "Maintenance Enabled" : "Maintenance Disabled",
          timer: 1700,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error updating maintenance mode:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to update maintenance mode.",
        });
      }
    } else {
      // user cancelled
      // no-op; keep previous state
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      return Swal.fire({
        icon: "error",
        title: "Missing Fields",
        text: "Please fill in both password fields.",
      });
    }
  
    if (newPassword !== confirmPassword) {
      return Swal.fire({
        icon: "error",
        title: "Passwords do not match",
        text: "Passwords do not match!",
      });
    }
  
    // ✅ Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return Swal.fire({
        icon: "warning",
        title: "Weak Password",
        text: "Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, and one number.",
      });
    }
  
    try {
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      Swal.fire({
        icon: "success",
        title: "Password updated!",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error updating password:", error);
      const msg = error?.message || "Failed to update password.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
      });
    }
  };  

  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) {
      return Swal.fire({ icon: "error", title: "Not logged in", text: "User not logged in" });
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await fetch(`http://localhost:3000/admin/upload-profile-picture/${user.uid}`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Upload failed");

      setAdminData((prev) => ({ ...prev, profilePic: result.imageUrl || prev?.profilePic }));

      await logActivity("Updated Profile Picture", "Admin updated their profile picture.");
      Swal.fire({ icon: "success", title: "Uploaded!", text: "Profile picture uploaded successfully!", timer: 1400, showConfirmButton: false });
    } catch (error) {
      console.error("Error uploading admin profile picture:", error);
      Swal.fire({ icon: "error", title: "Upload failed", text: "Failed to upload profile picture" });
    } finally {
      setUploading(false);
    }
  };

  return {
    adminData,
    loading,
    newPassword,
    confirmPassword,
    setNewPassword,
    setConfirmPassword,
    isMaintenance,
    handleToggleMaintenance,
    pendingState,
    handlePasswordUpdate,
    uploading,
    handleProfilePicChange,
  };
}