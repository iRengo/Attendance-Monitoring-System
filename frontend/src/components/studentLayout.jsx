import { useState } from "react";
import { Home, CalendarCheck, Settings, Menu, ChevronDown, CalendarDays, FileCheck, } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function StudentLayout({ title, children }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/student/dashboard", icon: <Home size={20} /> },
    { name: "Attendance", path: "/student/attendance", icon: <CalendarCheck size={20} /> },
    { name: "Current Schedules", path: "/student/schedules", icon: <CalendarDays size={20} /> },
    { name: "Data Privacy", path: "/student/dataprivacy", icon: <FileCheck size={20} /> },
    { name: "Settings", path: "/student/settings", icon: <Settings size={20} /> },
  ];

  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen ${isCollapsed ? "w-26" : "w-74"
          } bg-[#415CA0] flex flex-col text-white transition-all duration-300 z-50`}
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
              {!isCollapsed && (
                <span className="text-white text-lg">{item.name}</span>
              )}
            </Link>
          ))}
        </nav>
      </div>
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? "ml-26" : "ml-74"
          }`}
      >
        <div
          className={`fixed top-0 h-16 bg-white shadow flex justify-between items-center px-6 z-40 transition-all duration-300`}
          style={{
            left: isCollapsed ? "6.5rem" : "18.5rem",
            right: 0,
          }}
        >
          <h2 className="text-lg font-bold text-[#415CA0]">{title}</h2>


          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-full border border-[#415CA0] hover:bg-[#F0F4FF] transition">
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-[#415CA0] text-white font-bold">
                J
              </div>
              <span className="font-medium text-[#32487E]">Juan D.</span>
              <ChevronDown size={16} className="text-[#415CA0]" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-6 bg-gray-50 mt-16 overflow-y-auto">

          <div className="w-full flex justify-end mb-4">
            <div className="text-sm text-gray-500 flex gap-1">
              <span className="hover:underline text-[#415CA0] cursor-pointer">
                Home
              </span>
              {pathnames.map((name, index) => {
                const isLast = index === pathnames.length - 1;
                return (
                  <span key={name} className="flex gap-1">
                    <span>/</span>
                    <span
                      className={`capitalize ${isLast ? "text-[#415CA0] font-medium" : "text-gray-600"
                        }`}
                    >
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
