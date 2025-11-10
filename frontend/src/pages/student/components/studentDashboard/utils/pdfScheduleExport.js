import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * exportSchedulePDF
 * @param {Object} opts
 *  - studentData
 *  - schedules []
 *  - logoImage (imported asset)
 *  - buildSectionKey (fn)
 */
export function exportSchedulePDF({ studentData, schedules, logoImage, buildSectionKey }) {
  const fullName = `${studentData.firstname || ""} ${studentData.middlename || ""} ${studentData.lastname || ""}`
    .replace(/\s+/g, " ")
    .trim();
  const gradeLevel = studentData.gradelevel || studentData.gradeLevel || "N/A";
  const section = studentData.section || "N/A";
  const sectionDisplay = buildSectionKey(gradeLevel, section) || section;

  const docPDF = new jsPDF();
  const logo = new Image();
  logo.src = logoImage;
  logo.onload = () => {
    docPDF.addImage(logo, "PNG", 170, 7, 25, 25);

    docPDF.setFont("helvetica", "bold");
    docPDF.setFontSize(18);
    docPDF.text("Asian Institute of Computer Studies", 14, 20);

    docPDF.setFontSize(14);
    docPDF.text("Student Class Schedule", 14, 30);

    docPDF.setDrawColor(66, 133, 244);
    docPDF.setLineWidth(0.7);
    docPDF.line(14, 35, 195, 35);

    docPDF.setFont("helvetica", "normal");
    docPDF.setFontSize(11);
    docPDF.text(`Name: ${fullName}`, 14, 45);
    docPDF.text(`Grade Level: ${gradeLevel}`, 14, 51);
    docPDF.text(`Section: ${sectionDisplay}`, 14, 57);

    docPDF.setFontSize(9);
    docPDF.setTextColor(100);
    docPDF.text(`Generated on: ${new Date().toLocaleString()}`, 14, 64);

    if (!schedules.length) {
      docPDF.text("No schedules available.", 14, 76);
    } else {
      const tableColumn = ["Days", "Time", "Subject", "Room", "Teacher"];
      const tableRows = schedules.map((sched) => [
        sched.days || "N/A",
        sched.time || "N/A",
        sched.subjectName || "N/A",
        sched.roomNumber || "N/A",
        sched.teacherName || "-",
      ]);

      autoTable(docPDF, {
        head: [tableColumn],
        body: tableRows,
        startY: 71,
        theme: "striped",
        headStyles: {
          fillColor: [66, 133, 244],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: {
          textColor: 50,
          halign: "center",
          cellPadding: 3,
        },
        styles: { fontSize: 10, lineColor: [220, 220, 220], lineWidth: 0.2 },
        alternateRowStyles: { fillColor: [245, 248, 255] },
      });
    }

    const pageHeight = docPDF.internal.pageSize.height;
    docPDF.setFontSize(9);
    docPDF.setTextColor(120);
    docPDF.text(
      "This report is system-generated and does not require a signature.",
      14,
      pageHeight - 10
    );

    docPDF.save(`${fullName || "My"}_Schedule.pdf`);
  };
}