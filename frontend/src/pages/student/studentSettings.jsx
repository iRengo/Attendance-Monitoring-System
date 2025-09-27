import { useState } from "react";
import StudentLayout from "../../components/studentLayout";

export default function StudentSettings() {
  const [activeTab, setActiveTab] = useState("account");

  return (
    <StudentLayout title="Settings">
   
      <div className="border-b border-[#415CA0] mb-4 flex gap-6">
        <button
          onClick={() => setActiveTab("account")}
          className={`pb-2 font-medium ${
            activeTab === "account"
              ? "text-[#415CA0] border-b-2 border-[#415CA0]"
              : "text-gray-500 hover:text-[#415CA0]"
          }`}
        >
          Account
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-2 font-medium ${
            activeTab === "profile"
              ? "text-[#415CA0] border-b-2 border-[#415CA0]"
              : "text-gray-500 hover:text-[#415CA0]"
          }`}
        >
          Profile
        </button>
      </div>

      <div className="p-4 border  rounded-lg">
        {activeTab === "account" && (
          <div className="flex gap-4">
      
            <div className="w-2/3 shadow-md border border-[#d6d6d6] rounded p-4">
              <h2 className="text-lg font-bold text-[#415CA0] mb-2">
                Account Details
              </h2>
              <p className="text-sm text-gray-600">
                Example: Username, Email, Password settings, etc.
              </p>
            </div>

            <div className="w-1/3 shadow-md border border-[#d6d6d6] rounded p-4">
              <h2 className="text-lg font-bold text-[#415CA0] mb-2">
                Quick Actions
              </h2>
              <p className="text-sm text-gray-600">Example: Reset password, 2FA.</p>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="flex gap-4">
    
            <div className="w-2/3 shadow-md border border-[#d6d6d6] rounded p-4">
              <h2 className="text-lg font-bold text-[#415CA0] mb-2">
                Profile Info
              </h2>
              <p className="text-sm text-gray-600">
                Example: Full Name, Contact info, Bio, etc.
              </p>
            </div>

            <div className="w-1/3 border shadow-md border-[#d6d6d6] rounded p-4">
              <h2 className="text-lg font-bold text-[#415CA0] mb-2">
                Profile Picture
              </h2>
              <p className="text-sm text-gray-600">Example: Upload/change profile picture.</p>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
