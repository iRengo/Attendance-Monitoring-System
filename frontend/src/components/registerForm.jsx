import { db, storage } from "../firebase";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InputField from "./InputField";
import { toast } from "react-toastify";
import guideImg from "../assets/images/face-guide.png";

export default function RegisterForm({ onClose }) {
    const [role, setRole] = useState("");
    const [tEmail, setTEmail] = useState("");
    const [sEmail, setSEmail] = useState("");
    const [agreement, setAgreement] = useState(false);
    const [showGuide, setShowGuide] = useState({ visible: false, type: "" });
    const fileInputRef = useRef(null);

    const handleFileGuide = (type) => {
        setShowGuide({ visible: true, type });
    };

    const handleProceedUpload = () => {
        setShowGuide({ visible: false, type: "" });
        setTimeout(() => fileInputRef.current?.click(), 200);
    };
    const navigate = useNavigate();
    const [tFirstName, setTFirstName] = useState("");
    const [tLastName, setTLastName] = useState("");
    const [tContact, setTContact] = useState("");
    const [tFaceFile, setTFaceFile] = useState(null);
    const [tFacePreview, setTFacePreview] = useState(null);

    const [sStudentNumber, setSStudentNumber] = useState("");
    const [sCourse, setSCourse] = useState("");
    const [sYear, setSYear] = useState("");
    const [sSection, setSSection] = useState("");
    const [sFirstName, setSFirstName] = useState("");
    const [sLastName, setSLastName] = useState("");
    const [sFacePreview, setSFacePreview] = useState(null);
    const [sGuardName, setSGuardName] = useState("");
    const [sGuardContact, setSGuardContact] = useState("");
    useEffect(() => {
        return () => {
            if (tFacePreview) URL.revokeObjectURL(tFacePreview);
            if (sFacePreview) URL.revokeObjectURL(sFacePreview);
        };
    }, [tFacePreview, sFacePreview]);

    const validateAndCollect = () => {
        if (!role) {
            toast.error("Please choose a role.");
            return null;
        }
        if (!agreement) {
            toast.error("You must agree to the certification statement.");
            return null;
        }

        if (role === "teacher") {
            if (!tFirstName || !tLastName || !tContact) {
                toast.error("Please fill all required teacher fields.");
                return null;
            }

            const fd = new FormData();
            fd.append("role", "teacher");
            fd.append("firstName", tFirstName);
            fd.append("lastName", tLastName);
            fd.append("contact", tContact);
            return fd;
        }

        if (role === "student") {
            if (
                !sStudentNumber ||
                !sCourse ||
                !sYear ||
                !sSection ||
                !sFirstName ||
                !sLastName ||
                !sGuardName ||
                !sGuardContact
            ) {
                toast.error("Please fill all required student fields.");
                return null;
            }

            const fd = new FormData();
            fd.append("role", "student");
            fd.append("studentNumber", sStudentNumber);
            fd.append("course", sCourse);
            fd.append("year", sYear);
            fd.append("section", sSection);
            fd.append("firstName", sFirstName);
            fd.append("lastName", sLastName);
            fd.append("guardianName", sGuardName);
            fd.append("guardianContact", sGuardContact);
            return fd;
        }

        return null;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = validateAndCollect();
        if (!payload) return;

        try {
            const role = payload.get("role");
            const data = {};

            // Fill common fields
            data.role = role;
            data.status = "pending";
            data.createdAt = serverTimestamp();
            data.faceImage = "N/A";

            if (role === "teacher") {
                data.email = tEmail;
                data.firstName = payload.get("firstName");
                data.lastName = payload.get("lastName");
                data.contact = payload.get("contact");
            } else if (role === "student") {
                data.email = sEmail;
                data.studentNumber = payload.get("studentNumber");
                data.course = payload.get("course");
                data.year = payload.get("year");
                data.section = payload.get("section");
                data.firstName = payload.get("firstName");
                data.lastName = payload.get("lastName");
                data.guardianName = payload.get("guardianName");
                data.guardianContact = payload.get("guardianContact");
            }

            const collectionName = role === "student" ? "students" : "teachers";
            await addDoc(collection(db, collectionName), data);

            toast.success("Successfully registered! Wait for verification. You will receive your login credentials soon.");
            navigate("/login");
        } catch (error) {
            console.error("Error saving data:", error);
            toast.error("Registration failed. Try again later.");
        }
    };
    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4 text-[#5F75AF]">
                <div>
                    <label className="block mb-1 font-semibold">Are you a:</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full border border-[#5F75AF] rounded px-3 py-2 focus:outline-none"
                        required
                    >
                        <option value="">Select role</option>
                        <option value="teacher">Teacher</option>
                        <option value="student">Student</option>
                    </select>
                </div>
                <AnimatePresence mode="wait">
                    {role === "teacher" && (
                        <motion.div
                            key="teacher-form"
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Email"
                                    type="email"
                                    value={tEmail}
                                    onChange={(e) => setTEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                                <InputField
                                    label="First Name"
                                    type="text"
                                    value={tFirstName}
                                    onChange={(e) => setTFirstName(e.target.value)}
                                    placeholder="Enter first name"
                                    required
                                />
                                <InputField
                                    label="Last Name"
                                    type="text"
                                    value={tLastName}
                                    onChange={(e) => setTLastName(e.target.value)}
                                    placeholder="Enter last name"
                                    required
                                />
                                <InputField
                                    label="Contact Number"
                                    type="tel"
                                    value={tContact}
                                    onChange={(e) => setTContact(e.target.value)}
                                    placeholder="Enter contact number"
                                    required
                                />
                                {/*<div>
                                    <label className="block mb-1 font-semibold">Face Image</label>
                                    <button
                                        type="button"
                                        onClick={() => handleFileGuide("teacher")}
                                        className="w-full border border-[#5F75AF] rounded px-3 py-2 bg-white hover:bg-[#f1f1f1]"
                                    >
                                        Upload Face Image
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFaceChange}
                                        className="hidden"
                                    /> 
                                    {tFacePreview && (
                                        <img
                                            src={tFacePreview}
                                            alt="preview"
                                            className="mt-2 h-24 object-cover rounded"
                                        />
                                    )}
                                </div>
                                */}
                            </div>
                            <div className="flex items-start space-x-2 mt-4">
                                <input
                                    type="checkbox"
                                    id="teacher-agree"
                                    checked={agreement}
                                    onChange={(e) => setAgreement(e.target.checked)}
                                    required
                                    className="mt-1"
                                />
                                <label htmlFor="teacher-agree" className="text-sm">
                                    I hereby certify that all the information I have provided in
                                    this form is true and correct to the best of my knowledge.
                                </label>
                            </div>
                        </motion.div>
                    )}

                    {role === "student" && (
                        <motion.div
                            key="student-form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Student Number"
                                    type="text"
                                    value={sStudentNumber}
                                    onChange={(e) => setSStudentNumber(e.target.value)}
                                    placeholder="Enter student number"
                                    required
                                />
                                <InputField
                                    label="Email"
                                    type="email"
                                    value={sEmail}
                                    onChange={(e) => setSEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />

                                <div>
                                    <label className="block mb-1 font-semibold">Course</label>
                                    <select
                                        value={sCourse}
                                        onChange={(e) => setSCourse(e.target.value)}
                                        className="w-full border border-[#5F75AF] rounded px-3 py-2 focus:outline-none"
                                        required
                                    >
                                        <option value="">Select Strand</option>
                                        <option value="ICT">ICT</option>
                                        <option value="GAS">GAS</option>
                                        <option value="HUMSS">HUMSS</option>
                                        <option value="ABM">ABM</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block mb-1 font-semibold">
                                        Year Standing
                                    </label>
                                    <select
                                        value={sYear}
                                        onChange={(e) => setSYear(e.target.value)}
                                        className="w-full border border-[#5F75AF] rounded px-3 py-2 focus:outline-none"
                                        required
                                    >
                                        <option value="">Select year</option>
                                        <option value="11">Grade 11</option>
                                        <option value="12">Grade 12</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block mb-1 font-semibold">Section</label>
                                    <select
                                        value={sSection}
                                        onChange={(e) => setSSection(e.target.value)}
                                        className="w-full border border-[#5F75AF] rounded px-3 py-2 focus:outline-none"
                                        required
                                    >
                                        <option value="">Select section</option>
                                        <option value="A">Section A</option>
                                        <option value="B">Section B</option>
                                        <option value="C">Section C</option>
                                        <option value="D">Section D</option>
                                    </select>
                                </div>

                                <InputField
                                    label="First Name"
                                    type="text"
                                    value={sFirstName}
                                    onChange={(e) => setSFirstName(e.target.value)}
                                    placeholder="Enter first name"
                                    required
                                />
                                <InputField
                                    label="Last Name"
                                    type="text"
                                    value={sLastName}
                                    onChange={(e) => setSLastName(e.target.value)}
                                    placeholder="Enter last name"
                                    required
                                />
                                {/* <div>
                                    <label className="block mb-1 font-semibold">Face Image</label>
                                    <button
                                        type="button"
                                        onClick={() => handleFileGuide("student")}
                                        className="w-full border border-[#5F75AF] rounded px-3 py-2 bg-white hover:bg-[#f1f1f1]"
                                    >
                                        Upload Face Image
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFaceChange}
                                        className="hidden"
                                    />
                                    {sFacePreview && (
                                        <img
                                            src={sFacePreview}
                                            alt="preview"
                                            className="mt-2 h-24 object-cover rounded"
                                        />
                                    )}
                                </div>
                                */}

                                <InputField
                                    label="Guardian's Name"
                                    type="text"
                                    value={sGuardName}
                                    onChange={(e) => setSGuardName(e.target.value)}
                                    placeholder="Enter guardian's name"
                                    required
                                />
                                <InputField
                                    label="Guardian's Contact"
                                    type="tel"
                                    value={sGuardContact}
                                    onChange={(e) => setSGuardContact(e.target.value)}
                                    placeholder="Enter guardian's contact"
                                    required
                                />
                            </div>

                            <div className="flex items-start space-x-2 mt-4">
                                <input
                                    type="checkbox"
                                    id="student-agree"
                                    checked={agreement}
                                    onChange={(e) => setAgreement(e.target.checked)}
                                    required
                                    className="mt-1"
                                />
                                <label htmlFor="student-agree" className="text-sm">
                                    I hereby certify that all the information I have provided in
                                    this form is true and correct to the best of my knowledge.
                                </label>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {role && (
                    <>
                        <motion.button
                            key="submit-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            type="submit"
                            className="w-full py-2 rounded text-white bg-[#5F75AF] hover:bg-[#4a5f93] mt-4"
                        >
                            Register
                        </motion.button>

                        {/* Back to Login link */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-center"
                        >
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-[#5F75AF] text-sm"
                            >
                                ← Back to Login
                            </button>
                        </motion.div>
                    </>
                )}
            </form>

            <AnimatePresence>
                {showGuide.visible && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-xl shadow-xl p-8 w-[800px] max-h-[90vh] overflow-y-auto text-center"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                        >
                            <h2 className="text-xl font-semibold text-[#5F75AF] mb-4">
                                Face Image Upload Guide
                            </h2>
                            <img
                                src={guideImg}
                                alt="guide"
                                className="w-full h-120 object-contain mb-4"
                            />
                            <p className="text-sm text-gray-600 mb-6">
                                Please ensure your face is centered, well-lit, and clearly visible.
                                Avoid hats, sunglasses, or filters.
                            </p>
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => setShowGuide({ visible: false, type: "" })}
                                    className="px-5 py-2 rounded bg-gray-200 text-[#4a5f93] hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleProceedUpload}
                                    className="px-5 py-2 rounded bg-[#5F75AF] text-white hover:bg-[#4a5f93]"
                                >
                                    Proceed
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
