import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Payslip from '../models/Payslip.js';

// @desc    Generate (or re-generate) a payslip for an employee for a specific month
// @route   POST /api/payroll/generate
export const generatePayslip = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;

    // --- 1. Fetch Data ---
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate }
    }).populate('onLeaveRequest', 'leaveCategory'); // Populate leave data

    // --- 2. Calculate Deductions ---
    const grossSalary = employee.salary;
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const perDaySalary = grossSalary / totalDaysInMonth;
    
    let nonPayableDays = 0;
    let deductionDetails = [];

    for (const record of attendanceRecords) {
      if (record.status === 'Absent') {
        nonPayableDays += 1;
        deductionDetails.push({ date: record.date, reason: 'Absent' });
      } else if (record.status === 'Half Day') {
        nonPayableDays += 0.5;
        deductionDetails.push({ date: record.date, reason: 'Half Day' });
      } else if (record.status === 'On Leave' && record.onLeaveRequest?.leaveCategory === 'Unpaid') {
        nonPayableDays += 1;
        deductionDetails.push({ date: record.date, reason: 'Unpaid Leave' });
      }
    }

    const totalDeductions = parseFloat((nonPayableDays * perDaySalary).toFixed(2));
    const netSalary = parseFloat((grossSalary - totalDeductions).toFixed(2));

    // --- 3. Save or Update the Payslip ---
    const payslipData = {
      employee: employeeId, month, year, grossSalary, totalDeductions, netSalary, deductionDetails, generatedOn: new Date()
    };

    const savedPayslip = await Payslip.findOneAndUpdate(
      { employee: employeeId, month, year },
      payslipData,
      { new: true, upsert: true } // Creates if not found, updates if found
    ).populate('employee', 'name empId');

    res.status(200).json({ message: "Payslip generated successfully", payslip: savedPayslip });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get a specific payslip for an employee and month
// @route   GET /api/payroll/:employeeId?month=...&year=...
export const getPayslip = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;

        const payslip = await Payslip.findOne({ employee: employeeId, month, year })
            .populate('employee', 'name empId');

        if (!payslip) {
            return res.status(404).json({ message: 'Payslip for this month has not been generated yet.' });
        }
        res.json(payslip);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// @desc    Generate payslips for ALL employees for a specific month with a detailed breakdown
// @route   POST /api/payroll/generate/bulk
export const bulkGeneratePayslips = async (req, res) => {
  try {
    const { month, year } = req.body;
    const allEmployees = await Employee.find({});
    if (allEmployees.length === 0) {
      return res.status(404).json({ error: 'No employees found.' });
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    
    let generatedPayslips = [];
    let errors = [];

    for (const employee of allEmployees) {
      try {
        const attendanceRecords = await Attendance.find({
          employee: employee._id,
          date: { $gte: startDate, $lte: endDate }
        }).populate('onLeaveRequest', 'leaveCategory');

        const grossSalary = employee.salary;
        const totalDaysInMonth = new Date(year, month, 0).getDate();
        const perDaySalary = grossSalary / totalDaysInMonth;
        
        // --- NEW: Initialize counters for the breakdown ---
        let nonPayableDays = 0;
        let absentDays = 0;
        let halfDays = 0;
        let unpaidLeaveDays = 0;
        let deductionDetails = [];

        // --- MODIFIED: The loop now populates the breakdown counters ---
        attendanceRecords.forEach(record => {
          if (record.status === 'Absent') {
            nonPayableDays += 1;
            absentDays += 1;
            deductionDetails.push({ date: record.date, reason: 'Absent' });
          } else if (record.status === 'Half Day') {
            nonPayableDays += 0.5;
            halfDays += 0.5;
            deductionDetails.push({ date: record.date, reason: 'Half Day' });
          } else if (record.status === 'On Leave' && record.onLeaveRequest?.leaveCategory === 'Unpaid') {
            nonPayableDays += 1;
            unpaidLeaveDays += 1;
            deductionDetails.push({ date: record.date, reason: 'Unpaid Leave' });
          }
        });

        const totalDeductions = parseFloat((nonPayableDays * perDaySalary).toFixed(2));
        const netSalary = parseFloat((grossSalary - totalDeductions).toFixed(2));

        const payslipData = { employee: employee._id, month, year, grossSalary, totalDeductions, netSalary, deductionDetails, generatedOn: new Date() };
        const savedPayslip = await Payslip.findOneAndUpdate({ employee: employee._id, month, year }, payslipData, { new: true, upsert: true }).populate('employee', 'name empId');
        
        // --- NEW: Augment the response object with the breakdown ---
        // We convert the Mongoose document to a plain object to add the new properties
        const payslipResponse = savedPayslip.toObject();
        payslipResponse.breakdown = {
            absentDays,
            halfDays,
            unpaidLeaveDays
        };
        
        generatedPayslips.push(payslipResponse);

      } catch (employeeError) {
        errors.push({ employeeName: employee.name, error: employeeError.message });
      }
    }

    res.status(200).json({ 
      message: `Bulk generation complete. ${generatedPayslips.length} payslips generated/updated.`,
      payslips: generatedPayslips,
      errors: errors
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
