import React from "react";

/**
 * MaintenanceSection: shows toggle UI for maintenance mode
 */
export default function MaintenanceSection({ isMaintenance, handleToggleMaintenance }) {
  return (
    <>
      <div className="bg-gray-50 p-6 rounded-xl shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <span className="text-gray-700 font-medium">Enable Maintenance Mode</span>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isMaintenance} onChange={handleToggleMaintenance} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-red-500 relative transition-all">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
            </div>
          </label>
        </div>
      </div>

      <p className="text-gray-500 text-sm mt-3">
        When <strong>Maintenance Mode</strong> is enabled, <em>only admins</em> can log in. Students and teachers will see a maintenance notice instead.
      </p>
    </>
  );
}