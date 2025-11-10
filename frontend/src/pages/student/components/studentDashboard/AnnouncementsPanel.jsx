import { Megaphone } from "lucide-react";

export default function AnnouncementsPanel({ announcements }) {
  return (
    <div className="bg-white shadow-sm rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Megaphone className="text-blue-500" />
        Announcements
      </h2>
      {announcements.length > 0 ? (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li
              key={a.id}
              className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-blue-50 transition"
            >
              <h3 className="font-semibold text-gray-800">{a.title}</h3>
              <p className="text-gray-700 text-sm mt-1">{a.content}</p>
              <p className="text-xs text-gray-500 mt-2">
                Posted by {a.author} • Expires on{" "}
                {new Date(a.expiration).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 italic">No current announcements.</p>
      )}
    </div>
  );
}