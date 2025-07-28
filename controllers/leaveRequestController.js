import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import LeavePolicy from '../models/LeavePolicy.js';
import User from '../models/User.js'; // Keep this for populating user data

// Get all leave requests (for HR/Admin)
// --- IMPROVED: Added filtering by leaveCategory ---
export const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, employee, leaveType, leaveCategory, startDate, endDate } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (employee) filter.employee = employee;
    if (leaveType) filter.leaveType = leaveType;
    if (leaveCategory) filter.leaveCategory = leaveCategory; // New filter option
    if (startDate && endDate) {
      filter.fromDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const requests = await LeaveRequest.find(filter)
      .populate('employee', 'name email role')
      .populate('actionBy', 'name email')
      .sort({ appliedAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get leave requests for current employee (No changes needed)
export const getMyLeaveRequests = async (req, res) => {
  try {
    const requests = await LeaveRequest.find({ employee: req.user.userId })
      .populate('actionBy', 'name email')
      .sort({ appliedAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new leave request
// --- HEAVILY MODIFIED ---
export const createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;
    const employeeId = req.user.userId;

    // --- START: NEW VALIDATION & LOGIC ---

    // 1. Find the policy for the requested leave type to determine its category
    const policy = await LeavePolicy.findOne({ type: leaveType });
    if (!policy) {
      return res.status(400).json({ error: `The leave type '${leaveType}' is not a valid policy.` });
    }

    // 2. Validate Dates
    const from = new Date(fromDate);
    const to = new Date(toDate);
    // Set time to start of day for accurate "past" comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (from < today) {
      return res.status(400).json({ error: 'Cannot apply for leave in the past.' });
    }
    if (to < from) {
      return res.status(400).json({ error: 'End date cannot be before start date.' });
    }

    // 3. Conditional Logic: Check balance ONLY if the policy is 'Paid'
    if (policy.category === 'Paid') {
      const days = calculateWorkingDays(from, to);
      if (days <= 0) {
        return res.status(400).json({ error: "The selected date range contains no working days." });
      }

      const balance = await LeaveBalance.findOne({
        employee: employeeId,
        leaveType: leaveType,
        year: from.getFullYear()
      });

      if (!balance) {
        // This can happen if balances weren't generated for the employee/year
        return res.status(400).json({ error: `A balance record for the paid leave type '${leaveType}' does not exist for you.` });
      }

      const availableDays = balance.total - balance.used;
      if (availableDays < days) {
        return res.status(400).json({
          error: `Insufficient leave balance for '${leaveType}'. You need ${days} days, but only have ${availableDays} available.`
        });
      }
    }

    // 4. Create the new request, storing the category from the policy
    const newRequest = new LeaveRequest({
      employee: employeeId,
      leaveType: policy.type,
      leaveCategory: policy.category, // <-- Crucial: Save the category from the policy
      fromDate: from,
      toDate: to,
      reason
    });

    // --- END: NEW VALIDATION & LOGIC ---

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// Approve/Reject leave request (for HR/Admin)
// --- HEAVILY MODIFIED ---
export const updateLeaveRequestStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const requestId = req.params.id;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status provided." });
    }

    const leaveRequest = await LeaveRequest.findById(requestId);
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ error: `This leave request has already been '${leaveRequest.status}'.` });
    }

    // --- START: NEW CONDITIONAL LOGIC ---

    // Update the leave balance ONLY if the request is 'Approved' AND its category is 'Paid'
    if (status === 'Approved' && leaveRequest.leaveCategory === 'Paid') {
      const days = calculateWorkingDays(leaveRequest.fromDate, leaveRequest.toDate);

      const balance = await LeaveBalance.findOne({
        employee: leaveRequest.employee,
        leaveType: leaveRequest.leaveType,
        year: new Date(leaveRequest.fromDate).getFullYear()
      });
      
      // Safety check: Ensure balance exists and is sufficient before deducting
      if (!balance) {
          return res.status(400).json({ error: `Cannot approve: No leave balance record found for employee for '${leaveRequest.leaveType}'.` });
      }
      if (balance.total - balance.used < days) {
          return res.status(400).json({ error: `Cannot approve: Employee has insufficient balance for '${leaveRequest.leaveType}'.` });
      }
      
      // If checks pass, update the balance
      balance.used += days;
      await balance.save();
    }
    // For 'Unpaid' leaves or 'Rejected' requests, we do nothing to the balance.

    // --- END: NEW CONDITIONAL LOGIC ---

    // Update the request itself regardless of the outcome
    leaveRequest.status = status;
    leaveRequest.remarks = remarks;
    leaveRequest.actionBy = req.user.userId;
    leaveRequest.actionAt = new Date();

    await leaveRequest.save();

    const updatedRequest = await LeaveRequest.findById(requestId)
      .populate('employee', 'name email role')
      .populate('actionBy', 'name email');

    res.json(updatedRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// Get leave request by ID (No changes needed)
export const getLeaveRequestById = async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'name email role')
      .populate('actionBy', 'name email');

    if (!request) return res.status(404).json({ error: 'Leave request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper function to calculate working days (Unchanged)
function calculateWorkingDays(startDate, endDate) {
  let days = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      days++;
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}