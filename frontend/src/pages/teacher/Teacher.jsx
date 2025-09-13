import { useState } from "react";

export default function TeacherPage() {
  const [activeTab, setActiveTab] = useState("Dashboard");

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

  // ✅ Schedule state
  const [schedules, setSchedules] = useState([
    { subject: "", day: "Monday", time: "7:30 AM – 8:30 AM" },
    { subject: "", day: "Tuesday", time: "9:15 AM – 10:15 AM" },
    { subject: "", day: "Wednesday", time: "10:45 AM – 11:45 AM" },
    { subject: "", day: "Thursday", time: "1:00 PM – 2:00 PM" },
    { subject: "", day: "Friday", time: "2:15 PM – 3:15 PM" },
    { subject: "", day: "Monday", time: "3:30 PM – 4:30 PM" },
    { subject: "", day: "Tuesday", time: "5:00 PM – 6:00 PM" },
    { subject: "", day: "Wednesday", time: "6:30 PM – 7:30 PM" },
  ]);

  const [editIndex, setEditIndex] = useState(null);
  const [tempData, setTempData] = useState({ subject: "", day: "", time: "" });

  const handleEdit = (index) => {
    setEditIndex(index);
    setTempData(schedules[index]);
  };

  const handleCancel = () => {
    setEditIndex(null);
    setTempData({ subject: "", day: "", time: "" });
  };

  const handleSave = (index) => {
    const updatedSchedules = [...schedules];
    updatedSchedules[index] = tempData;
    setSchedules(updatedSchedules);
    setEditIndex(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTempData({ ...tempData, [name]: value });
  };

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
          height: calc(100vh - 50px);
        }
        /* Sidebar */
        .sidebar {
          width: 220px;
          background: #D9D9D9;
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
          flex-wrap: wrap;
          gap: 10px;
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
        .table-container {
          width: 100%;
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }
        th, td {
          padding: 10px;
          border: 1px solid #ddd;
          text-align: left;
          font-size: 14px;
          white-space: nowrap;
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
        .edit-btn {
          background: green;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        .save-btn {
          background: #247FB8;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 5px;
        }
        .cancel-btn {
          background: #ccc;
          color: black;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        input, select {
        padding: 5px;
        font-size: 14px;
        width: 100%;
        box-sizing: border-box; /* ✅ Prevents overlap */
        border: 1px solid #ccc; /* Keep normal border */
        border-radius: 4px;
      }

      input:focus, select:focus {
        border: 1px solid #247FB8; /* Highlight on focus */
        outline: none;
      }



        /* ✅ Responsive Design */
        @media (max-width: 992px) {
          .layout {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            flex-direction: row;
            overflow-x: auto;
          }
          .sidebar button {
            flex: 1;
            text-align: center;
          }
        }
        @media (max-width: 600px) {
          .header {
            background: #247FB8;
            color: white;
            padding: 15px 20px;
            font-weight: bold;
            display: flex;
            justify-content: space-between; /* ✅ Always keep Log Out on the right */
            align-items: center;
            flex-wrap: nowrap; /* Prevent stacking */
          }

          @media (max-width: 600px) {
            .header {
              flex-direction: row;
              justify-content: space-between;
            }
          }
          .card-header {
            flex-direction: column;
            align-items: flex-start;
          }
          table {
            font-size: 12px;
          }
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
              <div className="table-container">
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
              </div>
              <div className="pagination">
                <button disabled>Prev</button>
                <button className="active">1</button>
                <button>2</button>
                <button>3</button>
                <button>Next</button>
              </div>
            </div>
          ) : activeTab === "Update Schedule" ? (
            <div className="card">
              <div className="card-header">
                <h2>Update Class Schedule</h2>
                <button>Add New Schedule</button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule, i) => (
                      <tr key={i}>
                        {editIndex === i ? (
                          <>
                            <td>
                              <input
                                type="text"
                                name="subject"
                                value={tempData.subject}
                                onChange={handleChange}
                                placeholder="Subject"
                              />
                            </td>
                            <td>
                              <select
                                name="day"
                                value={tempData.day}
                                onChange={handleChange}
                              >
                                <option>Monday</option>
                                <option>Tuesday</option>
                                <option>Wednesday</option>
                                <option>Thursday</option>
                                <option>Friday</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="text"
                                name="time"
                                value={tempData.time}
                                onChange={handleChange}
                                placeholder="Time"
                              />
                            </td>
                            <td>
                              <button className="save-btn" onClick={() => handleSave(i)}>Save</button>
                              <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{schedule.subject}</td>
                            <td>{schedule.day}</td>
                            <td>{schedule.time}</td>
                            <td>
                              <button className="edit-btn" onClick={() => handleEdit(i)}>Edit</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
