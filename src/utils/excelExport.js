import * as XLSX from "xlsx";

/**
 * Format 1: Exact Billing Sheet Format matching the PDF layout
 */
export function exportExactExcel({ meta, dates, calculationResult }) {
  const { labourers, dailyTotals, labourSubtotal, contractorServiceCharge, grandTotal, serviceChargeRate } = calculationResult;

  const wb = XLSX.utils.book_new();

  // Create sheet rows
  const wsData = [];

  // Title rows
  wsData.push([meta.companyName || "DURGAPUR INFRA PROJECTS PVT."]);
  wsData.push([meta.periodText || `Labour Billing: ${dates[0]} to ${dates[dates.length - 1]}`]);
  wsData.push([meta.legendText || "P = 8 hours | Pn = 8+n hours | A = Absent | - = Not on list"]);
  wsData.push([]); // blank row

  // Table Header
  const headers = ["S.No", "Labour Name", "Rate", "Basis"];
  dates.forEach(d => headers.push(d));
  headers.push("Total Hrs");
  headers.push("Labour Amount");
  wsData.push(headers);

  // Table Body Rows
  labourers.forEach(worker => {
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
        // Formatted code with amount
        row.push(`${dayData.code} (${dayData.amount.toFixed(2)})`);
      }
    });

    row.push(worker.totalHours);
    row.push(Number(worker.labourAmount.toFixed(2)));
    wsData.push(row);
  });

  // Footer Totals Row
  const totalRow = ["Total", "", "", ""];
  dates.forEach(d => {
    totalRow.push(Number((dailyTotals[d] || 0).toFixed(2)));
  });
  totalRow.push(Number(calculationResult.totalOverallHours.toFixed(1)));
  totalRow.push(Number(labourSubtotal.toFixed(2)));
  wsData.push(totalRow);

  wsData.push([]); // blank row

  // Notes and Financial Summary
  wsData.push(["Supervisor Notes:"]);
  wsData.push([meta.note || "No incidents noted."]);
  wsData.push([]);

  wsData.push(["Financial Summary"]);
  wsData.push(["Labour Subtotal", Number(labourSubtotal.toFixed(2))]);
  wsData.push([`Contractor Service Charge (${serviceChargeRate}%)`, Number(contractorServiceCharge.toFixed(2))]);
  wsData.push(["Grand Total", Number(grandTotal.toFixed(2))]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = [
    { wch: 6 },  // S.No
    { wch: 22 }, // Labour Name
    { wch: 8 },  // Rate
    { wch: 8 },  // Basis
    ...dates.map(() => ({ wch: 15 })), // Date columns
    { wch: 10 }, // Total Hrs
    { wch: 14 }  // Labour Amount
  ];
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Labour Billing Sheet");

  const fileName = `Durgapur_Billing_ExactForm_${dates[0]}_to_${dates[dates.length - 1]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Format 2: Different Form (Comprehensive Payroll Register & Analytics)
 */
export function exportDetailedPayrollExcel({ meta, dates, calculationResult }) {
  const { labourers, dailyTotals, labourSubtotal, contractorServiceCharge, grandTotal, serviceChargeRate } = calculationResult;

  const wb = XLSX.utils.book_new();

  // 1. SHEET 1: Master Payroll Register
  const payrollRows = [];
  payrollRows.push([meta.companyName || "DURGAPUR INFRA PROJECTS PVT."]);
  payrollRows.push(["MASTER PAYROLL & LABOUR WAGE REGISTER"]);
  payrollRows.push([`Billing Tenure: ${dates[0]} to ${dates[dates.length - 1]}`]);
  payrollRows.push([]);

  // Headers
  const pHeaders = [
    "S.No",
    "Labour Name",
    "Wage Rate (₹)",
    "Rate Basis",
    "Hourly Rate (₹)",
    "Days Present",
    "Days Absent",
    "Regular Hrs (<=8h)",
    "Overtime Hrs (>8h)",
    "Total Duty Hours",
    "Gross Wages (₹)",
    `Contractor Markup (${serviceChargeRate}%) (₹)`,
    "Total Billed Cost (₹)"
  ];
  payrollRows.push(pHeaders);

  labourers.forEach(worker => {
    let daysPresent = 0;
    let daysAbsent = 0;
    let regularHours = 0;
    let overtimeHours = 0;

    dates.forEach(d => {
      const day = worker.computedDays[d];
      if (day && day.hours > 0) {
        daysPresent++;
        if (day.hours <= 8) {
          regularHours += day.hours;
        } else {
          regularHours += 8;
          overtimeHours += (day.hours - 8);
        }
      } else if (day && day.code === "A") {
        daysAbsent++;
      }
    });

    const basisHours = worker.basis.includes("8") ? 8 : 12;
    const hourlyRate = worker.rate / basisHours;
    const contractorPart = (worker.labourAmount * serviceChargeRate) / 100;
    const totalBilled = worker.labourAmount + contractorPart;

    payrollRows.push([
      worker.sno,
      worker.name,
      worker.rate,
      worker.basis,
      Number(hourlyRate.toFixed(2)),
      daysPresent,
      daysAbsent,
      regularHours,
      overtimeHours,
      worker.totalHours,
      Number(worker.labourAmount.toFixed(2)),
      Number(contractorPart.toFixed(2)),
      Number(totalBilled.toFixed(2))
    ]);
  });

  // Payroll Summary Row
  payrollRows.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    Number(calculationResult.totalOverallHours.toFixed(1)),
    Number(labourSubtotal.toFixed(2)),
    Number(contractorServiceCharge.toFixed(2)),
    Number(grandTotal.toFixed(2))
  ]);

  const wsPayroll = XLSX.utils.aoa_to_sheet(payrollRows);
  wsPayroll["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 22 }, // Name
    { wch: 12 }, // Rate
    { wch: 10 }, // Basis
    { wch: 14 }, // Hourly Rate
    { wch: 12 }, // Present
    { wch: 12 }, // Absent
    { wch: 16 }, // Reg Hrs
    { wch: 16 }, // OT Hrs
    { wch: 16 }, // Total Hrs
    { wch: 16 }, // Gross Wages
    { wch: 22 }, // Markup
    { wch: 18 }  // Total Billed
  ];
  XLSX.utils.book_append_sheet(wb, wsPayroll, "Payroll Register");

  // 2. SHEET 2: Daily Attendance Matrix (Timecard)
  const timecardRows = [];
  timecardRows.push(["DAILY TIMECARD & ATTENDANCE MATRIX"]);
  timecardRows.push([`Tenure: ${dates[0]} to ${dates[dates.length - 1]}`]);
  timecardRows.push([]);

  const tHeaders = ["S.No", "Labour Name", ...dates, "Total Days Present", "Total Hours"];
  timecardRows.push(tHeaders);

  labourers.forEach(worker => {
    let presentCount = 0;
    const row = [worker.sno, worker.name];
    dates.forEach(d => {
      const day = worker.computedDays[d];
      const code = day ? day.code : "-";
      if (day && day.hours > 0) presentCount++;
      row.push(code);
    });
    row.push(presentCount);
    row.push(worker.totalHours);
    timecardRows.push(row);
  });

  const wsTimecard = XLSX.utils.aoa_to_sheet(timecardRows);
  wsTimecard["!cols"] = [
    { wch: 6 },
    { wch: 22 },
    ...dates.map(() => ({ wch: 8 })),
    { wch: 16 },
    { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTimecard, "Attendance Matrix");

  // 3. SHEET 3: Daily Expense & Headcount Summary
  const summaryRows = [];
  summaryRows.push(["DAILY COST & HEADCOUNT BREAKDOWN"]);
  summaryRows.push([]);
  summaryRows.push(["Date", "Workers Present", "Workers Absent", "Total Hours Worked", "Daily Labour Expense (₹)"]);

  let runningCumulative = 0;
  dates.forEach(d => {
    let dayPresent = 0;
    let dayAbsent = 0;
    let dayHours = 0;

    labourers.forEach(w => {
      const day = w.computedDays[d];
      if (day && day.hours > 0) {
        dayPresent++;
        dayHours += day.hours;
      } else if (day && day.code === "A") {
        dayAbsent++;
      }
    });

    const dayExpense = dailyTotals[d] || 0;
    runningCumulative += dayExpense;

    summaryRows.push([
      d,
      dayPresent,
      dayAbsent,
      dayHours,
      Number(dayExpense.toFixed(2))
    ]);
  });

  summaryRows.push([]);
  summaryRows.push(["Labour Subtotal", "", "", calculationResult.totalOverallHours, Number(labourSubtotal.toFixed(2))]);
  summaryRows.push([`Contractor Service Charge (${serviceChargeRate}%)`, "", "", "", Number(contractorServiceCharge.toFixed(2))]);
  summaryRows.push(["Grand Total Payable", "", "", "", Number(grandTotal.toFixed(2))]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Daily Cost Summary");

  const fileName = `Durgapur_Payroll_DetailedRegister_${dates[0]}_to_${dates[dates.length - 1]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
