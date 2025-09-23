import { useState } from "react";
import { Home, CalendarCheck, Bell, Settings, Menu, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function StudentLayout({ title, children }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Define nav links
  const navItems = [
    { name: "Dashboard", path: "/student/dashboard", icon: <Home size={18} /> },
    { name: "Attendance Log", path: "/student/attendance", icon: <CalendarCheck size={18} /> },
    { name: "Notifications", path: "/student/notifications", icon: <Bell size={18} /> },
    { name: "Settings", path: "/student/settings", icon: <Settings size={18} /> },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div
        className={`h-screen ${
          isCollapsed ? "w-20" : "w-64"
        } bg-[#415CA0] flex flex-col text-white transition-all duration-300`}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/20">
          <img
            src="../src/assets/images/aics_logo.png"
            alt="AICS Logo"
            className="h-15 w-auto object-contain"
          />
          {!isCollapsed && (
            <div className="font-bold leading-tight text-sm">
              <p>Asian Institute of</p>
              <p>Computer Studies</p>
            </div>
          )}
        </div>

        <div
          className="px-2 py-3 text-xs uppercase tracking-wide text-gray-200 cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-2 px-4 py-6">
            <Menu size={16} />
            {!isCollapsed && <span>Menu</span>}
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-2 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition
                ${
                  location.pathname === item.path
                    ? "bg-[#32487E] text-white"
                    : "text-white hover:bg-[#32487E] hover:text-white"
                }`}
            >
              <span className="text-white">{item.icon}</span>
              {!isCollapsed && <span className="text-white">{item.name}</span>}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col">
   
        <div className="flex justify-between items-center px-6 py-4 bg-white shadow">
  <h2 className="text-lg font-bold text-[#415CA0]">{title}</h2>
  <div className="flex items-center gap-4">
    <span className="text-sm text-gray-500">2:55 PM / Sept 23, 2025</span>
    <div className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-full border border-[#415CA0] hover:bg-[#F0F4FF] transition">
      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-[#415CA0] text-white font-bold">
        J
      </div>
      <span className="font-medium text-[#32487E]">Juan D.</span>
      <ChevronDown size={16} className="text-[#415CA0]" />
    </div>
  </div>
</div>


        <div className="flex-1 p-6 bg-gray-50">{children}</div>
      </div>
    </div>
  );
}
