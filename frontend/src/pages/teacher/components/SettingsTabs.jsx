import React from "react";

/**
 * SettingsTabs: tab navigation bar for Account / Profile
 */
export default function SettingsTabs({ activeTab, setActiveTab }) {
  return (
    <div className="flex border-b border-[#415CA0] mb-6 gap-6">
      <button
        onClick={() => setActiveTab("account")}
        className={`pb-3 font-semibold transition-colors ${
          activeTab === "account"
            ? "text-[#415CA0] border-b-2 border-[#415CA0]"
            : "text-gray-400 hover:text-[#415CA0]"
        }`}
      >
        Account
      </button>
      <button
        onClick={() => setActiveTab("profile")}
        className={`pb-3 font-semibold transition-colors ${
          activeTab === "profile"
            ? "text-[#415CA0] border-b-2 border-[#415CA0]"
            : "text-gray-400 hover:text-[#415CA0]"
        }`}
      >
        Profile
      </button>
    </div>
  );
}