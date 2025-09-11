import { useState } from "react";

export default function TeacherPage() {
  const [activeTab, setActiveTab] = useState("Monitor Attendance");

  const students = [
    { name: "Navarro, Christian Joseph", status: "Present", date: "08/09/25" },
    { name: "Salazar, Michelle Ann", status: "Present", date: "08/09/25" },
    { name: "Cruz, Bryan Patrick", status: "Present", date: "08/09/25" },
    { name: "Dominguez, Camille Joy", status: "Absent", date: "08/09/25" },
    { name: "Ortega, Joshua Daniel", status: "Absent", date: "08/09/25" },
    { name: "Morales, Kimberly Grace", status: "Present", date: "08/09/25" },
    { name: "Pascual, Adrian Matthew", status: "Present", date: "08/09/25" },
    { name: "Lozano, Shiela Mae", status: "Present", date: "08/09/25" },
    { name: "Villar, Francis Gabriel", status: "Present", date: "08/09/25" },
    { name: "Santos, Katherine Louise", status: "Present", date: "08/09/25" },
  ];

  return (
    <>
      <style>{`
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #E8F1F9;
        }
        .header {
          background: #247FB8;
          color: white;
          padding: 15px 20px;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header button {
          background: none;
          border: none;
          color: #ffffff;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
        }
        .layout {
          display: flex;
          height: calc(100vh - 50px); /* minus header height */
        }
        /* Sidebar */
        .sidebar {
          width: 220px;
          background: #D9D9D9;
          color: white;
          padding-top: 20px;
          display: flex;
          flex-direction: column;
        }
        .sidebar button {
          padding: 15px 20px;
          border: none;
          background: none;
          color: black;
          text-align: left;
          font-size: 15px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .sidebar button:hover {
          background: #a7a7a7ff;
          border-radius: 10px;
        }
        .sidebar .active {
          background: #247FB8;
          font-weight: bold;
          color: white;
          border-radius: 10px;
        }
        /* Main content */
        .content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }
        .card {
          background: white;
          padding: 20px;
          border-radius: 6px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .card-header h2 {
          font-size: 18px;
        }
        .card-header button {
          border: 1px solid #ccc;
          background: #f9f9f9;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 10px;
          border: 1px solid #ddd;
          text-align: left;
          font-size: 14px;
        }
        th {
          background: #f1f1f1;
        }
        .status-present {
          color: green;
          font-weight: 500;
        }
        .status-absent {
          color: red;
          font-weight: 500;
        }
        .pagination {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
          gap: 5px;
        }
        .pagination button {
          padding: 5px 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
          background: #fff;
        }
        .pagination button.active {
          background: #247FB8;
          color: #ffffff;
        }
        .pagination button:disabled {
          background: #eee;
          cursor: not-allowed;
        }
        .placeholder {
          text-align: center;
          color: #777;
          font-size: 16px;
          padding: 50px;
        }
      `}</style>

      {/* Header */}
      <div className="header">
        TEACHER
        <button>Log Out</button>
      </div>

      {/* Layout with Sidebar + Content */}
      <div className="layout">
        {/* Sidebar */}
        <div className="sidebar">
          {["Dashboard", "Update Schedule", "Monitor Attendance", "Settings"].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="content">
          {activeTab === "Monitor Attendance" ? (
            <div className="card">
              <div className="card-header">
                <h2>Monitor Student Attendance</h2>
                <button>➕ Add</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={i}>
                      <td>{s.name}</td>
                      <td className={s.status === "Present" ? "status-present" : "status-absent"}>
                        {s.status}
                      </td>
                      <td>{s.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination">
                <button disabled>Prev</button>
                <button className="active">1</button>
                <button>2</button>
                <button>3</button>
                <button>Next</button>
              </div>
            </div>
          ) : (
            <div className="card placeholder">
              <p>{activeTab} content goes here...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
