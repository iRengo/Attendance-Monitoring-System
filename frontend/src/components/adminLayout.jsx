import { useState, useEffect } from "react";
import {
  Home,
  Users,
  ClipboardList,
  Megaphone,
  BarChart3,
  Settings,
  ChevronDown,
  Menu,
  LogOut,
  Bell,
  Monitor, 
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function AdminLayout({ title, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminData, setAdminData] = useState(null);

  const navItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: <Home size={20} /> },
    { name: "User Management", path: "/admin/user", icon: <Users size={20} /> },
    { name: "Kiosk Management", path: "/admin/rooms", icon: <Monitor size={20} /> }, // new module
    { name: "Attendance Records", path: "/admin/attendance", icon: <ClipboardList size={20} /> },
    { name: "Announcements", path: "/admin/announcements", icon: <Megaphone size={20} /> },
    { name: "Reports", path: "/admin/reports", icon: <BarChart3 size={20} /> },
    { name: "System Settings", path: "/admin/settings", icon: <Settings size={20} /> },
  ];

  const pathnames = location.pathname.split("/").filter((x) => x);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const adminRef = doc(db, "admins", user.uid);
          const adminSnap = await getDoc(adminRef);

          if (adminSnap.exists()) {
            setAdminData(adminSnap.data());
          }
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
      }
    };

    fetchAdminData();
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.setItem("manualLogout", "true");
      localStorage.removeItem("user");
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="flex h-screen w-screen focus:outline-none">
      {/* SIDEBAR */}
      <div
        className={`fixed left-0 top-0 h-screen ${isCollapsed ? "w-26" : "w-74"} bg-[#415CA0] flex flex-col text-white transition-all duration-300 z-50`}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/20">
          <img
            src="../src/assets/images/aics_logo.png"
            alt="AICS Logo"
            className="h-15 w-auto object-contain"
          />
          {!isCollapsed && (
            <div className="font-bold leading-tight text-md">
              <p>Asian Institute of</p>
              <p>Computer Studies</p>
            </div>
          )}
        </div>

        <div
          className="px-2 py-3 text-xs uppercase tracking-wide text-gray-200 cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-2 px-6 py-6">
            <Menu size={16} />
            {!isCollapsed && <span>Menu</span>}
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 pl-6 px-4 py-2 rounded-lg transition
                ${location.pathname === item.path
                  ? "bg-[#32487E] text-white"
                  : "text-white hover:bg-[#32487E] hover:text-white"
                }`}
            >
              <span className="text-white">{item.icon}</span>
              {!isCollapsed && <span className="text-white text-lg">{item.name}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? "ml-26" : "ml-74"}`}>
        {/* HEADER */}
        <div
          className="fixed top-0 h-16 bg-white shadow flex justify-between items-center px-6 z-40 transition-all duration-300"
          style={{
            left: isCollapsed ? "6.5rem" : "18.5rem",
            right: 0,
          }}
        >
          <h2 className="text-lg font-bold text-[#415CA0]">{title}</h2>

          <div className="flex items-center gap-6">
            {/* NOTIFICATIONS */}
            <div className="relative">
              <button className="p-2 rounded-full hover:bg-gray-100 transition" onClick={() => console.log("Open notifications")}>
                <Bell size={22} className="text-[#415CA0]" />
              </button>
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1">3</span>
            </div>

            {/* ADMIN PROFILE */}
            <div className="relative">
              <div
                className="flex items-center gap-4 cursor-pointer bg-white px-3 py-1 border hover:bg-[#F0F4FF] transition"
                onClick={() => setMenuOpen((o) => !o)}
              >
                {adminData?.profilePicUrl ? (
                  <img
                    src={adminData.profilePicUrl}
                    alt="Admin Profile"
                    className="h-10 w-10 rounded-full object-cover border border-[#415CA0]"
                  />
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center bg-[#415CA0] text-white font-bold rounded-full">
                    {adminData?.firstname ? adminData.firstname.charAt(0).toUpperCase() : "A"}
                  </div>
                )}

                <div className="flex flex-col leading-tight">
                  <span className="font-medium text-[#32487E]">
                    {adminData ? `${adminData.firstname} ${adminData.lastname}` : "Loading..."}
                  </span>
                  <span className="text-xs text-gray-500">Sysadmin</span>
                </div>

                <ChevronDown size={16} className="text-[#415CA0]" />
              </div>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-54 bg-white border border-gray-300 shadow-lg z-50">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full gap-2 px-4 py-2 text-red-600 hover:bg-gray-200 transition-colors"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 p-6 bg-gray-50 mt-16 overflow-y-auto">
          <div className="w-full flex justify-end mb-4">
            <div className="text-sm text-gray-500 flex gap-1">
              <span className="hover:underline text-[#415CA0] cursor-pointer">Home</span>
              {pathnames.map((name, index) => {
                const isLast = index === pathnames.length - 1;
                return (
                  <span key={name} className="flex gap-1">
                    <span>/</span>
                    <span className={`capitalize ${isLast ? "text-[#415CA0] font-medium" : "text-gray-600"}`}>
                      {name}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
