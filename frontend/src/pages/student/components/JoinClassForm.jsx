import React from "react";

/**
 * JoinClassForm
 * Props: joinLink, setJoinLink, handleJoinLink
 * Preserves original join UI and styling.
 */
export default function JoinClassForm({ joinLink, setJoinLink, handleJoinLink }) {
  return (
    <div className="flex gap-2 text-gray-800">
      <input
        type="text"
        placeholder="Enter class link"
        value={joinLink}
        onChange={(e) => setJoinLink(e.target.value)}
        className="border border-gray-300 rounded-lg px-4 py-2 flex-1 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
      />
      <button
        onClick={handleJoinLink}
        className="bg-[#3498db] text-white px-4 py-2 rounded-lg hover:bg-[#2f89ca] transition"
      >
        Join
      </button>
    </div>
  );
}