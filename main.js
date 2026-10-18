import { DEFAULT_META, DEFAULT_DATES, DEFAULT_LABOURERS } from "./src/data/initialData.js";
import { calculateBilling, formatCurrency, formatHours, parseAttendanceToHours, computeDailyAmount, generateDateRange, formatDateForDisplay } from "./src/utils/calculator.js";
import { exportToPDF } from "./src/utils/pdfExport.js";
import { exportExactExcel, exportDetailedPayrollExcel } from "./src/utils/excelExport.js";

// STORAGE RECOVERY WITH MULTI-KEY FALLBACK
function loadFromStorageWithFallbacks(type, fallback) {
  try {
    const keysToTry = [
      `durgapur_billing_${type}`,
      `durgapur_billing_${type}_v2`,
      `durgapur_billing_${type}_v1`
    ];
    for (const key of keysToTry) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && (!Array.isArray(fallback) || (Array.isArray(parsed) && parsed.length > 0))) {
            return parsed;
          }
        } catch (err) {
          console.warn("Parse error for key", key, err);
        }
      }
    }
  } catch (e) {
    console.warn("Storage read error:", e);
  }
  return JSON.parse(JSON.stringify(fallback));
}

// APPLICATION STATE
let state = {
  meta: loadFromStorageWithFallbacks("meta", DEFAULT_META),
  dates: loadFromStorageWithFallbacks("dates", DEFAULT_DATES),
  labourers: loadFromStorageWithFallbacks("labourers", DEFAULT_LABOURERS),
  filterQuery: "",
  filterBasis: "ALL",
  popover: {
    active: false,
    workerId: null,
    dateKey: null,
    targetCell: null
  }
};

// Ensure default startDate & endDate exist
if (!state.meta.startDate) state.meta.startDate = "2026-10-01";
if (!state.meta.endDate) state.meta.endDate = "2026-10-15";

function saveState() {
  try {
    const metaStr = JSON.stringify(state.meta);
    const datesStr = JSON.stringify(state.dates);
    const labourersStr = JSON.stringify(state.labourers);

    // Save to both canonical and legacy keys for maximum safety
    localStorage.setItem("durgapur_billing_meta", metaStr);
    localStorage.setItem("durgapur_billing_meta_v2", metaStr);
    localStorage.setItem("durgapur_billing_meta_v1", metaStr);

    localStorage.setItem("durgapur_billing_dates", datesStr);
    localStorage.setItem("durgapur_billing_dates_v2", datesStr);
    localStorage.setItem("durgapur_billing_dates_v1", datesStr);

    localStorage.setItem("durgapur_billing_labourers", labourersStr);
    localStorage.setItem("durgapur_billing_labourers_v2", labourersStr);
    localStorage.setItem("durgapur_billing_labourers_v1", labourersStr);

    if (saveStatusText) {
      saveStatusText.textContent = "Saved to Browser";
      saveStatusTag.classList.remove("saving");
    }
  } catch (e) {
    console.warn("Save storage error:", e);
    if (saveStatusText) saveStatusText.textContent = "Save Error";
  }
}

// Save before tab unload or page refresh
window.addEventListener("beforeunload", () => { saveState(); });
window.addEventListener("pagehide", () => { saveState(); });

