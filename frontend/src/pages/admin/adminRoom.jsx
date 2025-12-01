import React, { useEffect, useState } from "react";
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
  const [editMode, setEditMode] = useState(null);
  const [activeTab, setActiveTab] = useState("kiosks");

  // Mobile detection (kept for any future behavior that needs it)
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
      setKeys(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
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
        html: `<div class="text-4xl sm:text-7xl font-mono text-center text-blue-600">${key}</div><p class="mt-2">Expires in 5 minutes.</p>`,
        confirmButtonText: "OK",
      });
    } catch (err) {
      console.error("Failed to generate key:", err);
      Swal.fire("Error", "Failed to generate key. See console.", "error");
    }
  };

  return (
    <AdminLayout title="Kiosk Management">
      <div className="w-full max-w-6xl mx-auto bg-white p-4 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
        {/* Header + Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h2 className="text-2xl font-bold text-[#32487E]">Kiosk Management</h2>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("kiosks")}
                className={`flex-1 sm:flex-none text-sm px-4 py-2 rounded-md ${activeTab === "kiosks" ? "bg-[#415CA0] text-white" : "bg-gray-200 text-gray-700"}`}
                aria-pressed={activeTab === "kiosks"}
              >
                Kiosks
              </button>
              <button
                onClick={() => setActiveTab("keys")}
                className={`flex-1 sm:flex-none text-sm px-4 py-2 rounded-md ${activeTab === "keys" ? "bg-[#415CA0] text-white" : "bg-gray-200 text-gray-700"}`}
                aria-pressed={activeTab === "keys"}
              >
                Keys
              </button>
            </div>

            {activeTab === "keys" && (
              <button
                onClick={handleGenerateKey}
                className="mt-2 sm:mt-0 sm:ml-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
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
              <>
                {/* Desktop / tablet table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm text-gray-700 border border-gray-200 rounded-lg">
                    <thead className="bg-[#415CA0] text-white text-left">
                      <tr>
                        <th className="px-3 sm:px-5 py-3 font-semibold">Kiosk ID</th>
                        <th className="px-3 sm:px-5 py-3 font-semibold">Assigned Room</th>
                        <th className="px-3 sm:px-5 py-3 font-semibold">Kiosk Name</th>
                        <th className="px-3 sm:px-5 py-3 font-semibold">Serial Number</th>
                        <th className="px-3 sm:px-5 py-3 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kiosks.map((kiosk) => (
                        <tr key={kiosk.id} className="border-b border-gray-200 hover:bg-gray-50 transition-all">
                          <td className="px-2 sm:px-5 py-2 font-medium text-[#32487E]">{kiosk.id}</td>
                          <td className="px-2 sm:px-5 py-2">
                            {editMode === kiosk.id ? (
                              <select
                                className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1 text-sm w-48 focus:ring-2 focus:ring-[#415CA0] focus:outline-none"
                                disabled={loadingAssign}
                                onChange={(e) => handleAssignRoom(kiosk.id, e.target.value)}
                                defaultValue={kiosk.assignedRoomId || ""}
                                aria-label={`Select room for kiosk ${kiosk.id}`}
                              >
                                <option value="" disabled>Select Room</option>
                                {rooms.map((roomName, index) => (
                                  <option key={index} value={roomName}>{roomName}</option>
                                ))}
                              </select>
                            ) : kiosk.assignedRoomId ? (
                              <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                                {kiosk.assignedRoomId}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-2 sm:px-5 py-2">{kiosk.name || "-"}</td>
                          <td className="px-2 sm:px-5 py-2">{kiosk.serialNumber || "-"}</td>
                          <td className="px-2 sm:px-5 py-2 text-center">
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

                {/* Mobile: card list for better readability */}
                <ul className="md:hidden space-y-3">
                  {kiosks.map((kiosk) => (
                    <li key={kiosk.id} className="p-3 border border-gray-200 rounded-lg shadow-sm bg-white">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-sm text-blue-600">{kiosk.id}</div>
                            <div className="text-sm font-semibold text-[#32487E] truncate">{kiosk.name || "-"}</div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            <div>Serial: {kiosk.serialNumber || "-"}</div>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {editMode === kiosk.id ? (
                            <button
                              onClick={() => setEditMode(null)}
                              className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition"
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditMode(kiosk.id)}
                              className="text-xs px-3 py-1 bg-[#415CA0] hover:bg-[#32487E] text-white rounded-md transition"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-medium text-gray-600">Assigned Room</div>
                        <div className="mt-1">
                          {editMode === kiosk.id ? (
                            <select
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 focus:ring-2 focus:ring-[#415CA0] focus:outline-none"
                              disabled={loadingAssign}
                              onChange={(e) => handleAssignRoom(kiosk.id, e.target.value)}
                              defaultValue={kiosk.assignedRoomId || ""}
                              aria-label={`Select room for kiosk ${kiosk.id}`}
                            >
                              <option value="" disabled>Select Room</option>
                              {rooms.map((roomName, index) => (
                                <option key={index} value={roomName}>{roomName}</option>
                              ))}
                            </select>
                          ) : kiosk.assignedRoomId ? (
                            <span className="inline-block mt-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                              {kiosk.assignedRoomId}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        {/* KEYS TAB */}
        {activeTab === "keys" && (
          <>
            {keys.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No keys generated yet.</p>
            ) : (
              <>
                {/* Desktop / tablet table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm text-gray-700 border border-gray-200 rounded-lg">
                    <thead className="bg-[#415CA0] text-white text-left">
                      <tr>
                        <th className="px-3 sm:px-5 py-3 font-semibold">Key</th>
                        <th className="px-3 sm:px-5 py-3 font-semibold">Kiosk ID</th>
                        <th className="px-3 sm:px-5 py-3 font-semibold">Used</th>
                        <th className="px-3 sm:px-5 py-3 font-semibold">Used At</th>
                        <th className="px-3 sm:px-5 py-3 font-semibold">Expiration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((k) => (
                        <tr key={k.key} className="border-b border-gray-200 hover:bg-gray-50 transition-all">
                          <td className="px-2 sm:px-5 py-2 font-mono text-blue-600">{k.key}</td>
                          <td className="px-2 sm:px-5 py-2">{k.kioskId || "-"}</td>
                          <td className="px-2 sm:px-5 py-2">{k.used ? "Yes" : "No"}</td>
                          <td className="px-2 sm:px-5 py-2">
                            {k.usedAt ? new Date(k.usedAt.seconds * 1000).toLocaleString() : "-"}
                          </td>
                          <td className="px-2 sm:px-5 py-2">
                            {k.expiration ? new Date(k.expiration.seconds * 1000).toLocaleTimeString() : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: key cards */}
                <ul className="md:hidden space-y-3">
                  {keys.map((k) => (
                    <li key={k.key} className="p-3 border border-gray-200 rounded-lg shadow-sm bg-white">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-mono text-sm text-blue-600">{k.key}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {k.kioskId ? `Kiosk: ${k.kioskId}` : "Kiosk: -"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-semibold ${k.used ? "text-red-600" : "text-green-600"}`}>
                            {k.used ? "Used" : "Unused"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {k.expiration ? new Date(k.expiration.seconds * 1000).toLocaleTimeString() : "-"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-gray-600">
                        <div>Used At: {k.usedAt ? new Date(k.usedAt.seconds * 1000).toLocaleString() : "-"}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}