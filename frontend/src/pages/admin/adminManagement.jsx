import { useState, useEffect } from "react";
import AdminLayout from "../../components/adminLayout";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { logActivity } from "../../utils/logActivity"; // ✅ helper import

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [viewModalUser, setViewModalUser] = useState(null);
  const [editModalUser, setEditModalUser] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Normalize keys
  const normalizeKeys = (data) => {
    const normalized = {};
    for (const key in data) {
      const normalizedKey = key
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[\s-]/g, "_")
        .toLowerCase();
      normalized[normalizedKey] = data[key];
    }
    return normalized;
  };

  // Fetch all users
  const fetchAllAccounts = async () => {
    try {
      setLoading(true);
      const [studentsSnap, teachersSnap] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "teachers")),
      ]);

      const parseData = (docSnap, role) => {
        const data = normalizeKeys(docSnap.data());
        const name = `${data.firstname || ""} ${data.middlename || ""} ${
          data.lastname || ""
        }`.trim();
        const email = data.school_email || data.email || "—";
        return { id: docSnap.id, name, email, role };
      };

      const students = studentsSnap.docs.map((d) => parseData(d, "Student"));
      const teachers = teachersSnap.docs.map((d) => parseData(d, "Teacher"));
      setUsers([...students, ...teachers]);
    } catch (err) {
      console.error("Error fetching accounts:", err);
      toast.error("Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  // CSV Import
  const handleCsvChange = (e) => setCsvFile(e.target.files[0]);

  const handleImportCsv = async () => {
    if (!csvFile) return toast.error("Please select a CSV file first!");
    const ext = csvFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv") return toast.error("Only CSV files are allowed!");

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await fetch("http://localhost:3000/admin/import-csv", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (result.success) {
        toast.success("CSV import completed!");
        await logActivity("Imported CSV file", "System");
      } else {
        toast.error("CSV import failed.");
      }

      fetchAllAccounts();
    } catch (err) {
      console.error(err);
      toast.error("Import failed — check server.");
    } finally {
      setImporting(false);
      setCsvFile(null);
    }
  };

  // View User
  const handleView = async (user) => {
    try {
      const ref = doc(db, user.role.toLowerCase() + "s", user.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const normalized = normalizeKeys(snap.data());
        if (
          user.role.toLowerCase() === "student" &&
          normalized.classes &&
          Array.isArray(normalized.classes)
        ) {
          const latestClass = normalized.classes
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

          if (latestClass) {
            normalized.gradelevel =
              latestClass.gradeLevel || normalized.gradelevel || "N/A";
            normalized.section = latestClass.section || "—";
          }
        }
        setViewModalUser({ id: user.id, role: user.role, ...normalized });
      } else toast.error("User not found.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch user.");
    }
  };

  // Edit User
  const handleEdit = async (user) => {
    try {
      const ref = doc(db, user.role.toLowerCase() + "s", user.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const normalized = normalizeKeys(snap.data());
        setEditModalUser({ id: user.id, role: user.role, ...normalized });
      } else toast.error("User not found.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch user.");
    }
  };

  // Save edits
  const saveUserEdits = async () => {
    if (!editModalUser) return;
    try {
      setUpdating(true);
      const { id, role, ...rest } = editModalUser;

      const fieldsToUpdate = Object.fromEntries(
        Object.entries(rest).filter(
          ([key]) =>
            !["created_at", "status", "temp_password", "personal_email", "classes"].includes(
              key
            )
        )
      );

      const ref = doc(db, role.toLowerCase() + "s", id);
      await updateDoc(ref, fieldsToUpdate);
      await logActivity(`Edited ${role} account: ${rest.firstname || "User"}`, "Admin");

      toast.success("User updated successfully!");
      setEditModalUser(null);
      fetchAllAccounts();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user.");
    } finally {
      setUpdating(false);
    }
  };

  // Delete User
  const handleDelete = async (user) => {
    if (!confirm(`Delete ${user.name}?`)) return;
    try {
      const ref = doc(db, user.role.toLowerCase() + "s", user.id);
      await deleteDoc(ref);
      await logActivity(`Deleted ${user.role}: ${user.name}`, "Admin");

      toast.success("User deleted successfully!");
      fetchAllAccounts();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user.");
    }
  };

  // Filters + Search
  const filteredUsers = users
    .filter((u) => filter === "all" || u.role.toLowerCase() === filter)
    .filter((u) =>
      Object.values(u).join(" ").toLowerCase().includes(search.toLowerCase())
    );

  const orderedFields = [
    "school_email",
    "firstname",
    "middlename",
    "lastname",
    "gradelevel",
    "section",
    "guardianname",
    "guardiancontact",
  ];

  return (
    <AdminLayout title="User Management">
      <div className="bg-white shadow-md rounded-lg p-4">
        {/* CSV Import */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvChange}
            className="border border-gray-400 rounded px-2 py-1 text-gray-800 bg-gray-100 w-60"
          />
          <button
            onClick={handleImportCsv}
            disabled={importing}
            className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import CSV"}
          </button>
        </div>

        {/* Filters + Search */}
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex gap-2">
            {["all", "student", "teacher"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-1 rounded ${
                  filter === t
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-gray-800"
          />
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-500">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-blue-50 text-left text-gray-700">
                  <th className="px-4 py-2 text-sm font-semibold">Name</th>
                  <th className="px-4 py-2 text-sm font-semibold">Email</th>
                  <th className="px-4 py-2 text-sm font-semibold">Role</th>
                  <th className="px-4 py-2 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-3 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <tr
                      key={u.id}
                      className={`${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-blue-50`}
                    >
                      <td className="px-4 py-2 text-sm text-gray-800">{u.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{u.email}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{u.role}</td>
                      <td className="px-4 py-2 text-sm flex gap-3 text-gray-800">
                        <button onClick={() => handleView(u)} className="text-blue-600 hover:underline">
                          View
                        </button>
                        <button onClick={() => handleEdit(u)} className="text-green-600 hover:underline">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(u)} className="text-red-600 hover:underline">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewModalUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 backdrop-blur-sm"></div>
          <div className="relative bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl p-6 w-full max-w-md z-10">
            <h2 className="text-2xl font-bold mb-4 text-blue-700 border-b pb-2">
              User Details
            </h2>
            <div className="space-y-3 text-gray-800 max-h-80 overflow-y-auto pr-2">
              {orderedFields
                .filter((key) => key in viewModalUser)
                .map((key) => (
                  <p key={key}>
                    <span className="font-semibold text-gray-700">
                      {key.replace(/_/g, " ")}:
                    </span>{" "}
                    {viewModalUser[key] || ""}
                  </p>
                ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl shadow-md"
                onClick={() => setViewModalUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10">
            <h2 className="text-2xl font-bold mb-4 text-green-700 border-b pb-2">
              Edit User
            </h2>
            <div className="space-y-3 text-gray-800 max-h-80 overflow-y-auto pr-2">
              {orderedFields
                .filter((key) => key in editModalUser)
                .map((key) => (
                  <input
                    key={key}
                    type="text"
                    placeholder={key.replace(/_/g, " ")}
                    value={editModalUser[key] || ""}
                    onChange={(e) =>
                      setEditModalUser({
                        ...editModalUser,
                        [key]: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                  />
                ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-5 py-2 rounded-xl shadow-md"
                onClick={() => setEditModalUser(null)}
              >
                Cancel
              </button>
              <button
                className={`bg-green-600 text-white px-5 py-2 rounded-xl shadow-md hover:bg-green-700 font-semibold ${
                  updating ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={saveUserEdits}
                disabled={updating}
              >
                {updating ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
