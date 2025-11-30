import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import AdminLayout from "../../components/adminLayout";
import { toast } from "react-toastify";

export default function AdminKiosk() {
  const [kiosks, setKiosks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [editMode, setEditMode] = useState(null); // which kiosk is being edited

  // Mobile detection (Tailwind 'sm' breakpoint = 640px)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  // Fetch kiosks (real-time)
  useEffect(() => {
    const kiosksCollection = collection(db, "kiosks");
    const unsubscribe = onSnapshot(kiosksCollection, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setKiosks(data);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Fetch rooms from the array in "rooms/roomlist"
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomDocRef = doc(db, "rooms", "roomlist");
        const roomDocSnap = await getDoc(roomDocRef);

        if (roomDocSnap.exists()) {
          const data = roomDocSnap.data();
          setRooms(data.roomlisted || []);
        } else {
          setRooms([]);
        }
      } catch (err) {
        console.error("Error fetching rooms:", err);
        toast.error("Failed to fetch rooms!");
      }
    };

    fetchRooms();
  }, []);

  // Assign room to kiosk
  const handleAssignRoom = async (kioskId, roomId) => {
    try {
      setLoadingAssign(true);
      const kioskRef = doc(db, "kiosks", kioskId);
      await updateDoc(kioskRef, {
        assignedRoomId: roomId,
      });
      toast.success(`Assigned ${roomId} to kiosk ${kioskId}`);
      setEditMode(null);
    } catch (err) {
      console.error("Error assigning room:", err);
      toast.error("Failed to assign room!");
    } finally {
      setLoadingAssign(false);
    }
  };

  return (
    <AdminLayout title="Kiosk Management">
      <div className="w-full max-w-6xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h2 className="text-2xl font-bold text-[#32487E]">Kiosk Management</h2>
          <div className="text-sm text-gray-600">
            {kiosks.length} kiosk{kiosks.length !== 1 ? "s" : ""}
          </div>
        </div>

        {kiosks.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No kiosks available.</p>
        ) : (
          <>
            {/* DESKTOP: table view (keeps original desktop dimensions/behaviour) */}
            {!isMobile && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-gray-700 border border-gray-200 rounded-lg">
                  <thead className="bg-[#415CA0] text-white text-left">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Kiosk ID</th>
                      <th className="px-5 py-3 font-semibold">Assigned Room</th>
                      <th className="px-5 py-3 font-semibold">Kiosk Name</th>
                      <th className="px-5 py-3 font-semibold">Serial Number</th>
                      <th className="px-5 py-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kiosks.map((kiosk) => (
                      <tr
                        key={kiosk.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-all"
                      >
                        <td className="px-5 py-3 font-medium text-[#32487E]">{kiosk.id}</td>

                        <td className="px-5 py-3">
                          {editMode === kiosk.id ? (
                            <select
                              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#415CA0] focus:outline-none"
                              disabled={loadingAssign}
                              onChange={(e) => handleAssignRoom(kiosk.id, e.target.value)}
                              defaultValue={kiosk.assignedRoomId || ""}
                            >
                              <option value="" disabled>
                                Select Room
                              </option>
                              {rooms.map((roomName, index) => (
                                <option key={index} value={roomName}>
                                  {roomName}
                                </option>
                              ))}
                            </select>
                          ) : kiosk.assignedRoomId ? (
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                              {kiosk.assignedRoomId}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="px-5 py-3">{kiosk.name || "-"}</td>
                        <td className="px-5 py-3">{kiosk.serialNumber || "-"}</td>

                        <td className="px-5 py-3 text-center">
                          {editMode === kiosk.id ? (
                            <button
                              onClick={() => setEditMode(null)}
                              className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition"
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditMode(kiosk.id)}
                              className="text-sm px-3 py-1 bg-[#415CA0] hover:bg-[#32487E] text-white rounded-md transition"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* MOBILE: card/list view (compact, tap-friendly) */}
            {isMobile && (
              <div className="space-y-3">
                {kiosks.map((kiosk) => (
                  <div
                    key={kiosk.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate">
                            <div className="text-sm font-semibold text-[#32487E]">
                              {kiosk.name || kiosk.id}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{kiosk.serialNumber || "-"}</div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-gray-400">ID</div>
                            <div className="text-sm font-medium text-gray-700">{kiosk.id}</div>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <div className="text-xs text-gray-400">Assigned:</div>
                          {editMode === kiosk.id ? (
                            <select
                              className="border border-gray-300 rounded-lg px-3 text-gray-500 py-1 text-sm focus:ring-2 focus:ring-[#415CA0] focus:outline-none"
                              disabled={loadingAssign}
                              onChange={(e) => handleAssignRoom(kiosk.id, e.target.value)}
                              defaultValue={kiosk.assignedRoomId || ""}
                            >
                              <option value="" disabled>
                                Select Room
                              </option>
                              {rooms.map((roomName, index) => (
                                <option key={index} value={roomName}>
                                  {roomName}
                                </option>
                              ))}
                            </select>
                          ) : kiosk.assignedRoomId ? (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                              {kiosk.assignedRoomId}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      {editMode === kiosk.id ? (
                        <button
                          onClick={() => setEditMode(null)}
                          className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditMode(kiosk.id)}
                          className="flex-1 px-3 py-2 bg-[#415CA0] hover:bg-[#32487E] text-white rounded-md text-sm"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}