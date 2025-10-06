import { useState, useEffect } from "react";
import AdminLayout from "../../components/adminLayout";
import { updatePassword, fetchSignInMethodsForEmail} from "firebase/auth";
import { collection, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminManagement() {
  const [activeTab, setActiveTab] = useState("users");
  const [approved, setApproved] = useState([]);
  const [pending, setPending] = useState([]);

  const fetchAllAccounts = async () => {
    try {
      const [studentsSnap, teachersSnap] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "teachers")),
      ]);

      const students = studentsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        type: "students",
        role: "student",
      }));

      const teachers = teachersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        type: "teachers",
        role: "teacher",
      }));

      const all = [...students, ...teachers];

      const approvedAccounts = all.filter((a) => a.status === "approved");
      const pendingAccounts = all.filter((a) => a.status === "pending");

      setApproved(approvedAccounts);
      setPending(pendingAccounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load accounts");
    }
  };

  useEffect(() => {
    fetchAllAccounts();
  }, []);


  const generateRandomPassword = (length = 10) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };


  const handleApprove = async (id, type) => {
  try {
    const userRef = doc(db, type, id);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      toast.error("User record not found");
      return;
    }

    const userData = userSnap.data();
    const email = userData.email;

    if (!email) {
      toast.error("No email found for this user");
      return;
    }

    const randomPassword = generateRandomPassword();

    const userCredential = await createUserWithEmailAndPassword(auth, email, randomPassword);
    const uid = userCredential.user.uid;


    await updateDoc(userRef, {
      status: "approved",
      uid,
      generatedPassword: randomPassword,
    });

    toast.success(`Approved ${email} and created Firebase Auth account`);
    fetchAllAccounts();

  } catch (error) {
    console.error("Error approving user:", error);
    toast.error(`Failed to approve user: ${error.message}`);
  }
};
  return (
    <AdminLayout title="User Management">
      <div className="bg-white shadow-md rounded-lg">
        {/* Tabs */}
        <div className="flex border-b bg-gray-50 rounded-t-lg">
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === "users"
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800"
              }`}
            onClick={() => setActiveTab("users")}
          >
            Approved Users
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === "pending"
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800"
              }`}
            onClick={() => setActiveTab("pending")}
          >
            Pending Users
          </button>
        </div>

        <div className="p-4">
          {activeTab === "users" ? (
            <Table data={approved} onApprove={handleApprove} />
          ) : (
            <Table data={pending} onApprove={handleApprove} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function Table({ data, onApprove }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-700">
          <span>Show</span>
          <select className="border rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none">
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
          <span>entries</span>
        </div>

        <div className="flex items-center space-x-3">
          <select className="border rounded-md px-2 py-1 text-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:outline-none">
            <option>All Roles</option>
            <option>Student</option>
            <option>Teacher</option>
          </select>
          <input
            type="text"
            placeholder="Search..."
            className="bg-gray-50 border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-700 
            focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-blue-50 text-left text-gray-700">
              <th className="px-6 py-3 text-sm font-semibold">Name</th>
              <th className="px-6 py-3 text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-sm font-semibold">Role</th>
              <th className="px-6 py-3 text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-3 text-center text-gray-500">
                  No records found
                </td>
              </tr>
            ) : (
              data.map((user, idx) => (
                <tr
                  key={user.id}
                  className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-blue-50 transition-colors`}
                >
                  <td className="px-6 py-3 text-sm text-gray-800">
                    {user.firstName || user.first_name} {user.lastName || user.last_name}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-800">{user.email}</td>
                  <td className="px-6 py-3 text-sm text-gray-800">{user.role}</td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                        }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {user.status === "pending" && (
                      <button
                        onClick={() => onApprove(user.id, user.type)}
                        className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
        <span>
          Showing {data.length > 0 ? `1 to ${data.length}` : 0} of {data.length} Users
        </span>
      </div>
    </div>
  );
}
