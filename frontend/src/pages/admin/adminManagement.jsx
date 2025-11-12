import { useState, useEffect, useMemo } from "react";
import AdminLayout from "../../components/adminLayout";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { logActivity } from "../../utils/logActivity";

import CSVImport from "./components/adminManagement/CSVImport";
import FiltersSearch from "./components/adminManagement/FiltersSearch";
import UsersTable from "./components/adminManagement/UsersTable";
import ViewUserModal from "./components/adminManagement/ViewUserModal";
import EditUserModal from "./components/adminManagement/EditUserModal";
import AddStudentModal from "./components/adminManagement/AddStudentModal";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);

  // Swapped panels
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);

  // Updating flags
  const [updating, setUpdating] = useState(false);

  // Add Student modal state
  const [addModalUser, setAddModalUser] = useState(null);
  const [creating, setCreating] = useState(false);

  const defaultNewStudent = {
    firstname: "",
    middlename: "",
    lastname: "",
    personal_email: "",
    guardianname: "",
    guardiancontact: "",
    gradelevel: "",
  };

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

  const fetchAllAccounts = async () => {
    try {
      setLoading(true);
      const [studentsSnap, teachersSnap] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "teachers")),
      ]);

      const parseData = (docSnap, role) => {
        const data = normalizeKeys(docSnap.data());
        const name = `${data.firstname || ""} ${data.middlename || ""} ${data.lastname || ""}`.trim();
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

  const handleCsvChange = (e) => setCsvFile(e.target.files[0]);

  /**
   * CSV Import:
   * Backend currently returns { success: true, results: [...] }
   * Each row in results should look like:
   *   { schoolEmail, status: 'Created' | 'Failed' | 'Existing', type, error? }
   *
   * If backend does NOT mark duplicates as 'Existing', we infer duplicates by matching
   * typical auth errors in the 'error' field (email-already-exists).
   */
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

      if (!res.ok || !result.success) {
        toast.error(result.message || "CSV import failed.");
      } else {
        // The backend now returns: addedCount, existingCount, failedCount, totalRows, results[]
        const {
          addedCount = 0,
          existingCount = 0,
          failedCount = 0,
          totalRows = 0,
        } = result;

        if (totalRows === 0) {
          toast.info("CSV contained no valid rows.");
        } else if (addedCount === 0 && existingCount > 0 && failedCount === 0) {
          toast.info("Data already existing. No new records imported.");
        } else if (addedCount === 0 && existingCount > 0 && failedCount > 0) {
          toast.info(
            `No new records. Existing: ${existingCount}, Failed: ${failedCount}`
          );
        } else if (addedCount > 0 && existingCount > 0 && failedCount === 0) {
          toast.success(
            `Import complete. Added: ${addedCount}, Existing: ${existingCount}`
          );
        } else if (addedCount > 0 && existingCount > 0 && failedCount > 0) {
          toast.success(
            `Import complete. Added: ${addedCount}, Existing: ${existingCount}, Failed: ${failedCount}`
          );
        } else if (addedCount > 0 && existingCount === 0 && failedCount === 0) {
          toast.success(`CSV import completed. Added: ${addedCount}`);
        } else if (addedCount > 0 && failedCount > 0 && existingCount === 0) {
          toast.success(
            `Import done. Added: ${addedCount}, Failed: ${failedCount}`
          );
        } else if (addedCount === 0 && existingCount === 0 && failedCount > 0) {
          toast.error(`All rows failed. Failed: ${failedCount}`);
        } else {
          toast.success("CSV import completed!");
        }

        // Removed duplicate logActivity() call here.
      }

      await fetchAllAccounts();
    } catch (err) {
      console.error(err);
      toast.error("Import failed — check server.");
    } finally {
      setImporting(false);
      setCsvFile(null);
    }
  };

  // View (swap)
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
            normalized.gradelevel = latestClass.gradeLevel || normalized.gradelevel || "N/A";
          }
        }
        setEditUser(null);
        setViewUser({ id: user.id, role: user.role, ...normalized });
      } else toast.error("User not found.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch user.");
    }
  };

  // Edit (swap)
  const handleEdit = async (user) => {
    try {
      const ref = doc(db, user.role.toLowerCase() + "s", user.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const normalized = normalizeKeys(snap.data());
        setViewUser(null);
        setEditUser({ id: user.id, role: user.role, ...normalized });
      } else toast.error("User not found.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch user.");
    }
  };

  const saveUserEdits = async () => {
    if (!editUser) return;
    try {
      setUpdating(true);
      const { id, role, ...rest } = editUser;

      const fieldsToUpdate = Object.fromEntries(
        Object.entries(rest).filter(
          ([key]) =>
            ![
              "created_at",
              "status",
              "temp_password",
              "personal_email",
              "classes",
            ].includes(key)
        )
      );

      const ref = doc(db, role.toLowerCase() + "s", id);
      await updateDoc(ref, fieldsToUpdate);
      await logActivity(`Edited ${role} account: ${rest.firstname || "User"}`, "Admin");

      toast.success("User updated successfully!");
      setEditUser(null);
      fetchAllAccounts();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user.");
    } finally {
      setUpdating(false);
    }
  };

   // ✅ Updated delete function with SweetAlert2
   const handleDelete = async (user) => {
    const result = await Swal.fire({
      title: `Delete ${user.name}?`,
      text: `Are you sure you want to permanently delete this ${user.role} account?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
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
    }
  };

  const handleCreateStudent = async () => {
    if (!addModalUser) return;
    const { firstname, lastname, personal_email } = addModalUser;
    if (!firstname || !lastname || !personal_email) {
      toast.error("Firstname, Lastname, and Personal email are required.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("http://localhost:3000/admin/add-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addModalUser),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to create student.");
      }
      toast.success(`Student created: ${data.result?.schoolEmail || "Success"}`);
      setAddModalUser(null);
      await fetchAllAccounts();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to create student: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users
    .filter((u) => filter === "all" || u.role.toLowerCase() === filter)
    .filter((u) =>
      Object.values(u).join(" ").toLowerCase().includes(search.toLowerCase())
    );

  const orderedFields = useMemo(
    () => [
      "school_email",
      "firstname",
      "middlename",
      "lastname",
      "gradelevel",
      "guardianname",
      "guardiancontact",
    ],
    []
  );

  const showingTable = !viewUser && !editUser;

  return (
    <AdminLayout title="User Management">
      <div className="bg-white shadow-md rounded-lg p-4">
        {showingTable && (
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <CSVImport
              importing={importing}
              onFileChange={handleCsvChange}
              onImport={handleImportCsv}
            />
            <button
              onClick={() => setAddModalUser({ ...defaultNewStudent })}
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
            >
              Add Student
            </button>
          </div>
        )}

        {(viewUser || editUser) && (
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                setViewUser(null);
                setEditUser(null);
              }}
              className="text-sm px-3 py-1 rounded bg-blue-500 hover:bg-blue-400 font-medium"
            >
              ← Back to Users
            </button>
            <div className="text-sm text-gray-500">
              {editUser ? `Editing ${editUser.role}` : `Viewing ${viewUser.role}`}
            </div>
          </div>
        )}

        {showingTable && (
          <FiltersSearch
            filter={filter}
            setFilter={setFilter}
            search={search}
            setSearch={setSearch}
          />
        )}

        {showingTable && (
          <UsersTable
            loading={loading}
            users={filteredUsers}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {viewUser && !editUser && (
          <div className="space-y-4">
            <ViewUserModal
              user={viewUser}
              fields={orderedFields}
              onClose={() => setViewUser(null)}
              swap
            />
            <div className="flex justify-end">
              <button
                onClick={() => handleEdit(viewUser)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Edit This User
              </button>
            </div>
          </div>
        )}

        {editUser && (
          <EditUserModal
            user={editUser}
            fields={orderedFields}
            updating={updating}
            onChange={setEditUser}
            onSave={saveUserEdits}
            onCancel={() => setEditUser(null)}
            swap
            title={`Edit ${editUser.role}`}
          />
        )}
      </div>

      {addModalUser && (
        <AddStudentModal
          user={addModalUser}
          onChange={setAddModalUser}
          onSave={handleCreateStudent}
          onCancel={() => setAddModalUser(null)}
          creating={creating}
        />
      )}
    </AdminLayout>
  );
}