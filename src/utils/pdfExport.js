import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatHours } from "./calculator.js";

export function exportToPDF({ meta, dates, calculationResult }) {
  const { labourers, dailyTotals, labourSubtotal, contractorServiceCharge, grandTotal, serviceChargeRate } = calculationResult;

  // Create PDF in landscape A4 orientation
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 30, 45);
  doc.text(meta.companyName || "DURGAPUR INFRA PROJECTS PVT.", pageWidth / 2, 28, { align: "center" });

  // Subtitle / Period
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 60, 75);
  doc.text(meta.periodText || `Labour Billing: ${dates[0]} to ${dates[dates.length - 1]}`, pageWidth / 2, 42, { align: "center" });

  // Legend / Rules line
  doc.setFontSize(7.5);
  doc.setTextColor(80, 90, 100);
  doc.text(meta.legendText || "P = 8 hours | Pn = 8+n hours | A = Absent | - = Not on list", pageWidth / 2, 54, { align: "center" });

  // Prepare table columns
  const head = [
    [
      { content: "S.No", styles: { halign: "center" } },
      { content: "Labour Name", styles: { halign: "left" } },
      { content: "Rate", styles: { halign: "right" } },
      { content: "Basis", styles: { halign: "center" } },
      ...dates.map(d => ({ content: d, styles: { halign: "center" } })),
      { content: "Total\nHrs", styles: { halign: "right" } },
      { content: "Labour\nAmount", styles: { halign: "right" } }
    ]
  ];

  // Prepare body rows
  const body = labourers.map(worker => {
    const row = [
      worker.sno,
      worker.name,
      worker.rate,
      worker.basis
    ];

    dates.forEach(d => {
      const dayData = worker.computedDays[d];
      if (!dayData || dayData.code === "-" || dayData.code === "A") {
        row.push(dayData ? dayData.code : "-");
      } else {
        // Multi-line cell: Code on top, Amount on bottom
        row.push(`${dayData.code}\n${formatCurrency(dayData.amount)}`);
      }
    });

    row.push(formatHours(worker.totalHours));
    row.push(formatCurrency(worker.labourAmount));
    return row;
  });

  // Prepare footer row (Daily Totals)
  const foot = [
    [
      { content: "Total", colSpan: 4, styles: { halign: "center", fontStyle: "bold" } },
      ...dates.map(d => ({
        content: formatCurrency(dailyTotals[d]),
        styles: { halign: "right", fontStyle: "bold", fontSize: 6 }
      })),
      { content: "", styles: { halign: "center" } },
      { content: formatCurrency(labourSubtotal), styles: { halign: "right", fontStyle: "bold", fontSize: 6.5 } }
    ]
  ];

  // Generate AutoTable
  autoTable(doc, {
    head: head,
    body: body,
    foot: foot,
    startY: 62,
    margin: { left: margin, right: margin, top: 62, bottom: 90 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 6.2,
      cellPadding: 1.5,
      lineColor: [180, 190, 205],
      lineWidth: 0.5,
      textColor: [20, 25, 35],
      valign: "middle"
    },
    headStyles: {
      fillColor: [15, 30, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
      halign: "center"
    },
    footStyles: {
      fillColor: [238, 242, 248],
      textColor: [10, 20, 40],
      fontStyle: "bold",
      lineColor: [160, 175, 195],
      lineWidth: 0.6
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "center" },  // S.No
      1: { cellWidth: 72, halign: "left" },    // Labour Name
      2: { cellWidth: 28, halign: "right" },   // Rate
      3: { cellWidth: 28, halign: "center" },  // Basis
      // dates dynamically size
      [dates.length + 4]: { cellWidth: 28, halign: "right", fontStyle: "bold" }, // Total Hrs
      [dates.length + 5]: { cellWidth: 48, halign: "right", fontStyle: "bold" }  // Labour Amount
    },
    didDrawPage: (data) => {
      // Add page number in footer
      const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFontSize(7);
      doc.setTextColor(130, 140, 150);
      doc.text(pageStr, pageWidth - margin, pageHeight - 12, { align: "right" });
    }
  });

  // Calculate position after table on the last page
  const finalY = doc.lastAutoTable.finalY + 10;
  let summaryY = finalY;

  // Check if we need to add a page or if it fits
  if (summaryY + 80 > pageHeight - 20) {
    doc.addPage();
    summaryY = 30;
  }

  // Draw Notes Box on the left
  const notesWidth = pageWidth * 0.58;
  doc.setDrawColor(200, 210, 225);
  doc.setFillColor(250, 252, 255);
  doc.roundedRect(margin, summaryY, notesWidth, 68, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(40, 50, 70);
  doc.text("Site Supervisor & Attendance Notes:", margin + 8, summaryY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(70, 80, 95);
  const splitNotes = doc.splitTextToSize(meta.note || "No specific incidents recorded during this billing tenure.", notesWidth - 16);
  doc.text(splitNotes, margin + 8, summaryY + 24);

  // Draw Financial Summary Table on the right
  const summaryBoxX = margin + notesWidth + 12;
  const summaryBoxWidth = pageWidth - margin - summaryBoxX;

  autoTable(doc, {
    body: [
      ["Labour Subtotal", `Rs. ${formatCurrency(labourSubtotal)}`],
      [`Contractor Service Charge (${serviceChargeRate}%)`, `Rs. ${formatCurrency(contractorServiceCharge)}`],
      ["Grand Total", `Rs. ${formatCurrency(grandTotal)}`]
    ],
    startY: summaryY,
    margin: { left: summaryBoxX, right: margin },
    theme: "plain",
    tableWidth: summaryBoxWidth,
    styles: {
      fontSize: 8,
      cellPadding: 4,
      font: "helvetica",
      textColor: [25, 30, 45]
    },
    columnStyles: {
      0: { fontStyle: "normal", halign: "left" },
      1: { fontStyle: "bold", halign: "right" }
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [224, 235, 255];
        data.cell.styles.textColor = [10, 30, 80];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 8.5;
      }
    }
  });

  // Save the generated PDF
  const filename = `Durgapur_Labour_Billing_${dates[0]}_to_${dates[dates.length - 1]}.pdf`;
  doc.save(filename);
}
