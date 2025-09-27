import StudentLayout from "../../components/studentLayout";

export default function studentDataprivacy() {
  return (
    <StudentLayout title="Data Privacy">
      <div className="shadow-md border border-[#d6d6d6] rounded-lg p-8 text-gray-700 leading-relaxed">
    
        <h2 className="text-3xl font-bold text-[#415CA0] mb-2">
          Data Privacy Notice
        </h2>
        <hr className="border-[#d6d6d6] mb-6" />

        <p className="text-lg mb-6">
          This Attendance Monitoring System is committed to protecting your
          personal information in compliance with the{" "}
          <span className="font-bold text-[#415CA0]">
            Data Privacy Act of 2012 (RA 10173)
          </span>
          . By using this system, you consent to the collection, processing, and
          storage of your personal data for academic and administrative purposes.
        </p>

        <p className="text-xl mb-3 font-bold text-[#415CA0]">
          Information We Collect:
        </p>
        <ul className="list-disc list-inside text-lg space-y-2 mb-6">
          <li><span className="font-bold">Full Name</span></li>
          <li><span className="font-bold">Student ID Number</span></li>
          <li>Course / Program, Year & Section</li>
          <li>Contact Information (Email, Mobile Number)</li>
          <li>Biometric Data (Facial Recognition / Attendance Logs)</li>
          <li>Class Schedules</li>
          <li>Attendance Records (Date, Time, Status)</li>
          <li>Device Information (for login monitoring)</li>
        </ul>

        <p className="text-xl mb-3 font-bold text-[#415CA0]">
          Purpose of Data Collection:
        </p>
        <ul className="list-disc list-inside text-lg space-y-2 mb-6">
          <li>Monitor student <span className="font-bold">attendance</span> and punctuality</li>
          <li>Generate <span className="font-bold">academic reports</span> for evaluation</li>
          <li>Ensure security and identity verification</li>
          <li>Facilitate communication between students and faculty</li>
          <li>Maintain academic records</li>
        </ul>

        <p className="text-xl mb-3 font-bold text-[#415CA0]">
          Data Protection & Storage:
        </p>
        <p className="text-lg mb-6">
          All student data are stored securely in the system database. Access is
          limited to <span className="font-bold">authorized personnel only</span> (administrators and
          faculty). Data will <span className="font-bold">never be shared</span> with third parties
          without consent, unless required by law.
        </p>

        <p className="text-xl font-bold text-[#415CA0] mb-2">
          Consent:
        </p>
        <p className="text-lg">
          By enrolling and using the Attendance Monitoring System, you
          acknowledge that you have read, understood, and agreed to this{" "}
          <span className="font-bold">Data Privacy Notice</span>.
        </p>
      </div>
    </StudentLayout>
  );
}
