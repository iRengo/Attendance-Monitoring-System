import { useState, useEffect } from "react";
import AdminLayout from "../../components/adminLayout";
import { collection, getDocs } from "firebase/firestore";
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

  // Fetch all student + teacher accounts from Firestore
  const fetchAllAccounts = async () => {
    try {
      setLoading(true);

      const [studentsSnap, teachersSnap] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "teachers")),
      ]);

      const students = studentsSnap.docs.map((d) => ({
        id: d.id,
        firstName: d.data().firstName || d.data().firstname,
        lastName: d.data().lastName || d.data().lastname,
        email: d.data().email || d.data().school_email,
        role: "Student",
      }));

      const teachers = teachersSnap.docs.map((d) => ({
        id: d.id,
        firstName: d.data().firstName || d.data().firstname,
        lastName: d.data().lastName || d.data().lastname,
        email: d.data().email || d.data().school_email,
        role: "Teacher",
      }));

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
  const handleCsvChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

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

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success("CSV import completed!");
      } else {
        toast.error("CSV import failed: " + result.error);
      }

      fetchAllAccounts();
    } catch (error) {
      console.error("CSV import failed:", error);
      toast.error("CSV import failed — network error");
    } finally {
      setImporting(false);
      setCsvFile(null);
    }
  };

  // Filtered and searched users
  const filteredUsers = users
    .filter((u) => filter === "all" || u.role.toLowerCase() === filter)
    .filter(
      (u) =>
        u.firstName.toLowerCase().includes(search.toLowerCase()) ||
        u.lastName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <AdminLayout title="User Management">
      <div className="bg-white shadow-md rounded-lg p-4">

        {/* CSV Import */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvChange}
            className="border border-gray-400 rounded px-2 py-1 text-gray-800 bg-gray-100 w-51"
          />
          <button
            onClick={handleImportCsv}
            disabled={importing}
            className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import CSV"}
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-1 rounded ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("student")}
              className={`px-4 py-1 rounded ${filter === "student" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
            >
              Students
            </button>
            <button
              onClick={() => setFilter("teacher")}
              className={`px-4 py-1 rounded ${filter === "teacher" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
            >
              Teachers
            </button>
          </div>

          <input
            type="text"
            placeholder="Search by name or email"
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
                  <th className="px-6 py-3 text-sm font-semibold">Name</th>
                  <th className="px-6 py-3 text-sm font-semibold">Email</th>
                  <th className="px-6 py-3 text-sm font-semibold">Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-3 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => (
                    <tr
                      key={user.id}
                      className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
                    >
                      <td className="px-6 py-3 text-sm text-gray-800">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-800">{user.email}</td>
                      <td className="px-6 py-3 text-sm text-gray-800">{user.role}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
          <span>
            Showing {filteredUsers.length} of {users.length} Users
          </span>
        </div>
      </div>
    </AdminLayout>
  );
}
