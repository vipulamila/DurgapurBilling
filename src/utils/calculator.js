/**
 * Attendance & Wage Calculation Engine
 * 
 * Rules:
 * P = 8 hours
 * Pn = 8 + n hours (e.g., P4 = 12h, P5 = 13h, P6 = 14h, P7 = 15h, P3.5 = 11.5h)
 * A = Absent (0 hours, 0 amount)
 * - = Not on list (0 hours, 0 amount)
 * Basis:
 * '12 Hr' -> Hourly Rate = Rate / 12
 * '8 Hr'  -> Hourly Rate = Rate / 8
 */

export function parseAttendanceToHours(code) {
  if (!code) return 0;
  const trimmed = String(code).trim().toUpperCase();

  if (trimmed === "A" || trimmed === "-" || trimmed === "" || trimmed === "OFF") {
    return 0;
  }

  if (trimmed === "P") {
    return 8;
  }

  if (trimmed.startsWith("P")) {
    const extraStr = trimmed.slice(1);
    const extra = parseFloat(extraStr);
    if (!isNaN(extra)) {
      return 8 + extra;
    }
    return 8;
  }

  // If user entered direct numeric hours (e.g. "12", "11.5", "8")
  const numericVal = parseFloat(trimmed);
  if (!isNaN(numericVal) && numericVal >= 0) {
    return numericVal;
  }

  return 0;
}

export function getHoursBasis(basisStr) {
  if (typeof basisStr === "number") return basisStr;
  const match = String(basisStr).match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 12; // default
}

export function computeDailyAmount(hours, rate, basisStr) {
  if (!hours || hours <= 0 || !rate || rate <= 0) return 0;
  const basisHours = getHoursBasis(basisStr);
  const hourlyRate = rate / basisHours;
  return hours * hourlyRate;
}

export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "0.00";
  return Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatHours(hrs) {
  if (hrs === undefined || hrs === null || isNaN(hrs)) return "0";
  return Number(hrs) % 1 === 0 ? String(hrs) : Number(hrs).toFixed(1);
}

/**
 * Calculates complete billing table data with summary totals
 */
export function calculateBilling(labourers, dates, serviceChargeRate = 10) {
  let labourSubtotal = 0;
  let totalOverallHours = 0;

  // Initialize date column totals
  const dailyTotals = {};
  dates.forEach(d => {
    dailyTotals[d] = 0;
  });

  const computedLabourers = labourers.map((worker, index) => {
    let workerTotalHrs = 0;
    let workerLabourAmount = 0;
    const computedDays = {};

    dates.forEach(dateKey => {
      const code = worker.attendance?.[dateKey] || "-";
      const hours = parseAttendanceToHours(code);
      const amount = computeDailyAmount(hours, worker.rate, worker.basis);

      computedDays[dateKey] = {
        code,
        hours,
        amount
      };

      workerTotalHrs += hours;
      workerLabourAmount += amount;
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + amount;
    });

    labourSubtotal += workerLabourAmount;
    totalOverallHours += workerTotalHrs;

    return {
      ...worker,
      sno: index + 1,
      computedDays,
      totalHours: workerTotalHrs,
      labourAmount: workerLabourAmount
    };
  });

  const contractorServiceCharge = (labourSubtotal * serviceChargeRate) / 100;
  const grandTotal = labourSubtotal + contractorServiceCharge;

  return {
    labourers: computedLabourers,
    dailyTotals,
    totalOverallHours,
    labourSubtotal,
    contractorServiceCharge,
    grandTotal,
    serviceChargeRate
  };
}

/**
 * Generate formatted date strings between start and end date (inclusive)
 * e.g., '2026-10-01' to '2026-10-15' => ['01-10', '02-10', ... '15-10']
 */
export function generateDateRange(startStr, endStr) {
  if (!startStr || !endStr) return [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [];
  }

  const result = [];
  const curr = new Date(start);
  while (curr <= end) {
    const day = String(curr.getDate()).padStart(2, "0");
    const month = String(curr.getMonth() + 1).padStart(2, "0");
    result.push(`${day}-${month}`);
    curr.setDate(curr.getDate() + 1);
  }
  return result;
}

export function formatDateForDisplay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
