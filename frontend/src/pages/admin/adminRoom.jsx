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
      <div className="w-full max-w-6xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#32487E]">Kiosk Management</h2>
        </div>

        {kiosks.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No kiosks available.</p>
        ) : (
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
      </div>
    </AdminLayout>
  );
}
