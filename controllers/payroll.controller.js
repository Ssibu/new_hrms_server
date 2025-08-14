import Employee from '../models/Employee.js';
import EmployeeSalaryProfile from '../models/EmployeeSalaryProfile.js';
import EmployeeSalary from '../models/EmployeeSalary.js';
import Attendance from '../models/Attendance.js';

/**
 * FINALIZED & BUG-FIXED: This is the definitive salary calculation helper function.
 * It now correctly handles the 'Holiday' status and all other attendance scenarios.
 */
const calculateSalaryForEmployee = async (employee, month, year) => {
  // 1. Fetch employee's salary profile and attendance records for the month
  const [profile, attendanceRecords] = await Promise.all([
    EmployeeSalaryProfile.findOne({ employee: employee._id })
      .populate('components.component')
      .populate('components.percentageOf'),
    Attendance.find({
      employee: employee._id,
      date: {
        $gte: new Date(Date.UTC(year, month - 1, 1)),
        $lte: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
      }
    }).populate('onLeaveRequest', 'leaveCategory')
  ]);

  if (!profile || profile.components.length === 0) {
    throw new Error(`Salary profile not set up for ${employee.name}.`);
  }

  // 2. --- REWRITTEN & CORRECTED: Detailed Attendance Calculation ---
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  let presentDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let halfDays = 0;
  let holidayDays = 0; // Explicitly count holidays

  // Process every single recorded day
  attendanceRecords.forEach(record => {
    switch (record.status) {
      case 'Present':
        presentDays++;
        break;
      case 'Absent':
        absentDays++;
        break;
      case 'On Leave':
        if (record.onLeaveRequest?.leaveCategory === 'Unpaid') {
          unpaidLeaveDays++;
        } else {
          paidLeaveDays++;
        }
        break;
      case 'Half Day':
        halfDays++;
        presentDays += 0.5; // A half day is half a day present
        break;
      // THE FIX: Correctly process 'Holiday' status as a payable day
      case 'Holiday':
        holidayDays++;
        break;
      default:
        break;
    }
  });

  // Assume unrecorded days are also paid (e.g., weekends not in the DB)
  const unrecordedDays = totalDaysInMonth - attendanceRecords.length;

  // The final, simple LOP calculation
  const lopDays = absentDays + unpaidLeaveDays + (halfDays * 0.5);
  const payableDays = totalDaysInMonth - lopDays;
  
  // This object is sent to the frontend for the detailed table view
  const attendanceSummary = {
    totalDaysInMonth,
    presentDays: presentDays + unrecordedDays, // Show total days present including weekends/unrecorded
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays,
    halfDays,
    lopDays
  };

  // 3. --- Dynamic Calculation Engine (This part was already correct) ---
  const componentAmountMap = new Map();
  profile.components.forEach(assigned => {
    if (assigned.calculationType === 'Fixed') {
      const fullMonthAmount = assigned.value;
      const finalAmount = assigned.component.isProRata ? (fullMonthAmount / totalDaysInMonth) * payableDays : fullMonthAmount;
      componentAmountMap.set(assigned.component._id.toString(), finalAmount);
    }
  });
  let remainingComponents = profile.components.filter(c => c.calculationType === 'Percentage');
  let iterations = 0;
  while (remainingComponents.length > 0 && iterations < profile.components.length) {
    let resolvedInPass = [];
    remainingComponents.forEach(assigned => {
      const baseIds = assigned.percentageOf.map(c => c._id.toString());
      const depsMet = baseIds.every(id => componentAmountMap.has(id));
      if (depsMet) {
        const baseAmount = baseIds.reduce((sum, id) => sum + componentAmountMap.get(id), 0);
        const fullMonthAmount = baseAmount * (assigned.value / 100);
        const finalAmount = assigned.component.isProRata ? (fullMonthAmount / totalDaysInMonth) * payableDays : fullMonthAmount;
        componentAmountMap.set(assigned.component._id.toString(), finalAmount);
        resolvedInPass.push(assigned.component._id);
      }
    });
    if (resolvedInPass.length === 0) throw new Error(`Circular dependency detected for ${employee.name}.`);
    remainingComponents = remainingComponents.filter(c => !resolvedInPass.includes(c.component._id));
    iterations++;
  }

  // 4. Final Aggregation
  let grossEarnings = 0;
  let totalDeductions = 0;
  let calculatedComponents = [];

  profile.components.forEach(assigned => {
    const finalAmount = parseFloat(componentAmountMap.get(assigned.component._id.toString()).toFixed(2));
    const componentData = { name: assigned.component.name, category: assigned.component.type, amount: finalAmount };
    calculatedComponents.push(componentData);
    if (componentData.category === 'Earning') grossEarnings += finalAmount;
    else totalDeductions += finalAmount;
  });
  
  // Add a visible LWP line item for clarity on the payslip (for display only)
  const basicComponentRule = profile.components.find(c => c.component.name.toLowerCase().includes('basic'));
  if (lopDays > 0 && basicComponentRule) {
      const perDayRate = basicComponentRule.value / totalDaysInMonth;
      const lossOfPayAmount = parseFloat((perDayRate * lopDays).toFixed(2));
      if (lossOfPayAmount > 0) {
        calculatedComponents.push({ name: 'Loss of Pay (LWP)', category: 'Deduction', amount: lossOfPayAmount });
      }
  }

  const netSalary = grossEarnings - totalDeductions;

  // 5. Prepare final data object to be saved
  const payslipData = {
    employee: employee._id, month, year,
    components: calculatedComponents,
    grossEarnings: parseFloat(grossEarnings.toFixed(2)),
    totalDeductions: parseFloat(totalDeductions.toFixed(2)),
    netSalary: parseFloat(netSalary.toFixed(2)),
    status: 'Generated'
  };

  return { payslipData, attendanceSummary };
};

// --- CONTROLLERS (No changes needed in these outer functions) ---

export const generatePayslip = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });
    const { payslipData, attendanceSummary } = await calculateSalaryForEmployee(employee, Number(month), Number(year));
    const savedPayslip = await EmployeeSalary.findOneAndUpdate({ employee: employeeId, month, year }, payslipData, { new: true, upsert: true }).populate('employee', 'name empId');
    res.status(200).json({ message: "Payslip generated successfully", result: { payslip: savedPayslip, attendanceSummary } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const bulkGeneratePayslips = async (req, res) => {
  try {
    const { month, year } = req.body;
    const allEmployees = await Employee.find({});
    if (allEmployees.length === 0) return res.status(404).json({ error: 'No employees found.' });
    let results = [];
    let errors = [];
    for (const employee of allEmployees) {
      try {
        const { payslipData, attendanceSummary } = await calculateSalaryForEmployee(employee, Number(month), Number(year));
        const savedPayslip = await EmployeeSalary.findOneAndUpdate({ employee: employee._id, month, year }, payslipData, { new: true, upsert: true }).populate('employee', 'name empId');
        results.push({ payslip: savedPayslip, attendanceSummary });
      } catch (employeeError) {
        errors.push({ employeeName: employee.name, error: employeeError.message });
      }
    }
    res.status(200).json({ 
      message: `Bulk generation complete. ${results.length} payslips processed.`,
      results,
      errors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPayslip = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;
        const payslip = await EmployeeSalary.findOne({ employee: employeeId, month, year }).populate('employee', 'name empId');
        if (!payslip) return res.status(404).json({ message: 'Payslip for this month has not been generated yet.' });
        res.json(payslip);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};