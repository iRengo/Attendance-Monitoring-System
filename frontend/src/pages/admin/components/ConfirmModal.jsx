import React from "react";

/**
 * Small confirmation modal. Props:
 * - open: boolean
 * - onClose: () => void
 * - onConfirm: () => void
 * - pendingState: boolean (for copy)
 */
export default function ConfirmModal({ open, onClose, onConfirm, pendingState }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md transform transition-all">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">
          {pendingState ? "Enable Maintenance Mode?" : "Disable Maintenance Mode?"}
        </h3>
        <p className="text-gray-600 mb-6">
          {pendingState
            ? "Activating maintenance mode will restrict access to only admins. Are you sure you want to proceed?"
            : "Disabling maintenance mode will allow all users to log in again. Continue?"}
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition">
            Cancel
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-white font-medium transition ${pendingState ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
            {pendingState ? "Enable" : "Disable"}
          </button>
        </div>
      </div>
    </div>
  );
}