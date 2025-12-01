import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import AdminLayout from "../../components/adminLayout";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

export default function AdminKiosk() {
  const [kiosks, setKiosks] = useState([]);
  const [keys, setKeys] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [editMode, setEditMode] = useState(null); // which kiosk is being edited
  const [activeTab, setActiveTab] = useState("kiosks"); // kiosks | keys

  // Mobile detection
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

  // Fetch kiosks
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

  // Fetch kiosk keys
  useEffect(() => {
    const keysCollection = collection(db, "kiosks_codes");
    const unsubscribe = onSnapshot(keysCollection, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        key: doc.id,
        ...doc.data(),
      }));
      setKeys(data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)); // newest first
    });
    return () => unsubscribe();
  }, []);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomDocRef = doc(db, "rooms", "roomlist");
        const roomDocSnap = await getDoc(roomDocRef);
        if (roomDocSnap.exists()) {
          setRooms(roomDocSnap.data().roomlisted || []);
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
      await updateDoc(kioskRef, { assignedRoomId: roomId });
      toast.success(`Assigned ${roomId} to kiosk ${kioskId}`);
      setEditMode(null);
    } catch (err) {
      console.error("Error assigning room:", err);
      toast.error("Failed to assign room!");
    } finally {
      setLoadingAssign(false);
    }
  };

  // Generate a new kiosk key
  const handleGenerateKey = async () => {
    try {
      const key = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiration = new Date();
      expiration.setMinutes(expiration.getMinutes() + 5);

      const keyRef = doc(db, "kiosks_codes", key);
      await setDoc(keyRef, {
        expiration: Timestamp.fromDate(expiration),
        kioskId: null,
        used: false,
        usedAt: null,
        createdAt: serverTimestamp(),
      });

      await Swal.fire({
        icon: "success",
        title: "Generated Key",
        html: `<div class="text-7xl font-mono text-center text-blue-600">${key}</div><p class="mt-2">Expires in 5 minutes.</p>`,
        confirmButtonText: "OK",
      });
    } catch (err) {
      console.error("Failed to generate key:", err);
      Swal.fire("Error", "Failed to generate key. See console.", "error");
    }
  };

  return (
    <AdminLayout title="Kiosk Management">
      <div className="w-full max-w-6xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
        {/* Header + Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h2 className="text-2xl font-bold text-[#32487E]">Kiosk Management</h2>
          <div className="flex gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("kiosks")}
                className={`px-4 py-2 rounded-md ${activeTab === "kiosks" ? "bg-[#415CA0] text-white" : "bg-gray-200 text-gray-700"}`}
              >
                Kiosks
              </button>
              <button
                onClick={() => setActiveTab("keys")}
                className={`px-4 py-2 rounded-md ${activeTab === "keys" ? "bg-[#415CA0] text-white" : "bg-gray-200 text-gray-700"}`}
              >
                Keys
              </button>
            </div>
            {activeTab === "keys" && (
              <button
                onClick={handleGenerateKey}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Generate Key
              </button>
            )}
          </div>
        </div>

        {/* KIOSKS TAB */}
        {activeTab === "kiosks" && (
          <>
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
                              <option value="" disabled>Select Room</option>
                              {rooms.map((roomName, index) => (
                                <option key={index} value={roomName}>{roomName}</option>
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
                            >Cancel</button>
                          ) : (
                            <button
                              onClick={() => setEditMode(kiosk.id)}
                              className="text-sm px-3 py-1 bg-[#415CA0] hover:bg-[#32487E] text-white rounded-md transition"
                            >Edit</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* KEYS TAB */}
        {activeTab === "keys" && (
          <>
            {keys.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No keys generated yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-gray-700 border border-gray-200 rounded-lg">
                  <thead className="bg-[#415CA0] text-white text-left">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Key</th>
                      <th className="px-5 py-3 font-semibold">Kiosk ID</th>
                      <th className="px-5 py-3 font-semibold">Used</th>
                      <th className="px-5 py-3 font-semibold">Used At</th>
                      <th className="px-5 py-3 font-semibold">Expiration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k.key} className="border-b border-gray-200 hover:bg-gray-50 transition-all">
                        <td className="px-5 py-3 font-mono text-blue-600">{k.key}</td>
                        <td className="px-5 py-3">{k.kioskId || "-"}</td>
                        <td className="px-5 py-3">{k.used ? "Yes" : "No"}</td>
                        <td className="px-5 py-3">{k.usedAt ? new Date(k.usedAt.seconds * 1000).toLocaleString() : "-"}</td>
                        <td className="px-5 py-3">{k.expiration ? new Date(k.expiration.seconds * 1000).toLocaleTimeString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
