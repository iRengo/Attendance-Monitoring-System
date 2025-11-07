import React, { useState } from "react";

/**
 * ViewUserModal
 * If swap = true it renders inline (panel) without its own Back/Close button.
 * The parent provides the "← Back to Users" control already.
 * When swap = false (legacy modal overlay) it still shows a Close button.
 */
export default function ViewUserModal({ user, fields, onClose, swap = false }) {
  if (!user) return null;

  const picCandidates = [
    user.profilePicUrl,
    user.profile_pic_url,
    user.profilepicurl,
    user.profilePic,
    user.profile_pic,
    user.profilepic,
    user.photoURL,
    user.photourl,
  ];

  const profileSrc =
    picCandidates
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .find((v) => v.length > 0) ||
    "https://www.w3schools.com/howto/img_avatar.png";

  const [showPreview, setShowPreview] = useState(false);

  const Wrapper = ({ children }) =>
    swap ? (
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-white to-blue-50 p-6 shadow-md">
        {children}
      </div>
    ) : (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        ></div>
        <div className="relative bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 flex flex-col">
          {children}
        </div>
      </div>
    );

  return (
    <>
      <Wrapper>
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative group">
            <img
              src={profileSrc}
              alt={`${user.firstname || user.name || "User"} profile`}
              className="w-24 h-24 rounded-xl object-cover border-2 border-blue-200 shadow-sm cursor-pointer group-hover:scale-[1.02] transition"
              onClick={() => setShowPreview(true)}
              onError={(e) => {
                e.currentTarget.src =
                  "https://www.w3schools.com/howto/img_avatar.png";
              }}
            />
            <span className="absolute -top-2 -left-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow">
              {user.role || (user.classes ? "Student" : "Teacher")}
            </span>
          </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-blue-700">
                {`${user.firstname || ""} ${user.middlename || ""} ${
                  user.lastname || ""
                }`.trim() ||
                  user.name ||
                  "User Details"}
              </h2>
              {user.school_email && (
                <p className="text-xs text-gray-500 mt-1 break-all">
                  {user.school_email}
                </p>
              )}
            </div>
        </div>

        {/* Details */}
        <div
          className={`space-y-2 text-gray-800 ${
            swap ? "max-h-[50vh]" : "max-h-72"
          } overflow-y-auto pr-1 custom-scrollbar`}
        >
          {fields
            .filter((key) => key in user)
            .map((key) => {
              const value = user[key];
              if (
                [
                  "profilepicurl",
                  "profilePicUrl",
                  "profile_pic_url",
                  "profilePic",
                  "profilepic",
                  "profile_pic",
                  "photoURL",
                  "photourl",
                ].includes(key)
              )
                return null;
              if (value === "" || value == null) return null;
              return (
                <div
                  key={key}
                  className="flex justify-between items-start gap-3 border-b border-gray-100 pb-1"
                >
                  <span className="font-semibold text-gray-600 capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm text-gray-700 text-right break-words max-w-[55%]">
                    {String(value)}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Actions: hide in swap mode (parent has Back button) */}
        {!swap && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow duration-150"
            >
              Close
            </button>
          </div>
        )}
      </Wrapper>

      {/* Full image preview (overlay still ok) */}
      {showPreview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={() => setShowPreview(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <img
            src={profileSrc}
            alt="Full profile"
            className="relative z-10 max-w-[70vw] max-h-[70vh] object-contain rounded-xl shadow-xl"
            onError={(e) => {
              e.currentTarget.src =
                "https://www.w3schools.com/howto/img_avatar.png";
            }}
          />
        </div>
      )}
    </>
  );
}