// Compute initials for logo badge
function getCompanyInitials(name) {
  if (!name) return "DIP";
  const words = name.trim().split(/\s+/).filter(w => !["PVT.", "PVT", "LTD.", "LTD", "AND", "&"].includes(w.toUpperCase()));
  if (words.length >= 2) {
    return (words[0][0] + words[1][0] + (words[2] ? words[2][0] : "")).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

// DOM ELEMENTS
const brandLogoText = document.getElementById("brandLogoText");
const headerCompanyName = document.getElementById("headerCompanyName");
const btnEditCompanyTitle = document.getElementById("btnEditCompanyTitle");
const btnQuickRenameCompany = document.getElementById("btnQuickRenameCompany");
const headerPeriodBadge = document.getElementById("headerPeriodBadge");
const periodTextDisplay = document.getElementById("periodTextDisplay");
const legendRatesDisplay = document.getElementById("legendRatesDisplay");
const saveStatusTag = document.getElementById("saveStatusTag");
const saveStatusText = document.getElementById("saveStatusText");

// Quick Date Controller Elements
const quickStartDate = document.getElementById("quickStartDate");
const quickEndDate = document.getElementById("quickEndDate");
const btnApplyQuickDates = document.getElementById("btnApplyQuickDates");
const presetChips = document.querySelectorAll(".preset-chip");

// Toolbar Buttons
const btnManualSave = document.getElementById("btnManualSave");
const btnBackupJSON = document.getElementById("btnBackupJSON");
const btnRestoreJSON = document.getElementById("btnRestoreJSON");
const inputRestoreFile = document.getElementById("inputRestoreFile");

// KPI Elements
const kpiLabourCount = document.getElementById("kpiLabourCount");
const kpiBasisSplit = document.getElementById("kpiBasisSplit");
const kpiTotalHours = document.getElementById("kpiTotalHours");
const kpiLabourSubtotal = document.getElementById("kpiLabourSubtotal");
const kpiServiceRate = document.getElementById("kpiServiceRate");
const kpiServiceCharge = document.getElementById("kpiServiceCharge");
const kpiGrandTotal = document.getElementById("kpiGrandTotal");

// Table
const billingTable = document.getElementById("billingTable");
const tableHeaderRow = document.getElementById("tableHeaderRow");
const tableBody = document.getElementById("tableBody");
const tableFoot = document.getElementById("tableFoot");

// Search & Filter
const searchInput = document.getElementById("searchInput");
const filterBasis = document.getElementById("filterBasis");

// Bottom Summary
const supervisorNotes = document.getElementById("supervisorNotes");
const inputServiceChargeRate = document.getElementById("inputServiceChargeRate");
const summaryLabourSubtotal = document.getElementById("summaryLabourSubtotal");
const summaryServiceCharge = document.getElementById("summaryServiceCharge");
const summaryGrandTotal = document.getElementById("summaryGrandTotal");

// Modals
const modalAddLabour = document.getElementById("modalAddLabour");
const modalLabourTitle = document.getElementById("modalLabourTitle");
const formAddLabour = document.getElementById("formAddLabour");
const editLabourId = document.getElementById("editLabourId");
const inputLabourName = document.getElementById("inputLabourName");
const inputLabourRate = document.getElementById("inputLabourRate");
const selectLabourBasis = document.getElementById("selectLabourBasis");
const selectInitialAttendance = document.getElementById("selectInitialAttendance");
const btnOpenAddLabour = document.getElementById("btnOpenAddLabour");
const btnCloseAddLabourModal = document.getElementById("btnCloseAddLabourModal");
const btnCancelAddLabour = document.getElementById("btnCancelAddLabour");

// Settings Modal
const modalSettings = document.getElementById("modalSettings");
const formSettings = document.getElementById("formSettings");
const inputCompanyName = document.getElementById("inputCompanyName");
const inputSettingsStartDate = document.getElementById("inputSettingsStartDate");
const inputSettingsEndDate = document.getElementById("inputSettingsEndDate");
const inputPeriodText = document.getElementById("inputPeriodText");
const inputLegendText = document.getElementById("inputLegendText");
const inputMarkupPercent = document.getElementById("inputMarkupPercent");
const btnEditSettings = document.getElementById("btnEditSettings");
const btnCloseSettingsModal = document.getElementById("btnCloseSettingsModal");
const btnCancelSettings = document.getElementById("btnCancelSettings");

// Rename Company Modal
const modalRenameCompany = document.getElementById("modalRenameCompany");
const formRenameCompany = document.getElementById("formRenameCompany");
const inputQuickCompanyName = document.getElementById("inputQuickCompanyName");
const btnCloseRenameCompanyModal = document.getElementById("btnCloseRenameCompanyModal");
const btnCancelRenameCompany = document.getElementById("btnCancelRenameCompany");

// Cell Popover
const cellPopover = document.getElementById("cellPopover");
const popoverWorkerInfo = document.getElementById("popoverWorkerInfo");
const popoverCustomInput = document.getElementById("popoverCustomInput");
const btnApplyCustomCode = document.getElementById("btnApplyCustomCode");
const popoverPreviewHrs = document.getElementById("popoverPreviewHrs");
const popoverPreviewWage = document.getElementById("popoverPreviewWage");
const btnPopoverClose = document.getElementById("btnPopoverClose");

// Export & Action Buttons
const btnExportPDF = document.getElementById("btnExportPDF");
const btnQuickExportPDF = document.getElementById("btnQuickExportPDF");
const btnExportExactExcel = document.getElementById("btnExportExactExcel");
const btnExportDetailedExcel = document.getElementById("btnExportDetailedExcel");
const btnResetDemoData = document.getElementById("btnResetDemoData");
const btnToggleTheme = document.getElementById("btnToggleTheme");

// TOAST NOTIFICATIONS
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// BADGE STYLING HELPER
function getBadgeClass(code) {
  if (!code || code === "-") return "badge-dash";
  const upper = code.trim().toUpperCase();
  if (upper === "A") return "badge-a";
  if (upper === "P4") return "badge-p4";
  if (upper === "P5") return "badge-p5";
  if (upper === "P6") return "badge-p6";
  if (upper === "P7") return "badge-p7";
  if (upper === "P") return "badge-p";
  return "badge-p-custom";
}

// MAIN RENDER FUNCTION
function render() {
  if (saveStatusTag) saveStatusTag.classList.add("saving");

  // 1. Calculate complete billing
  const calculation = calculateBilling(state.labourers, state.dates, state.meta.serviceChargeRate);

  // 2. Update Header Info
  headerCompanyName.textContent = state.meta.companyName;
  document.title = `${state.meta.companyName} - Labour Billing`;
  if (brandLogoText) brandLogoText.textContent = getCompanyInitials(state.meta.companyName);
  periodTextDisplay.textContent = state.meta.periodText;
  legendRatesDisplay.textContent = state.meta.legendText;
  supervisorNotes.value = state.meta.note || "";
  inputServiceChargeRate.value = state.meta.serviceChargeRate;

  // Sync date input pickers
  if (quickStartDate && state.meta.startDate) quickStartDate.value = state.meta.startDate;
  if (quickEndDate && state.meta.endDate) quickEndDate.value = state.meta.endDate;

  // 3. Update KPIs
  kpiLabourCount.textContent = calculation.labourers.length;
  const count12 = calculation.labourers.filter(l => l.basis.includes("12")).length;
  const count8 = calculation.labourers.filter(l => l.basis.includes("8")).length;
  kpiBasisSplit.textContent = `${count12} (12-Hr) • ${count8} (8-Hr)`;
  kpiTotalHours.textContent = formatHours(calculation.totalOverallHours);
  kpiLabourSubtotal.textContent = formatCurrency(calculation.labourSubtotal);
  kpiServiceRate.textContent = calculation.serviceChargeRate;
  kpiServiceCharge.textContent = formatCurrency(calculation.contractorServiceCharge);
  kpiGrandTotal.textContent = formatCurrency(calculation.grandTotal);

  // 4. Update Bottom Financial Summary
  summaryLabourSubtotal.textContent = formatCurrency(calculation.labourSubtotal);
  summaryServiceCharge.textContent = formatCurrency(calculation.contractorServiceCharge);
  summaryGrandTotal.textContent = formatCurrency(calculation.grandTotal);

  // 5. Render Table Header with Dates
  tableHeaderRow.innerHTML = `
    <th class="pinned-left pinned-sno">S.No</th>
    <th class="pinned-left pinned-name col-name">Labour Name</th>
    <th class="pinned-left pinned-rate">Rate</th>
    <th class="pinned-left pinned-basis">Basis</th>
    ${state.dates.map(d => `<th>${d}</th>`).join("")}
    <th class="pinned-right pinned-total-hrs">TOTAL HRS</th>
    <th class="pinned-right pinned-labour-amt">LABOUR AMOUNT</th>
  `;

  // 6. Filter Workers
  const query = state.filterQuery.toLowerCase().trim();
  const filtered = calculation.labourers.filter(w => {
    const matchesQuery = !query || w.name.toLowerCase().includes(query) || String(w.rate).includes(query) || String(w.sno) === query;
    const matchesBasis = state.filterBasis === "ALL" || w.basis === state.filterBasis;
    return matchesQuery && matchesBasis;
  });

  // 7. Render Table Rows
  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="${state.dates.length + 6}" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No matching labourers found. Try adjusting your search or basis filter.
        </td>
      </tr>
    `;
  } else {
    tableBody.innerHTML = filtered.map(worker => {
      const is8hr = worker.basis.includes("8");
      const basisBadge = is8hr ? "basis-pill basis-8hr" : "basis-pill basis-12hr";

      const dateCells = state.dates.map(dateKey => {
        const day = worker.computedDays[dateKey];
        const code = day ? day.code : "-";
        const badgeClass = getBadgeClass(code);
        const amountDisplay = (code === "-" || code === "A") ? "" : `<span class="att-money">${formatCurrency(day.amount)}</span>`;

        return `
          <td class="att-cell" data-worker-id="${worker.id}" data-date="${dateKey}" title="Click to edit attendance">
            <div class="cell-inner">
              <span class="att-code-badge ${badgeClass}">${code}</span>
              ${amountDisplay}
            </div>
          </td>
        `;
      }).join("");

      return `
        <tr data-worker-id="${worker.id}">
          <td class="pinned-left pinned-sno">${worker.sno}</td>
          <td class="pinned-left pinned-name">
            <div class="worker-name-wrapper">
              <span>${worker.name}</span>
              <div class="worker-row-actions">
                <button class="btn-mini btn-edit-worker" data-id="${worker.id}" title="Edit Name/Rate/Basis">✏️</button>
                <button class="btn-mini danger btn-delete-worker" data-id="${worker.id}" title="Delete Worker">🗑️</button>
              </div>
            </div>
          </td>
          <td class="pinned-left pinned-rate">${worker.rate}</td>
          <td class="pinned-left pinned-basis">
            <span class="${basisBadge}">${worker.basis}</span>
          </td>
          ${dateCells}
          <td class="pinned-right pinned-total-hrs">${formatHours(worker.totalHours)}</td>
          <td class="pinned-right pinned-labour-amt">${formatCurrency(worker.labourAmount)}</td>
        </tr>
      `;
    }).join("");
  }

  // 8. Render Table Footer (Daily Totals)
  const dateTotalsHtml = state.dates.map(d => {
    return `<td class="date-total">${formatCurrency(calculation.dailyTotals[d])}</td>`;
  }).join("");

  tableFoot.innerHTML = `
    <tr>
      <td class="pinned-left" colspan="4" style="text-align: center; font-weight: 800; letter-spacing: 0.05em;">TOTAL</td>
      ${dateTotalsHtml}
      <td class="pinned-right pinned-total-hrs" style="color: #38bdf8; font-size: 0.9rem;">${formatHours(calculation.totalOverallHours)}</td>
      <td class="pinned-right pinned-labour-amt" style="color: #10b981; font-size: 0.95rem;">${formatCurrency(calculation.labourSubtotal)}</td>
    </tr>
  `;

  saveState();
}

// UPDATE BILLING DATE RANGE LOGIC
function updateBillingDates(startStr, endStr) {
  const newDates = generateDateRange(startStr, endStr);
  if (!newDates || newDates.length === 0) {
    showToast("Please select a valid date range (Start date must be <= End date)", "danger");
    return;
  }

  state.meta.startDate = startStr;
  state.meta.endDate = endStr;
  state.meta.periodText = `Labour Billing: ${formatDateForDisplay(startStr)} to ${formatDateForDisplay(endStr)}`;
  state.dates = newDates;

  // Initialize missing dates for labourers with default P4 or P
  state.labourers.forEach(worker => {
    if (!worker.attendance) worker.attendance = {};
    const defaultCode = worker.basis.includes("8") ? "P" : "P4";
    newDates.forEach(d => {
      if (worker.attendance[d] === undefined) {
        worker.attendance[d] = defaultCode;
      }
    });
  });

  render();
  saveState();
  showToast(`Updated billing dates: ${state.meta.periodText} (${newDates.length} days)`, "success");
}

// QUICK DATE PRESETS HANDLER
presetChips.forEach(chip => {
  chip.addEventListener("click", () => {
    presetChips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");

    const rangeKey = chip.dataset.range;
    if (rangeKey === "1-15-oct") {
      updateBillingDates("2026-10-01", "2026-10-15");
    } else if (rangeKey === "16-31-oct") {
      updateBillingDates("2026-10-16", "2026-10-31");
    } else if (rangeKey === "full-oct") {
      updateBillingDates("2026-10-01", "2026-10-31");
    } else if (rangeKey === "1-15-nov") {
      updateBillingDates("2026-11-01", "2026-11-15");
    }
  });
});

// Quick Apply Dates Button
btnApplyQuickDates.addEventListener("click", () => {
  const s = quickStartDate.value;
  const e = quickEndDate.value;
  if (!s || !e) {
    showToast("Please choose both Start and End dates", "danger");
    return;
  }
  presetChips.forEach(c => c.classList.remove("active"));
  updateBillingDates(s, e);
});

// RENAME COMPANY LOGIC
function openRenameCompanyModal() {
  inputQuickCompanyName.value = state.meta.companyName;
  modalRenameCompany.classList.add("active");
  inputQuickCompanyName.focus();
}

function closeRenameCompanyModal() {
  modalRenameCompany.classList.remove("active");
}

headerCompanyName.addEventListener("click", openRenameCompanyModal);
btnEditCompanyTitle.addEventListener("click", openRenameCompanyModal);
btnQuickRenameCompany.addEventListener("click", openRenameCompanyModal);
btnCloseRenameCompanyModal.addEventListener("click", closeRenameCompanyModal);
btnCancelRenameCompany.addEventListener("click", closeRenameCompanyModal);

formRenameCompany.addEventListener("submit", (e) => {
  e.preventDefault();
  const newName = inputQuickCompanyName.value.trim();
  if (!newName) {
    showToast("Company name cannot be blank", "danger");
    return;
  }
  state.meta.companyName = newName;
  closeRenameCompanyModal();
  render();
  saveState();
  showToast(`Company name updated to "${newName}"`, "success");
});

// Click on Period Badge opens date settings
headerPeriodBadge.addEventListener("click", () => {
  btnEditSettings.click();
});

// Search & Filter
searchInput.addEventListener("input", (e) => {
  state.filterQuery = e.target.value;
  render();
});

filterBasis.addEventListener("change", (e) => {
  state.filterBasis = e.target.value;
  render();
});

// Supervisor Notes input
supervisorNotes.addEventListener("input", (e) => {
  state.meta.note = e.target.value;
  saveState();
});

// Service Charge Rate Input
inputServiceChargeRate.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  if (!isNaN(val) && val >= 0) {
    state.meta.serviceChargeRate = val;
    render();
  }
});

// Manual Save Button
btnManualSave.addEventListener("click", () => {
  saveState();
  showToast("All data successfully saved to browser storage!", "success");
});

// Backup data to JSON
btnBackupJSON.addEventListener("click", () => {
  saveState();
  const backupData = {
    meta: state.meta,
    dates: state.dates,
    labourers: state.labourers,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Labour_Billing_Backup_${state.dates[0] || "data"}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Full JSON data backup downloaded!", "success");
});

// Restore data from JSON
btnRestoreJSON.addEventListener("click", () => {
  inputRestoreFile.click();
});

inputRestoreFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.labourers && Array.isArray(data.labourers)) {
        state.labourers = data.labourers;
        if (data.meta) state.meta = data.meta;
        if (data.dates) state.dates = data.dates;
        render();
        saveState();
        showToast("Successfully restored data from backup!", "success");
      } else {
        showToast("Invalid backup file format", "danger");
      }
    } catch (err) {
      showToast("Error parsing backup: " + err.message, "danger");
    }
    inputRestoreFile.value = "";
  };
  reader.readAsText(file);
});

// Open Add Labour Modal
btnOpenAddLabour.addEventListener("click", () => {
  modalLabourTitle.textContent = "Add New Labour";
  editLabourId.value = "";
  inputLabourName.value = "";
  inputLabourRate.value = "900";
  selectLabourBasis.value = "12 Hr";
  selectInitialAttendance.value = "P4";
  modalAddLabour.classList.add("active");
  inputLabourName.focus();
});

// Edit Worker Row
tableBody.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".btn-edit-worker");
  if (editBtn) {
    const id = editBtn.dataset.id;
    const worker = state.labourers.find(w => w.id === id);
    if (worker) {
      modalLabourTitle.textContent = "Edit Labour Details";
      editLabourId.value = worker.id;
      inputLabourName.value = worker.name;
      inputLabourRate.value = worker.rate;
      selectLabourBasis.value = worker.basis;
      selectInitialAttendance.parentElement.style.display = "none";
      modalAddLabour.classList.add("active");
    }
    return;
  }

  const deleteBtn = e.target.closest(".btn-delete-worker");
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    const worker = state.labourers.find(w => w.id === id);
    if (worker && confirm(`Are you sure you want to remove ${worker.name}?`)) {
      state.labourers = state.labourers.filter(w => w.id !== id);
      state.labourers.forEach((w, idx) => w.sno = idx + 1);
      render();
      saveState();
      showToast(`Removed labourer: ${worker.name}`, "warning");
    }
    return;
  }

  // Handle Cell Click for Attendance Editing
  const cell = e.target.closest(".att-cell");
  if (cell) {
    openCellPopover(cell);
  }
});

// Close Add Labour Modal
function closeAddLabourModal() {
  modalAddLabour.classList.remove("active");
  selectInitialAttendance.parentElement.style.display = "flex";
}
btnCloseAddLabourModal.addEventListener("click", closeAddLabourModal);
btnCancelAddLabour.addEventListener("click", closeAddLabourModal);

// Save Labour Form
formAddLabour.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = inputLabourName.value.trim();
  const rate = parseFloat(inputLabourRate.value);
  const basis = selectLabourBasis.value;
  const id = editLabourId.value;

  if (!name || isNaN(rate) || rate <= 0) {
    showToast("Please provide valid name and rate", "danger");
    return;
  }

  if (id) {
    // Updating existing worker
    const worker = state.labourers.find(w => w.id === id);
    if (worker) {
      worker.name = name;
      worker.rate = rate;
      worker.basis = basis;
      showToast(`Updated labourer: ${name}`, "success");
    }
  } else {
    // Adding new worker
    const initialCode = selectInitialAttendance.value || "P4";
    const initialAttendance = {};
    state.dates.forEach(d => {
      initialAttendance[d] = initialCode;
    });

    const newWorker = {
      id: "labour-" + Date.now(),
      sno: state.labourers.length + 1,
      name,
      rate,
      basis,
      attendance: initialAttendance
    };

    state.labourers.push(newWorker);
    showToast(`Added new labourer: ${name}`, "success");
  }

  closeAddLabourModal();
  render();
  saveState();
});

// SETTINGS MODAL
btnEditSettings.addEventListener("click", () => {
  inputCompanyName.value = state.meta.companyName;
  if (inputSettingsStartDate) inputSettingsStartDate.value = state.meta.startDate || "2026-10-01";
  if (inputSettingsEndDate) inputSettingsEndDate.value = state.meta.endDate || "2026-10-15";
  inputPeriodText.value = state.meta.periodText;
  inputLegendText.value = state.meta.legendText;
  inputMarkupPercent.value = state.meta.serviceChargeRate;
  modalSettings.classList.add("active");
});

function closeSettingsModal() {
  modalSettings.classList.remove("active");
}
btnCloseSettingsModal.addEventListener("click", closeSettingsModal);
btnCancelSettings.addEventListener("click", closeSettingsModal);

formSettings.addEventListener("submit", (e) => {
  e.preventDefault();
  state.meta.companyName = inputCompanyName.value.trim() || "DURGAPUR INFRA PROJECTS PVT.";
  state.meta.periodText = inputPeriodText.value.trim();
  state.meta.legendText = inputLegendText.value.trim();
  state.meta.serviceChargeRate = parseFloat(inputMarkupPercent.value) || 10;

  // Check if dates changed inside settings modal
  if (inputSettingsStartDate && inputSettingsEndDate) {
    const s = inputSettingsStartDate.value;
    const e = inputSettingsEndDate.value;
    if (s && e && (s !== state.meta.startDate || e !== state.meta.endDate)) {
      updateBillingDates(s, e);
    }
  }

  closeSettingsModal();
  render();
  saveState();
  showToast("Settings and billing configuration updated", "success");
});

// INLINE CELL POPOVER LOGIC
function openCellPopover(cell) {
  const workerId = cell.dataset.workerId;
  const dateKey = cell.dataset.date;
  const worker = state.labourers.find(w => w.id === workerId);
  if (!worker) return;

  state.popover = {
    active: true,
    workerId,
    dateKey,
    targetCell: cell
  };

  const currentCode = worker.attendance?.[dateKey] || "-";
  popoverWorkerInfo.textContent = `${worker.name} • ${dateKey}`;
  popoverCustomInput.value = currentCode;

  updatePopoverPreview(currentCode, worker);

  // Mark active preset button
  document.querySelectorAll(".quick-btn").forEach(btn => {
    if (btn.dataset.code === currentCode) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Position popover near cell
  const rect = cell.getBoundingClientRect();
  cellPopover.style.display = "flex";
  
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 6;

  if (left + 290 > window.innerWidth) {
    left = window.innerWidth - 305;
  }
  if (top + 220 > window.scrollY + window.innerHeight) {
    top = rect.top + window.scrollY - 210;
  }

  cellPopover.style.left = `${Math.max(10, left)}px`;
  cellPopover.style.top = `${Math.max(10, top)}px`;
  popoverCustomInput.focus();
}

function closeCellPopover() {
  cellPopover.style.display = "none";
  state.popover.active = false;
}

btnPopoverClose.addEventListener("click", closeCellPopover);

// Quick Preset Click
document.querySelectorAll(".quick-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const code = btn.dataset.code;
    applyAttendanceCode(code);
  });
});

// Custom Code Apply
btnApplyCustomCode.addEventListener("click", () => {
  const code = popoverCustomInput.value.trim() || "-";
  applyAttendanceCode(code);
});

popoverCustomInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const code = popoverCustomInput.value.trim() || "-";
    applyAttendanceCode(code);
  } else if (e.key === "Escape") {
    closeCellPopover();
  }
});

popoverCustomInput.addEventListener("input", (e) => {
  const worker = state.labourers.find(w => w.id === state.popover.workerId);
  if (worker) {
    updatePopoverPreview(e.target.value.trim(), worker);
  }
});

function updatePopoverPreview(code, worker) {
  const hours = parseAttendanceToHours(code);
  const amount = computeDailyAmount(hours, worker.rate, worker.basis);
  popoverPreviewHrs.textContent = formatHours(hours);
  popoverPreviewWage.textContent = `₹${formatCurrency(amount)}`;
}

function applyAttendanceCode(code) {
  const { workerId, dateKey } = state.popover;
  const worker = state.labourers.find(w => w.id === workerId);
  if (worker && dateKey) {
    if (!worker.attendance) worker.attendance = {};
    worker.attendance[dateKey] = code;
    closeCellPopover();
    render();
    saveState();
  }
}

// Close popover when clicking outside and auto-commit typed changes
document.addEventListener("click", (e) => {
  if (state.popover.active) {
    if (!cellPopover.contains(e.target) && !e.target.closest(".att-cell")) {
      const val = popoverCustomInput.value.trim();
      if (val) {
        applyAttendanceCode(val);
      } else {
        closeCellPopover();
      }
    }
  }
});

// EXPORT TO PDF
function handleExportPDF() {
  try {
    showToast("Generating official PDF billing report...", "info");
    const calculationResult = calculateBilling(state.labourers, state.dates, state.meta.serviceChargeRate);
    exportToPDF({
      meta: state.meta,
      dates: state.dates,
      calculationResult
    });
    showToast("PDF document downloaded successfully!", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to generate PDF: " + err.message, "danger");
  }
}
btnExportPDF.addEventListener("click", handleExportPDF);
btnQuickExportPDF.addEventListener("click", handleExportPDF);

// EXPORT TO EXCEL (EXACT FORM)
btnExportExactExcel.addEventListener("click", () => {
  try {
    showToast("Exporting Excel in official billing format...", "info");
    const calculationResult = calculateBilling(state.labourers, state.dates, state.meta.serviceChargeRate);
    exportExactExcel({
      meta: state.meta,
      dates: state.dates,
      calculationResult
    });
    showToast("Excel (PDF Format) downloaded successfully!", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to generate Excel: " + err.message, "danger");
  }
});

// EXPORT TO EXCEL (PAYROLL REGISTER / DIFFERENT FORM)
btnExportDetailedExcel.addEventListener("click", () => {
  try {
    showToast("Exporting multi-sheet Payroll Register Excel...", "info");
    const calculationResult = calculateBilling(state.labourers, state.dates, state.meta.serviceChargeRate);
    exportDetailedPayrollExcel({
      meta: state.meta,
      dates: state.dates,
      calculationResult
    });
    showToast("Excel (Payroll Register) downloaded successfully!", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to generate Payroll Excel: " + err.message, "danger");
  }
});

// RESET TO DEMO DATA
btnResetDemoData.addEventListener("click", () => {
  if (confirm("Reset all 45 labourers, attendance, dates, and company name to the original PDF statement?")) {
    state.meta = JSON.parse(JSON.stringify(DEFAULT_META));
    state.dates = JSON.parse(JSON.stringify(DEFAULT_DATES));
    state.labourers = JSON.parse(JSON.stringify(DEFAULT_LABOURERS));
    saveState();
    render();
    showToast("Reset to original PDF billing data", "info");
  }
});

// THEME TOGGLE
const currentTheme = localStorage.getItem("durgapur_billing_theme") || "dark";
document.documentElement.setAttribute("data-theme", currentTheme);

btnToggleTheme.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("durgapur_billing_theme", next);
  showToast(`Switched to ${next} mode`, "info");
});

// INITIALIZE
render();
