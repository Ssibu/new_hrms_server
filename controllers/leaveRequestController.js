import mongoose from 'mongoose';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import LeavePolicy from '../models/LeavePolicy.js';
import User from '../models/User.js'; // Ensure User model is available for population

/**
 * Helper function to calculate working days (excluding weekends).
 * This ensures frontend and backend calculations are identical.
 * @param {Date} startDate - The start date of the leave.
 * @param {Date} endDate - The end date of the leave.
 * @returns {number} The total number of working days.
 */
function calculateWorkingDays(startDate, endDate) {
  let days = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// [Admin] Get all leave requests with filtering
export const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, employee, leaveType, leaveCategory, startDate, endDate } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (employee) filter.employee = employee;
    if (leaveType) filter.leaveType = leaveType;
    if (leaveCategory) filter.leaveCategory = leaveCategory;
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

// [Employee] Get all leave requests for the currently logged-in user
export const getMyLeaveRequests = async (req, res) => {
  try {
    const requests = await LeaveRequest.find({ employee: req.user.userId })
      .populate('actionBy', 'name email') // Populate who took action
      .sort({ appliedAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// [Employee] Create a new leave request with all validations
export const createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;
    const employeeId = req.user.userId;

    // 1. Find the governing policy for the requested leave type
    const policy = await LeavePolicy.findOne({ type: leaveType });
    if (!policy) {
      return res.status(400).json({ error: `The leave type '${leaveType}' does not exist.` });
    }

    // 2. Server-side date validation
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (from < today) {
      return res.status(400).json({ error: 'Cannot apply for leave in the past.' });
    }
    if (to < from) {
      return res.status(400).json({ error: 'End date cannot be before start date.' });
    }

    // 3. Server-side calculation of leave days (Single Source of Truth)
    const daysToApply = calculateWorkingDays(from, to);
    if (daysToApply <= 0) {
      return res.status(400).json({ error: "The selected date range contains no working days." });
    }

    // --- VALIDATION A: Monthly Allowance Check ---
    if (policy.monthlyAllowance && policy.monthlyAllowance > 0) {
      const startOfMonth = new Date(from.getFullYear(), from.getMonth(), 1);
      const endOfMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59, 999);

      // Use aggregation to sum up approved leave days in the target month
      const approvedLeavesThisMonth = await LeaveRequest.aggregate([
        {
          $match: {
            employee: new mongoose.Types.ObjectId(employeeId),
            leaveType: policy.type,
            status: 'Approved',
            fromDate: { $lte: endOfMonth },
            toDate: { $gte: startOfMonth }
          }
        },
        {
          $group: { _id: null, totalDays: { $sum: '$numberOfDays' } }
        }
      ]);
      
      const usedThisMonth = approvedLeavesThisMonth.length > 0 ? approvedLeavesThisMonth[0].totalDays : 0;

      if ((usedThisMonth + daysToApply) > policy.monthlyAllowance) {
        return res.status(400).json({ 
          error: `Monthly limit for '${policy.type}' would be exceeded. You have already taken ${usedThisMonth} of your ${policy.monthlyAllowance} allowed days this month.`
        });
      }
    }

    // --- VALIDATION B: Annual Balance Check (only for 'Paid' leaves) ---
    if (policy.category === 'Paid') {
      const balance = await LeaveBalance.findOne({
        employee: employeeId,
        leaveType: leaveType,
        year: from.getFullYear()
      });

      if (!balance) {
        return res.status(400).json({ error: `A balance record for '${leaveType}' does not exist for you in ${from.getFullYear()}.` });
      }

      const availableDays = balance.total - balance.used;
      if (availableDays < daysToApply) {
        return res.status(400).json({
          error: `Insufficient annual balance for '${leaveType}'. You need ${daysToApply} days, but only have ${availableDays} available.`
        });
      }
    }

    // 4. If all validations pass, create the new request
    const newRequest = new LeaveRequest({
      employee: employeeId,
      leaveType: policy.type,
      leaveCategory: policy.category,
      numberOfDays: daysToApply, // Use the server-calculated value
      fromDate: from,
      toDate: to,
      reason
    });

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// [Admin] Approve or Reject a leave request
export const updateLeaveRequestStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const requestId = req.params.id;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'Approved' or 'Rejected'." });
    }

    const leaveRequest = await LeaveRequest.findById(requestId);
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ error: `This leave request has already been '${leaveRequest.status}'.` });
    }

    // --- Core Logic: Update balance only if a 'Paid' leave is 'Approved' ---
    if (status === 'Approved' && leaveRequest.leaveCategory === 'Paid') {
      const days = leaveRequest.numberOfDays; // Use the trusted, stored number of days

      // Find and update the corresponding leave balance
      const balanceUpdated = await LeaveBalance.findOneAndUpdate(
        {
          employee: leaveRequest.employee,
          leaveType: leaveRequest.leaveType,
          year: new Date(leaveRequest.fromDate).getFullYear()
        },
        { $inc: { used: days } }, // Safely increment the 'used' field
        { new: true } // Return the updated document
      );

      // Safety check: if balance doesn't exist or goes negative (should be prevented by create step)
      if (!balanceUpdated || balanceUpdated.used > balanceUpdated.total) {
        // Revert the increment if something is wrong
        if(balanceUpdated) await LeaveBalance.findByIdAndUpdate(balanceUpdated._id, { $inc: { used: -days } });
        return res.status(400).json({ error: `Could not approve. Employee balance for '${leaveRequest.leaveType}' is insufficient or missing.` });
      }
    }

    // Update the request itself with the action details
    leaveRequest.status = status;
    leaveRequest.remarks = remarks;
    leaveRequest.actionBy = req.user.userId;
    leaveRequest.actionAt = new Date();

    await leaveRequest.save();

    // Populate data for a rich response to the frontend
    const updatedRequest = await LeaveRequest.findById(requestId)
      .populate('employee', 'name email role')
      .populate('actionBy', 'name email');

    res.json(updatedRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get a single leave request by its ID (for viewing details)
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