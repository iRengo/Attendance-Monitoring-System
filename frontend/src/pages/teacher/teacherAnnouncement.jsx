import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import TeacherLayout from "../../components/teacherLayout";
import { Megaphone } from "lucide-react";

export default function TeacherAnnouncement() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Filter announcements for teachers or all
      const filtered = data.filter((a) => {
        const now = new Date();
        const exp = new Date(a.expiration);
        return (
          (a.target === "teachers" || a.target === "all") &&
          exp >= now
        );
      });

      // Sort by newest first
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt?.toDate?.() || 0) -
          new Date(a.createdAt?.toDate?.() || 0)
      );

      setAnnouncements(filtered);
    });

    return () => unsub();
  }, []);

  return (
    <TeacherLayout title="Announcements">
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
            <p className="text-gray-500 text-center py-10">
              No announcements available.
            </p>
          ) : (
            <ul className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400/40 pr-2">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className="border border-[#415CA0]/30 rounded-xl p-4 hover:bg-[#F0F4FF] transition"
                >
                  <h3 className="font-semibold text-[#32487E] text-lg mb-1">
                    {a.title}
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {a.content}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Expires: {new Date(a.expiration).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
