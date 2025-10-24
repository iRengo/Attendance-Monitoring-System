import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { toast } from "react-toastify";
import AdminLayout from "../../components/adminLayout";
import { logActivity } from "../../utils/logActivity"; // ✅ added

export default function AdminSettings() {
  const [adminData, setAdminData] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(true);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingState, setPendingState] = useState(false);

  const settingsRef = doc(db, "system_settings", "maintenance_mode");

  // ==========================
  // Fetch Admin Info + Maintenance Mode
  // ==========================
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          setAdminData(adminSnap.data());
        } else {
          toast.error("Admin data not found in Firestore.");
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
        toast.error("Failed to load admin data.");
      } finally {
        setLoading(false);
      }
    };

    // Real-time maintenance mode listener
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setIsMaintenance(snapshot.data().enabled);
      }
    });

    fetchAdminData();
    return () => unsubscribe();
  }, []);

  // ==========================
  // Handle Maintenance Toggle (Show Confirmation Modal)
  // ==========================
  const handleToggleMaintenance = () => {
    const newState = !isMaintenance;
    setPendingState(newState);
    setShowConfirmModal(true);
  };

  // ==========================
  // Confirm Maintenance Toggle
  // ==========================
  const confirmToggleMaintenance = async () => {
    setShowConfirmModal(false);
    try {
      setIsMaintenance(pendingState);
      await setDoc(settingsRef, { enabled: pendingState }, { merge: true });

      // ✅ Log Activity
      await logActivity(
        pendingState ? "Enabled Maintenance Mode" : "Disabled Maintenance Mode",
        pendingState
          ? "The system is now in maintenance mode. Only admins can log in."
          : "Maintenance mode disabled. All users can access again."
      );

      toast.success(
        pendingState
          ? "🛠️ Maintenance mode ENABLED — Only admins can log in."
          : "✅ Maintenance mode DISABLED — All users can now access."
      );
    } catch (error) {
      console.error("Error updating maintenance mode:", error);
      toast.error("Failed to update maintenance mode.");
    }
  };

  // ==========================
  // Handle Password Update
  // ==========================
  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      await updatePassword(auth.currentUser, newPassword);
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error.code === "auth/requires-recent-login") {
        toast.warning(
          "Please log out and sign in again before changing your password."
        );
      } else {
        toast.error("Failed to update password.");
      }
    }
  };

  if (loading)
    return (
      <AdminLayout title="System Settings">
        <div className="flex justify-center py-10 text-gray-600">
          Loading admin data...
        </div>
      </AdminLayout>
    );

  return (
    <AdminLayout title="System Settings">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-8 space-y-10">
        {/* =============== Admin Info =============== */}
        <section>
          <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">
            👤 Admin Profile Information
          </h2>
          {adminData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm">
                <p className="text-sm text-gray-600">First Name</p>
                <p className="font-semibold text-gray-900 text-lg">
                  {adminData.firstname || "—"}
                </p>
              </div>
              <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm">
                <p className="text-sm text-gray-600">Last Name</p>
                <p className="font-semibold text-gray-900 text-lg">
                  {adminData.lastname || "—"}
                </p>
              </div>
              <div className="col-span-1 sm:col-span-2 p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm">
                <p className="text-sm text-gray-600">Email Address</p>
                <p className="font-semibold text-gray-900 text-lg">
                  {adminData.email || "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              No admin data found in Firestore.
            </p>
          )}
        </section>

        {/* =============== Change Password =============== */}
        <section>
          <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">
            🔒 Change Password
          </h2>
          <div className="bg-gray-50 p-6 rounded-xl shadow-inner max-w-md space-y-3">
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handlePasswordUpdate}
              className="bg-blue-600 w-full text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Update Password
            </button>
          </div>
        </section>

        {/* =============== Maintenance Mode =============== */}
        <section>
          <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">
            ⚙️ System Preferences
          </h2>
          <div className="bg-gray-50 p-6 rounded-xl shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <span className="text-gray-700 font-medium">
                Enable Maintenance Mode
              </span>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMaintenance}
                  onChange={handleToggleMaintenance}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-red-500 relative transition-all">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                </div>
              </label>
            </div>
          </div>

          <p className="text-gray-500 text-sm mt-3">
            When <strong>Maintenance Mode</strong> is enabled,{" "}
            <em>only admins</em> can log in. Students and teachers will see a
            maintenance notice instead.
          </p>
        </section>
      </div>

      {/* =============== Confirmation Modal =============== */}
      {showConfirmModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md transform transition-all">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              {pendingState
                ? "Enable Maintenance Mode?"
                : "Disable Maintenance Mode?"}
            </h3>
            <p className="text-gray-600 mb-6">
              {pendingState
                ? "Activating maintenance mode will restrict access to only admins. Are you sure you want to proceed?"
                : "Disabling maintenance mode will allow all users to log in again. Continue?"}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleMaintenance}
                className={`px-4 py-2 rounded-lg text-white font-medium transition ${
                  pendingState
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {pendingState ? "Enable" : "Disable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
