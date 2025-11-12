import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase";

const SECTION_OPTIONS = ["BM1MA", "HU1MA", "HU2AA", "IC1MA", "IC2AA"];

export default function ClassModal({
  showModal,
  setShowModal,
  classForm,
  setClassForm,
  showDaysDropdown,
  setShowDaysDropdown,
  handleSaveClass,
  isEditMode,
  loading,
}) {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomDocRef = doc(db, "rooms", "roomlist"); // your document name
        const roomSnap = await getDoc(roomDocRef);

        if (roomSnap.exists()) {
          const data = roomSnap.data();
          if (Array.isArray(data.roomlisted)) {
            setRooms(data.roomlisted);
          } else {
            console.warn("roomlisted is not an array");
            setRooms([]);
          }
        } else {
          console.warn("No roomlist document found");
          setRooms([]);
        }
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };

    fetchRooms();
  }, []);

  if (!showModal) return null;

  const resolvedSectionOptions =
    SECTION_OPTIONS.includes(classForm.section) || !classForm.section
      ? SECTION_OPTIONS
      : [classForm.section, ...SECTION_OPTIONS];

  return (
    <div className="fixed inset-0 flex items-center justify-center text-gray-800 bg-black/40 backdrop-blur-sm z-50">
      <div className="bg-white rounded-2xl shadow-xl w-11/12 max-w-md p-8 relative">
        {/* Close button */}
        <button
          onClick={() => setShowModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition"
        >
          <X size={22} />
        </button>

        <h2 className="text-xl font-semibold text-[#3498db] mb-6">
          {isEditMode ? "Edit Class" : "Add New Class"}
        </h2>

        <div className="space-y-4">
          {/* Subject Input */}
          <input
            type="text"
            placeholder="Subject"
            value={classForm.subject}
            onChange={(e) =>
              setClassForm({ ...classForm, subject: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
          />

          {/* Room Dropdown */}
          <select
            value={classForm.room}
            onChange={(e) =>
              setClassForm({ ...classForm, room: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-[#3498db] outline-none"
          >
            <option value="">Select Room</option>
            {rooms.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>

          {/* Section Dropdown */}
          <select
            value={classForm.section}
            onChange={(e) =>
              setClassForm({ ...classForm, section: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#3498db] outline-none text-gray-700"
          >
            <option value="">Select Section</option>
            {resolvedSectionOptions.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>

          {/* Grade Level */}
          <select
            value={classForm.gradeLevel}
            onChange={(e) =>
              setClassForm({ ...classForm, gradeLevel: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-[#3498db] outline-none"
          >
            <option value="">Select Grade Level</option>
            <option value="11">Grade 11</option>
            <option value="12">Grade 12</option>
          </select>

          {/* Days Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDaysDropdown((prev) => !prev)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-left focus:ring-2 focus:ring-[#3498db] outline-none"
              type="button"
            >
              {classForm.days.length > 0
                ? classForm.days.join(", ")
                : "Select Days"}
            </button>
            {showDaysDropdown && (
              <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-sm z-50 max-h-56 overflow-y-auto">
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={classForm.days.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setClassForm({
                            ...classForm,
                            days: [...classForm.days, day],
                          });
                        } else {
                          setClassForm({
                            ...classForm,
                            days: classForm.days.filter((d) => d !== day),
                          });
                        }
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Time Inputs */}
          <div className="flex gap-4">
            <input
              type="time"
              value={classForm.startTime}
              onChange={(e) =>
                setClassForm({ ...classForm, startTime: e.target.value })
              }
              className="w-1/2 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
            />
            <input
              type="time"
              value={classForm.endTime}
              onChange={(e) =>
                setClassForm({ ...classForm, endTime: e.target.value })
              }
              className="w-1/2 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveClass}
            disabled={loading}
            className="w-full bg-[#3498db] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2f89ca] transition disabled:opacity-60"
          >
            {loading
              ? "Saving..."
              : isEditMode
              ? "Update Class"
              : "Add Class"}
          </button>
        </div>
      </div>
    </div>
  );
}
