import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDocs, collection, query, where, setDoc, serverTimestamp, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

import bannerBottom from "../assets/images/banner1.png";
import aicsLogo from "../../public/aics_logo.png";
import peoples from "../assets/images/peoples.png";
import anniversary29 from "../assets/images/29y.png";
import announcementBg from "../assets/images/announcements.png";

function generateToken(len = 40) {
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map((b) => ("0" + (b % 36).toString(36)).slice(-1))
    .join("");
}

function maskEmail(email = "") {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = Math.max(1, Math.floor(local.length / 3));
  return `${local.slice(0, visible)}${"*".repeat(Math.max(1, local.length - visible - 1))}${local.slice(-1)}@${domain}`;
}

export default function ForgotPassword() {
  const [role, setRole] = useState("student");
  const [studentId, setStudentId] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [sentInfo, setSentInfo] = useState(null);
  const [devResetToken, setDevResetToken] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = data.filter((a) => {
        const now = new Date();
        const exp = new Date(a.expiration);
        return (a.target === "students" || a.target === "all") && exp >= now;
      });
      filtered.sort(
        (a, b) => new Date(b.createdAt?.toDate?.() || 0) - new Date(a.createdAt?.toDate?.() || 0)
      );
      setAnnouncements(filtered);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setFieldError("");
    setSentInfo(null);
    setDevResetToken(null);
  }, [role, studentId, teacherEmail]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldError("");
    setSentInfo(null);
    setDevResetToken(null);

    try {
      setSubmitting(true);
      const API_URL = import.meta.env.VITE_API_URL || "";

      if (role === "student") {
        if (!studentId.trim()) {
          setFieldError("Please enter your student ID.");
          setSubmitting(false);
          return;
        }

        const q = query(collection(db, "students"), where("studentId", "==", studentId.trim()));
        const snaps = await getDocs(q);
        if (snaps.empty) {
          setFieldError("Student number not found.");
          setSubmitting(false);
          return;
        }

        const snap = snaps.docs[0];
        const studentDoc = { id: snap.id, ...snap.data() };
        const personalEmail = studentDoc.personal_email || studentDoc.personalEmail || "";
        if (!personalEmail) {
          setFieldError("No personal email recorded for this student.");
          setSubmitting(false);
          return;
        }

        const token = generateToken(24);
        await setDoc(doc(db, "password_resets", token), {
          token,
          role: "student",
          userDocId: snap.id,
          studentId: studentDoc.studentId || null,
          personalEmail,
          authEmail: studentDoc.school_email || personalEmail,
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)),
          used: false,
        });

        let mailSent = false;
        if (API_URL) {
          try {
            await axios.post(`${API_URL}/password/send-reset-email`, {
              to: personalEmail,
              token,
              role: "student",
              displayName: studentDoc?.firstname ? `${studentDoc.firstname} ${studentDoc.lastname || ""}` : "",
            });
            mailSent = true;
          } catch (err) {
            console.warn("Mail send failed (dev fallback):", err);
            mailSent = false;
          }
        }

        if (mailSent) {
          setSentInfo({ method: "email", personalEmail });
          toast.success(`Confirmation sent to ${personalEmail}. Please check your email.`);
        } else {
          setSentInfo({ method: "dev", personalEmail, token });
          setDevResetToken(token);
          toast.info("Confirmation token created. Mailer not configured — use simulation link below.");
        }

      } else {
        // teacher logic
        if (!teacherEmail.trim()) {
          setFieldError("Please enter your personal email.");
          setSubmitting(false);
          return;
        }

        const q = query(collection(db, "teachers"), where("personal_email", "==", teacherEmail.trim()));
        const snaps = await getDocs(q);
        if (snaps.empty) {
          setFieldError("Email not found.");
          setSubmitting(false);
          return;
        }

        const snap = snaps.docs[0];
        const teacherDoc = { id: snap.id, ...snap.data() };
        const personalEmail = teacherDoc.personal_email || teacherDoc.personalEmail || "";
        const token = generateToken(24);
        await setDoc(doc(db, "password_resets", token), {
          token,
          role: "teacher",
          userDocId: snap.id,
          personalEmail,
          authEmail: personalEmail,
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)),
          used: false,
        });

        let mailSent = false;
        if (API_URL) {
          try {
            await axios.post(`${API_URL}/password/send-reset-email`, {
              to: personalEmail,
              token,
              role: "teacher",
              displayName: teacherDoc?.firstname ? `${teacherDoc.firstname} ${teacherDoc.lastname || ""}` : "",
            });
            mailSent = true;
          } catch (err) {
            mailSent = false;
          }
        }

        if (mailSent) {
          setSentInfo({ method: "email", personalEmail });
          toast.success(`Confirmation sent to ${personalEmail}. Please check your email.`);
        } else {
          setSentInfo({ method: "dev", personalEmail, token });
          setDevResetToken(token);
          toast.info("Confirmation token created. Mailer not configured — use simulation link below.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to process request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row overflow-x-hidden bg-[#f2f4fa] relative">
      {/* LEFT SIDE */}
      <div className="w-full md:w-[70%] flex-shrink-0 flex flex-col">
        {/* HEADER */}
        <div className="relative h-24 w-full">
          <img src={bannerBottom} alt="Top Banner" className="h-full w-full object-cover"/>
          <div className="absolute inset-0 flex items-center justify-between px-6">
            <div className="flex items-center space-x-3">
              <img src={aicsLogo} alt="AICS Logo" className="h-30 object-contain"/>
              <div className="text-white font-bold leading-tight">
                <p>Asian Institute of</p>
                <p>Computer Studies</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-20">
              <img src={anniversary29} alt="29 Years" className="h-25 object-contain"/>
              <img src={peoples} alt="People" className="h-28 object-contain"/>
            </div>
          </div>
        </div>

        {/* FORGOT PASSWORD FORM */}
        <div className="flex-1 flex items-start justify-center py-10 md:py-40">
        <div className="bg-white border border-[#5F75AF] rounded-lg p-6 w-full max-w-3xl h-[300px] shadow-lg mx-6">
            <h2 className="text-xl font-bold text-center mb-1 text-[#5F75AF]">
              Forgot Password
            </h2>
            <p className="text-center text-sm text-[#5F75AF] mb-6">
              Provide the requested identifier and we will send a confirmation link to your personal email.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setRole("student")} className={`flex-1 py-2 rounded ${role === "student" ? "bg-[#3498db] text-white" : "bg-gray-100 text-gray-700"}`}>Student</button>
                <button type="button" onClick={() => setRole("teacher")} className={`flex-1 py-2 rounded ${role === "teacher" ? "bg-[#3498db] text-white" : "bg-gray-100 text-gray-700"}`}>Teacher</button>
              </div>

              {role === "student" ? (
                <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Enter Student ID" className="w-full border border-gray-300 text-gray-700 rounded px-3 py-2"/>
              ) : (
                <input value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} type="email" placeholder="Enter Registered Personal Email" className="w-full border border-gray-300 text-gray-700 rounded px-3 py-2"/>
              )}

              {fieldError && <div className="text-sm text-rose-600">{fieldError}</div>}

              <div className="flex items-center gap-3">
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded bg-[#5F75AF] text-white disabled:opacity-50">{submitting ? "Processing..." : "Send Confirmation"}</button>
                <button type="button" onClick={() => navigate("/login")} className="px-4 py-2 rounded bg-gray-100 text-gray-700">Cancel</button>
              </div>

              {sentInfo && sentInfo.method === "email" && (
                <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded text-sm">
                  <p>A confirmation has been sent to <strong>{maskEmail(sentInfo.personalEmail)}</strong>. Please check your inbox.</p>
                </div>
              )}

              {sentInfo && sentInfo.method === "dev" && devResetToken && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <p className="mb-2">Development: mailer not configured. Reset token created for <strong>{maskEmail(sentInfo.personalEmail)}</strong>.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => navigate(`/reset-password?token=${devResetToken}`)} className="px-3 py-1 rounded bg-[#10b981] text-white text-sm">Open reset UI</button>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/reset-password?token=${devResetToken}`); toast.info("Reset link copied"); }} className="px-3 py-1 rounded bg-gray-100 text-gray-700 text-sm">Copy link</button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — Desktop announcements */}
      <div className="hidden md:block md:w-[30%]">
        <div className="relative w-full h-full overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-start p-6" style={{backgroundImage: `url(${announcementBg})`, backgroundSize: "cover", backgroundPosition: "center"}}>
            <div className="w-full h-full bg-[#00000060] border-2 border-white rounded-lg p-6 overflow-hidden">
              <h2 className="text-lg font-bold text-white mb-3">Announcements</h2>
              {announcements.length === 0 ? <p className="text-gray-200 text-sm">No announcements yet.</p> : (
                <ul className="space-y-3 text-lg text-white max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/40">
                  {announcements.map(a => (
                    <li key={a.id} className="border border-white/30 rounded-lg p-5 hover:bg-white/20 transition">
                      <h4 className="font-semibold">{a.title}</h4>
                      <p className="text-xs opacity-90 whitespace-pre-line">{a.content}</p>
                      <p className="text-[10px] text-gray-300 mt-1">Expires: {new Date(a.expiration).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
