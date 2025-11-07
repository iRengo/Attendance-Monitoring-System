import React from "react";

/**
 * EditUserModal
 * swap = true: inline panel without its own Back/Cancel button (parent supplies navigation).
 * swap = false: legacy overlay with Cancel.
 */
export default function EditUserModal({
  user,
  fields = [],
  updating = false,
  onChange,
  onSave,
  onCancel,
  swap = false,
  title = "Edit User",
}) {
  if (!user) return null;

  const Wrapper = ({ children }) =>
    swap ? (
      <div className="rounded-xl border border-green-200 bg-gradient-to-br from-white to-green-50 p-6 shadow-md">
        {children}
      </div>
    ) : (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0 backdrop-blur-sm bg-black/20"
          onClick={onCancel}
        />
        <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10">
          {children}
        </div>
      </div>
    );

  return (
    <Wrapper>
      <h2 className="text-2xl font-bold mb-4 text-green-700 border-b pb-2">
        {title}
      </h2>

      <div
        className={`space-y-3 text-gray-800 ${
          swap ? "max-h-[55vh]" : "max-h-80"
        } overflow-y-auto pr-2`}
      >
        {fields
          .filter((key) => key in user)
          .map((key) => (
            <div key={key} className="flex flex-col">
              <label className="text-xs font-semibold text-gray-500 mb-1 capitalize">
                {key.replace(/_/g, " ")}
              </label>
              <input
                type="text"
                placeholder={key.replace(/_/g, " ")}
                value={user[key] || ""}
                onChange={(e) => onChange({ ...user, [key]: e.target.value })}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 text-sm"
              />
            </div>
          ))}
      </div>

      {/* Actions: omit Back/Cancel in swap mode */}
      <div className="mt-6 flex justify-end gap-3">
        {!swap && (
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-5 py-2 rounded-xl shadow-md"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        )}
        <button
          className={`bg-green-600 text-white px-5 py-2 rounded-xl shadow-md font-semibold transition ${
            updating
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-green-700 active:scale-[.98]"
          }`}
          onClick={onSave}
          disabled={updating}
          type="button"
        >
          {updating ? "Saving..." : "Save"}
        </button>
      </div>
    </Wrapper>
  );
}