import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import TeacherLayout from "../../components/teacherLayout";
import { Megaphone } from "lucide-react";
import { toast } from "react-toastify";

export default function TeacherAnnouncement() {
  const [announcements, setAnnouncements] = useState([]);
  const [teacherUid, setTeacherUid] = useState(null);
  const [hasUnread, setHasUnread] = useState(false); // <-- RED badge

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("No logged-in teacher!");
      return;
    }
    setTeacherUid(user.uid);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const now = new Date();
      const filtered = data
        .filter(a => (a.target === "teachers" || a.target === "all") && new Date(a.expiration) >= now)
        .sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt || 0) - new Date(a.createdAt?.toDate?.() || a.createdAt || 0));

      setAnnouncements(filtered);

      // Check if there are any unread announcements
      if (teacherUid) {
        const unread = filtered.some(a => !a.readBy?.includes(teacherUid));
        setHasUnread(unread);
      }
    });

    return () => unsub();
  }, [teacherUid]);

  const markAsRead = async (a) => {
    if (!a.readBy?.includes(teacherUid)) {
      const ref = doc(db, "announcements", a.id);
      await updateDoc(ref, { readBy: [...(a.readBy || []), teacherUid] });
    }
  };

  return (
    <TeacherLayout
      title={
        <div className="flex items-center gap-2">
          Announcements
          {hasUnread && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              1
            </span>
          )}
        </div>
      }
    >
      <div className="flex flex-col items-center w-full">
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#415CA0] text-white p-2 rounded-full shadow-md">
            <Megaphone size={22} />
          </div>
          <h2 className="text-2xl font-bold text-[#415CA0]">
            Admin Announcements
          </h2>
        </div>

        {/* ANNOUNCEMENT LIST */}
        <div className="w-full max-w-4xl bg-white border border-gray-200 shadow-md rounded-2xl p-6">
          {announcements.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No announcements available.</p>
          ) : (
            <ul className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400/40 pr-2">
              {announcements.map((a) => {
                const isRead = a.readBy?.includes(teacherUid);
                return (
                  <li
                    key={a.id}
                    className={`border rounded-xl p-4 transition ${isRead ? "bg-white border-gray-300" : "bg-blue-50 border-blue-400"} hover:bg-[#F0F4FF]`}
                    onClick={() => markAsRead(a)}
                  >
                    <h3 className="font-semibold text-[#32487E] text-lg mb-1">{a.title}</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{a.content}</p>
                    <p className="text-[11px] text-gray-500 mt-2">
                      Expires: {new Date(a.expiration).toLocaleDateString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
