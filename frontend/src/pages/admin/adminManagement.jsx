import { useState, useEffect } from "react";
import AdminLayout from "../../components/adminLayout";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all"); // all | student | teacher
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // CSV import states
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);

  // Modals
  const [viewModalUser, setViewModalUser] = useState(null);
  const [editModalUser, setEditModalUser] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Fetch all student + teacher accounts from Firestore
  const fetchAllAccounts = async () => {
    try {
      setLoading(true);

      const [studentsSnap, teachersSnap] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "teachers")),
      ]);

      const normalizeData = (d) => {
        const data = d.data();
        return {
          id: d.id,
          firstName: data.firstName || data.firstname || "",
          middleName: data.middleName || data.middlename || "",
          lastName: data.lastName || data.lastname || "",
          email: data.school_email || data.email || "",
          section: data.section || "",
          guardianName: data.guardianName || "",
          guardianContact: data.guardianContact || "",
          role: "",
        };
      };

      const students = studentsSnap.docs.map((d) => ({ ...normalizeData(d), role: "Student" }));
      const teachers = teachersSnap.docs.map((d) => ({ ...normalizeData(d), role: "Teacher" }));

      setUsers([...students, ...teachers]);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load accounts — please check Firestore connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  // CSV handlers
  const handleCsvChange = (e) => setCsvFile(e.target.files[0]);

  const handleImportCsv = async () => {
    if (!csvFile) {
      toast.error("Please select a CSV file first!");
      return;
    }

    const allowedTypes = ["text/csv", "application/vnd.ms-excel"];
    const ext = csvFile.name.split(".").pop()?.toLowerCase();

    if (ext !== "csv" || !allowedTypes.includes(csvFile.type)) {
      toast.error("Only CSV files are allowed!");
      return;
    }

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const response = await fetch("http://localhost:3000/admin/import-csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const result = await response.json();

      if (result.success) toast.success("CSV import completed!");
      else toast.error("CSV import failed: " + result.error);

      fetchAllAccounts();
    } catch (error) {
      console.error("CSV import failed:", error);
      toast.error("CSV import failed — network error");
    } finally {
      setImporting(false);
      setCsvFile(null);
    }
  };

  // View handler
  const handleView = async (user) => {
    try {
      const docRef = doc(db, user.role.toLowerCase() + "s", user.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setViewModalUser({
          id: user.id,
          role: user.role,
          firstName: data.firstName || data.firstname || "",
          middleName: data.middleName || data.middlename || "",
          lastName: data.lastName || data.lastname || "",
          email: data.school_email || data.email || "",
          section: data.section || "",
          guardianName: data.guardianName || "",
          guardianContact: data.guardianContact || "",
        });
      } else toast.error("User data not found.");
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to fetch user data.");
    }
  };

  // Edit handler
  const handleEdit = async (user) => {
    try {
      const docRef = doc(db, user.role.toLowerCase() + "s", user.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEditModalUser({
          id: user.id,
          role: user.role,
          firstName: data.firstName || data.firstname || "",
          middleName: data.middleName || data.middlename || "",
          lastName: data.lastName || data.lastname || "",
          email: data.school_email || data.email || "",
          section: data.section || "",
          guardianName: data.guardianName || "",
          guardianContact: data.guardianContact || "",
        });
      } else toast.error("User data not found.");
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to fetch user data.");
    }
  };

  // Save edited user
  const saveUserEdits = async () => {
    if (!editModalUser) return;
    try {
      setUpdating(true);
      const docRef = doc(db, editModalUser.role.toLowerCase() + "s", editModalUser.id);
      await updateDoc(docRef, {
        firstName: editModalUser.firstName,
        middleName: editModalUser.middleName,
        lastName: editModalUser.lastName,
        school_email: editModalUser.email,
        section: editModalUser.section,
        guardianName: editModalUser.guardianName,
        guardianContact: editModalUser.guardianContact,
      });
      toast.success("User updated successfully!");
      setEditModalUser(null);
      fetchAllAccounts();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user.");
    } finally {
      setUpdating(false);
    }
  };

  // Delete user
  const handleDelete = async (user) => {
    if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) return;
    try {
      const docRef = doc(db, user.role.toLowerCase() + "s", user.id);
      await deleteDoc(docRef);
      toast.success("User deleted successfully!");
      fetchAllAccounts();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user.");
    }
  };

  // Filtered and searched users
  const filteredUsers = users
    .filter((u) => filter === "all" || u.role.toLowerCase() === filter)
    .filter(
      (u) =>
        u.firstName.toLowerCase().includes(search.toLowerCase()) ||
        u.middleName.toLowerCase().includes(search.toLowerCase()) ||
        u.lastName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <AdminLayout title="User Management">
      <div className="bg-white shadow-md rounded-lg p-4">

        {/* CSV Import */}
        <div className="flex items-center gap-2 mb-4">
          <input type="file" accept=".csv" onChange={handleCsvChange} className="border border-gray-400 rounded px-2 py-1 text-gray-800 bg-gray-100 w-51" />
          <button onClick={handleImportCsv} disabled={importing} className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 disabled:opacity-50">
            {importing ? "Importing..." : "Import CSV"}
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex gap-2">
            <button onClick={() => setFilter("all")} className={`px-4 py-1 rounded ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>All</button>
            <button onClick={() => setFilter("student")} className={`px-4 py-1 rounded ${filter === "student" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>Students</button>
            <button onClick={() => setFilter("teacher")} className={`px-4 py-1 rounded ${filter === "teacher" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>Teachers</button>
          </div>
          <input type="text" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="border border-gray-300 rounded px-3 py-1 text-gray-800" />
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-500">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-blue-50 text-left text-gray-700">
                  <th className="px-6 py-3 text-sm font-semibold">Name</th>
                  <th className="px-6 py-3 text-sm font-semibold">Email</th>
                  <th className="px-6 py-3 text-sm font-semibold">Role</th>
                  <th className="px-6 py-3 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-3 text-center text-gray-500">No records found</td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => (
                    <tr key={user.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                      <td className="px-6 py-3 text-sm text-gray-800">{user.firstName} {user.middleName} {user.lastName}</td>
                      <td className="px-6 py-3 text-sm text-gray-800">{user.email}</td>
                      <td className="px-6 py-3 text-sm text-gray-800">{user.role}</td>
                      <td className="px-6 py-3 text-sm text-gray-800 flex gap-2">
                        <button onClick={() => handleView(user)} className="text-blue-600 hover:underline">View</button>
                        <button onClick={() => handleEdit(user)} className="text-green-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(user)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
          <span>Showing {filteredUsers.length} of {users.length} Users</span>
        </div>
      </div>

      {/* View Modal */}
      {viewModalUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 backdrop-blur-sm"></div> {/* Only blur, no black */}
          <div className="relative bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl p-6 w-full max-w-md z-10 transform transition-transform duration-300 scale-100">
            <h2 className="text-2xl font-bold mb-4 text-blue-700 border-b pb-2">User Details</h2>
            <div className="space-y-3 text-gray-800">
              <p><span className="font-semibold text-gray-700">First Name:</span> {viewModalUser.firstName}</p>
              <p><span className="font-semibold text-gray-700">Middle Name:</span> {viewModalUser.middleName}</p>
              <p><span className="font-semibold text-gray-700">Last Name:</span> {viewModalUser.lastName}</p>
              <p><span className="font-semibold text-gray-700">Email:</span> {viewModalUser.email}</p>
              <p><span className="font-semibold text-gray-700">Section:</span> {viewModalUser.section}</p>
              <p><span className="font-semibold text-gray-700">Guardian Name:</span> {viewModalUser.guardianName}</p>
              <p><span className="font-semibold text-gray-700">Guardian Contact:</span> {viewModalUser.guardianContact}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl shadow-md transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg" 
                onClick={() => setViewModalUser(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 backdrop-blur-sm"></div> {/* Only blur, no black */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10 transform transition-transform duration-300 scale-100">
            <h2 className="text-2xl font-bold mb-4 text-green-700 border-b pb-2">Edit User</h2>
            <div className="space-y-3 text-gray-800">
              <input type="text" placeholder="First Name" value={editModalUser.firstName} onChange={(e) => setEditModalUser({...editModalUser, firstName: e.target.value})} className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
              <input type="text" placeholder="Middle Name" value={editModalUser.middleName} onChange={(e) => setEditModalUser({...editModalUser, middleName: e.target.value})} className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
              <input type="text" placeholder="Last Name" value={editModalUser.lastName} onChange={(e) => setEditModalUser({...editModalUser, lastName: e.target.value})} className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
              <input type="email" placeholder="Email" value={editModalUser.email} onChange={(e) => setEditModalUser({...editModalUser, email: e.target.value})} className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
              <input type="text" placeholder="Section" value={editModalUser.section} onChange={(e) => setEditModalUser({...editModalUser, section: e.target.value})} className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
              <input type="text" placeholder="Guardian Name" value={editModalUser.guardianName} onChange={(e) => setEditModalUser({...editModalUser, guardianName: e.target.value})} className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
              <input type="text" placeholder="Guardian Contact" value={editModalUser.guardianContact} onChange={(e) => setEditModalUser({...editModalUser, guardianContact: e.target.value})} className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-5 py-2 rounded-xl shadow-md transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg" onClick={() => setEditModalUser(null)}>Cancel</button>
              <button className={`bg-green-600 text-white px-5 py-2 rounded-xl shadow-md hover:bg-green-700 font-semibold transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg ${updating ? "opacity-50 cursor-not-allowed" : ""}`} 
                onClick={saveUserEdits} disabled={updating}>{updating ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}


    </AdminLayout>
  );
}
