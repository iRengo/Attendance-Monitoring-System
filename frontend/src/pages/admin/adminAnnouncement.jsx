import { useState, useEffect } from "react";
import { Edit3, Trash2, CalendarDays } from "lucide-react";
import AdminLayout from "../../components/adminLayout";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { logActivity } from "../../utils/logActivity";

export default function AdminAnnouncement() {
  const [announcements, setAnnouncements] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    target: "all",
    expiration: "",
  });
  const [editingId, setEditingId] = useState(null);

  const announcementRef = collection(db, "announcements");

  const targetLabel = (value) => {
    switch (value) {
      case "students":
        return "Students";
      case "teachers":
        return "Teachers";
      case "all":
      default:
        return "All Users";
    }
  };

  const fetchAnnouncements = async () => {
    const snapshot = await getDocs(announcementRef);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const updated = data.map((a) => ({
      ...a,
      status:
        a?.expiration && !Number.isNaN(new Date(a.expiration).getTime()) &&
        new Date(a.expiration) < new Date()
          ? "Expired"
          : "Active",
    }));

    setAnnouncements(updated);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.expiration) return;

    const newAnnouncement = {
      ...formData,
      author: "Admin",
      date: new Date().toLocaleDateString(),
      createdAt: serverTimestamp(),
      status:
        new Date(formData.expiration) < new Date() ? "Expired" : "Active",
    };

    try {
      if (editingId) {
        const docRef = doc(db, "announcements", editingId);
        await updateDoc(docRef, newAnnouncement);

        await logActivity(
          "Updated Announcement",
          `Updated announcement titled "${formData.title}".`
        );

        setEditingId(null);
      } else {
        await addDoc(announcementRef, newAnnouncement);

        await logActivity(
          "Created Announcement",
          `Posted new announcement titled "${formData.title}".`
        );
      }

      setFormData({ title: "", content: "", target: "all", expiration: "" });
      fetchAnnouncements();
    } catch (err) {
      console.error("Error adding/updating announcement:", err);
    }
  };

  const handleEdit = (announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target: announcement.target,
      expiration: announcement.expiration,
    });
    setEditingId(announcement.id);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this announcement?")) {
      try {
        const announcement = announcements.find((a) => a.id === id);
        await deleteDoc(doc(db, "announcements", id));

        await logActivity(
          "Deleted Announcement",
          `Deleted announcement titled "${announcement?.title || "Untitled"}".`
        );

        fetchAnnouncements();
      } catch (error) {
        console.error("Error deleting announcement:", error);
      }
    }
  };

  return (
    <AdminLayout title="Announcements Management">
      <div className="p-4 md:p-6 max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[rgb(52,152,219)] to-blue-500 text-white p-4 md:p-5 rounded-xl shadow-md mb-6 flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold tracking-wide">
            Create Announcement
          </h2>
          <CalendarDays size={24} className="opacity-80" />
        </div>

        {/* Form Section */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-10 transition hover:shadow-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                placeholder="Enter announcement title..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Target Audience
              </label>
              <select
                name="target"
                value={formData.target}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
              >
                <option value="all">All Users</option>
                <option value="students">Students Only</option>
                <option value="teachers">Teachers Only</option>
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700">
              Content
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows="4"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
              placeholder="Write your announcement content..."
            ></textarea>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700">
              Expiration Date
            </label>
            <input
              type="date"
              name="expiration"
              value={formData.expiration}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
            />
          </div>

          <button
            type="submit"
            className="bg-gradient-to-r from-[rgb(52,152,219)] to-blue-500 text-white px-5 py-2 rounded-lg hover:opacity-90 transition w-full md:w-auto"
          >
            {editingId ? "Update Announcement" : "Post Announcement"}
          </button>
        </form>

       {/* MOBILE + DESKTOP RESPONSIVE TABLE */}
<div className="w-full">
  {/* Wrapper */}
  <div className="md:overflow-x-auto">
    <table className="w-full border border-gray-200 rounded-lg overflow-hidden hidden md:table">
      <thead className="bg-[rgb(52,152,219)] text-white">
        <tr>
          <th className="py-3 px-4 text-sm font-semibold">Title</th>
          <th className="py-3 px-4 text-sm font-semibold">Date</th>
          <th className="py-3 px-4 text-sm font-semibold">Target</th>
          <th className="py-3 px-4 text-sm font-semibold">Expiration</th>
          <th className="py-3 px-4 text-sm font-semibold">Author</th>
          <th className="py-3 px-4 text-sm font-semibold">Status</th>
          <th className="py-3 px-4 text-sm font-semibold text-right">Actions</th>
        </tr>
      </thead>
    </table>

    {/* MOBILE CARD LIST (no overflow, fits screen) */}
    <div className="space-y-4 md:hidden">
      {announcements.map((a) => (
        <div
          key={a.id}
          className={`border rounded-xl p-4 shadow-sm ${
            a.status === "Expired" ? "bg-gray-50 opacity-80" : "bg-white"
          }`}
        >
          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-500">Title</p>
            <p className="text-gray-800 font-medium">{a.title}</p>
          </div>

          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-500">Date</p>
            <p className="text-gray-800">{a.date}</p>
          </div>

          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-500">Target</p>
            <p className="text-gray-800">{targetLabel(a.target)}</p>
          </div>

          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-500">Expiration</p>
            <p className="text-gray-800">{a.expiration || "-"}</p>
          </div>

          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-500">Author</p>
            <p className="text-gray-800">{a.author}</p>
          </div>

          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500">Status</p>
            <span
              className={`px-3 py-1 mt-1 inline-block rounded-full text-xs font-semibold ${
                a.status === "Active"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {a.status}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 border-t pt-3">
            <button
              onClick={() => handleEdit(a)}
              className="text-blue-500 hover:text-blue-700"
            >
              <Edit3 size={18} />
            </button>

            <button
              onClick={() => handleDelete(a.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>

    {/* DESKTOP TABLE BODY */}
    <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden hidden md:table">
      <tbody>
        {announcements.map((a) => (
          <tr
            key={a.id}
            className={`border-b ${
              a.status === "Expired" ? "bg-gray-50" : "hover:bg-blue-50"
            }`}
          >
            <td className="py-3 px-4 font-medium text-gray-800">{a.title}</td>
            <td className="py-3 px-4">{a.date}</td>
            <td className="py-3 px-4">{targetLabel(a.target)}</td>
            <td className="py-3 px-4">{a.expiration || "-"}</td>
            <td className="py-3 px-4">{a.author}</td>
            <td className="py-3 px-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  a.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {a.status}
              </span>
            </td>
            <td className="py-3 px-4 text-right space-x-3">
              <button
                onClick={() => handleEdit(a)}
                className="text-blue-500 hover:text-blue-700"
              >
                <Edit3 size={18} />
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

      </div>
    </AdminLayout>
  );
}
