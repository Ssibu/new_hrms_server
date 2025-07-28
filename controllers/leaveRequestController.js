import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import LeavePolicy from '../models/LeavePolicy.js';
import User from '../models/User.js';

// Get all leave requests (for HR)
export const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, employee, leaveType, startDate, endDate } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (employee) filter.employee = employee;
    if (leaveType) filter.leaveType = leaveType;
    if (startDate && endDate) {
      filter.appliedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
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

// Get leave requests for current employee
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
export const createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;

    // Validate dates
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const today = new Date();

    if (from < today) {
      return res.status(400).json({ error: 'Cannot apply for leave in the past' });
    }

    if (to < from) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    // Calculate number of days (excluding weekends)
    const days = calculateWorkingDays(from, to);

    // Check leave balance
    const balance = await LeaveBalance.findOne({
      employee: req.user.userId,
      leaveType,
      year: new Date().getFullYear()
    });

    if (!balance) {
      return res.status(400).json({ error: 'No leave balance found for this type' });
    }

    if (balance.used + days > balance.total) {
      return res.status(400).json({ 
        error: `Insufficient leave balance. Available: ${balance.total - balance.used} days` 
      });
    }

    const newRequest = new LeaveRequest({
      employee: req.user.userId,
      leaveType,
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

// Approve/Reject leave request (HR only)
export const updateLeaveRequestStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const requestId = req.params.id;

    const leaveRequest = await LeaveRequest.findById(requestId);
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ error: 'Leave request has already been processed' });
    }

    leaveRequest.status = status;
    leaveRequest.actionBy = req.user.userId;
    leaveRequest.actionAt = new Date();
    leaveRequest.remarks = remarks;

    // If approved, update leave balance
    if (status === 'Approved') {
      const days = calculateWorkingDays(leaveRequest.fromDate, leaveRequest.toDate);
      
      let balance = await LeaveBalance.findOne({
        employee: leaveRequest.employee,
        leaveType: leaveRequest.leaveType,
        year: new Date().getFullYear()
      });

      if (!balance) {
        // Create balance if doesn't exist
        const policy = await LeavePolicy.findOne({ type: leaveRequest.leaveType });
        if (!policy) {
          return res.status(400).json({ error: 'Leave policy not found' });
        }

        balance = new LeaveBalance({
          employee: leaveRequest.employee,
          leaveType: leaveRequest.leaveType,
          total: policy.totalDaysPerYear,
          used: days,
          year: new Date().getFullYear()
        });
      } else {
        balance.used += days;
      }

      await balance.save();
    }

    await leaveRequest.save();
    res.json(leaveRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get leave request by ID
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

// Helper function to calculate working days
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