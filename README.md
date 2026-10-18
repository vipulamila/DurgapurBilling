# Durgapur Infra Projects Pvt. - Labour Billing & Attendance Management System

A dynamic web application replicating the labour billing calculation sheet with live calculations, attendance management, meal break flexibility, and dual-format exports (PDF and Excel).

---

## 🚀 Key Features

1. **Company Name & Billing Date Flexibility**:
   - **Update Company Name**: Click directly on the Company Name in the header, click the "✏️ Rename" button, or use the "🏢 Change Company Name" button in the configuration bar.
   - **Update Date Range & Period**:
     - Pick any **Start Date** and **End Date** using the interactive date pickers.
     - Use **Quick Presets**: `01 - 15 Oct`, `16 - 31 Oct`, `Full Oct (01-31)`, `01 - 15 Nov`.
     - Clicking **"Update Dates"** instantly updates table date columns, preserves existing attendance, pre-fills new days, re-calculates all daily totals & gross amounts, and propagates to PDF and Excel exports.

2. **Exact Mathematical Model & Calculations**:
   - `P` = 8 hours
   - `Pn` = 8 + n hours (e.g. `P4` = 12h, `P5` = 13h, `P6` = 14h, `P7` = 15h, `P3.5` = 11.5h, `P3` = 11h)
   - `A` = Absent (0 hours, ₹0)
   - `-` = Not on list (0 hours, ₹0)
   - **Basis Rate Flexibility**:
     - **12 Hr Basis**: Hourly Rate = `Rate / 12`. Daily Wage = `Hours * (Rate / 12)`
     - **8 Hr Basis**: Hourly Rate = `Rate / 8`. Daily Wage = `Hours * (Rate / 8)`
   - **Preloaded with all 45 workers from the official sheet**:
     - **Labour Subtotal**: **₹310,345.83**
     - **Contractor Service Charge (10%)**: **₹31,034.58**
     - **Grand Total**: **₹341,380.42**
     - Exact column daily sums matching down to the cent!

2. **Add & Manage Labourers**:
   - Add new workers with Name, Daily Rate, and Basis (12 Hr or 8 Hr).
   - Pre-populate initial attendance (All P4, All P, All Absent, or Off).
   - Edit existing labourer details or remove labourers.

3. **Meal & Duty Time Flexibility**:
   - Built-in support for meal deductions or custom duty hours (like Kamlesh Nonia's +30 min break recorded as 11.30h/11.5h `P3.5`).
   - Click any cell in the table to open the quick attendance popover editor.

4. **Multi-Format Export**:
   - 📄 **Download PDF (Exact Document Form)**: Generates a landscape PDF matching the layout of the billing sheet with company header, period, legend, dual-line table cells (code + ₹ amount), supervisor notes, and grand total reconciliation.
   - 📊 **Download Excel (Exact Form)**: Generates an `.xlsx` workbook mirroring the official billing sheet format.
   - 📋 **Download Excel (Payroll Register / Different Form)**: A 3-sheet payroll report:
     1. *Payroll Register*: Employee-by-employee regular hours, overtime hours, gross wages, contractor commission, and total billed cost.
     2. *Attendance Matrix*: Clean timecard grid with days present/absent.
     3. *Daily Cost Summary*: Day-by-day headcount, total hours worked, and wage expense breakdown.

5. **Local Persistence**:
   - All worker additions, modifications, supervisor notes, and settings are auto-saved to your browser's local storage.
   - Includes a "Reset to Original Data" button to revert back at any time.

---

## 🛠️ How to Run

1. Open a terminal in this directory and start the development server:
   ```bash
   npm run dev
   ```
2. Open your web browser at:
   ```
   http://localhost:5173
   ```
3. Or double-click `start.bat` on Windows!
