import Employee from '../models/Employee.js';
import EmployeeSalaryProfile from '../models/EmployeeSalaryProfile.js';
import EmployeeSalary from '../models/EmployeeSalary.js';
import Attendance from '../models/Attendance.js';

/**
 * A reusable helper function containing the final, correct salary calculation logic.
 * It now correctly handles pro-rata calculations based on the 'days' flag.
 */
const calculateSalaryForEmployee = async (employee, month, year) => {
  // 1. Fetch the employee's salary profile and attendance records
  const [profile, attendanceRecords] = await Promise.all([
    EmployeeSalaryProfile.findOne({ employee: employee._id }).populate('components.component'),
    Attendance.find({
      employee: employee._id,
      date: {
        $gte: new Date(Date.UTC(year, month - 1, 1)),
        $lte: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
      }
    }).populate('onLeaveRequest', 'leaveCategory')
  ]);

  if (!profile || profile.components.length === 0) {
    throw new Error("Salary profile not set up or is empty.");
  }

  // 2. Find the Basic Salary to use as the base for calculations
  let basicSalary = 0;
  const basicComponentRule = profile.components.find(c => c.component.name.toLowerCase().includes('basic') && c.calculationType === 'Fixed');
  if (basicComponentRule) {
    basicSalary = basicComponentRule.value;
  } else {
    throw new Error("Profile must contain a 'Basic Salary' component with a 'Fixed' type.");
  }

  // 3. Calculate Payable Days from attendance
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  let nonPayableDays = 0;
  attendanceRecords.forEach(record => {
    if (record.status === 'Absent' || (record.status === 'On Leave' && record.onLeaveRequest?.leaveCategory === 'Unpaid')) nonPayableDays += 1;
    else if (record.status === 'Half Day') nonPayableDays += 0.5;
  });
  const payableDays = totalDaysInMonth - nonPayableDays;

  // 4. --- NEW PRO-RATA CALCULATION LOGIC ---
  let grossEarnings = 0;
  let totalDeductions = 0;
  let calculatedComponents = [];

  profile.components.forEach(assigned => {
    // a. Calculate the component's full potential amount for the month
    const fullMonthAmount = (assigned.calculationType === 'Percentage')
      ? basicSalary * (assigned.value / 100)
      : assigned.value;

    // b. Check the 'days' flag to see if it should be pro-rated
    const finalAmount = assigned.days === true
      ? (fullMonthAmount / totalDaysInMonth) * payableDays // Pro-rated amount
      : fullMonthAmount; // Full amount

    calculatedComponents.push({
      name: assigned.component.name,
      category: assigned.component.type,
      amount: parseFloat(finalAmount.toFixed(2))
    });

    if (assigned.component.type === 'Earning') {
      grossEarnings += finalAmount;
    } else { // Deduction
      totalDeductions += finalAmount;
    }
  });

  // 5. Final Calculation
  const netSalary = grossEarnings - totalDeductions;

  // 6. Prepare the final data object for the payslip
  const payslipData = {
    employee: employee._id, month, year,
    components: calculatedComponents,
    grossEarnings: parseFloat(grossEarnings.toFixed(2)),
    totalDeductions: parseFloat(totalDeductions.toFixed(2)),
    netSalary: parseFloat(netSalary.toFixed(2)),
    status: 'Generated'
  };

  // We no longer need a separate 'breakdown' as the pro-rata logic is now built-in
  return { payslipData };
};


// --- CONTROLLERS (These just call the helper function) ---

export const generatePayslip = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });

    const { payslipData } = await calculateSalaryForEmployee(employee, month, year);
    const savedPayslip = await EmployeeSalary.findOneAndUpdate({ employee: employeeId, month, year }, payslipData, { new: true, upsert: true }).populate('employee', 'name empId');
    
    res.status(200).json({ message: "Payslip generated successfully", payslip: savedPayslip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const bulkGeneratePayslips = async (req, res) => {
  try {
    const { month, year } = req.body;
    const allEmployees = await Employee.find({});
    if (allEmployees.length === 0) return res.status(404).json({ error: 'No employees found.' });

    let generatedPayslips = [];
    let errors = [];

    for (const employee of allEmployees) {
      try {
        const { payslipData } = await calculateSalaryForEmployee(employee, month, year);
        const savedPayslip = await EmployeeSalary.findOneAndUpdate({ employee: employee._id, month, year }, payslipData, { new: true, upsert: true }).populate('employee', 'name empId');
        generatedPayslips.push(savedPayslip);
      } catch (employeeError) {
        errors.push({ employeeName: employee.name, error: employeeError.message });
      }
    }

    res.status(200).json({ 
      message: `Bulk generation complete. ${generatedPayslips.length} payslips processed.`,
      payslips: generatedPayslips,
      errors: errors
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