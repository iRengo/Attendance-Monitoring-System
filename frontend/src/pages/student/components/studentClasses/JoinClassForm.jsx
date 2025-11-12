import React, { useState } from "react";
import { auth, db } from "../../../../firebase";
import { doc, getDoc } from "firebase/firestore";
import Swal from "sweetalert2";

export default function JoinClassForm({ joinLink, setJoinLink, handleJoinLink }) {
  const [loading, setLoading] = useState(false);

  const validateAndJoin = async () => {
    if (!joinLink) {
      return Swal.fire({
        icon: "warning",
        title: "Class link required",
        text: "Please enter a class link!",
      });
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user)
        return Swal.fire({
          icon: "error",
          title: "Not logged in",
          text: "Please log in first!",
        });

      // Get the student document
      const studentRef = doc(db, "students", user.uid);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists())
        return Swal.fire({
          icon: "error",
          title: "Student record not found",
        });

      const studentData = studentSnap.data();
      const studentSection = studentData.section;

      // Parse the class ID from the join link
      // Example link: join-class/WzqVZYC8fuiQi17Lt6Fj
      const parts = joinLink.split("/");
      const classId = parts[1];

      if (!classId)
        return Swal.fire({
          icon: "error",
          title: "Invalid class link",
          text: "The link format is incorrect.",
        });

      // Fetch the class document to check its section
      const classRef = doc(db, "classes", classId);
      const classSnap = await getDoc(classRef);
      if (!classSnap.exists())
        return Swal.fire({
          icon: "error",
          title: "Class not found",
        });

      const classData = classSnap.data();
      const classSection = classData.section;

      if (classSection !== studentSection) {
        return Swal.fire({
          icon: "error",
          title: "Cannot join class",
          html: `Your section is <b>${studentSection}</b>, but this class is for section <b>${classSection}</b>.`,
        });
      }

      // Sections match → join the class
      handleJoinLink();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to validate class link.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 text-gray-800">
      <input
        type="text"
        placeholder="Enter class link"
        value={joinLink}
        onChange={(e) => setJoinLink(e.target.value)}
        className="border border-gray-300 rounded-lg px-4 py-2 flex-1 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
      />
      <button
        onClick={validateAndJoin}
        disabled={loading}
        className="bg-[#3498db] text-white px-4 py-2 rounded-lg hover:bg-[#2f89ca] transition disabled:opacity-50"
      >
        {loading ? "Checking..." : "Join"}
      </button>
    </div>
  );
}
