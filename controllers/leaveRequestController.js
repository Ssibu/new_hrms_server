import mongoose from 'mongoose';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import LeavePolicy from '../models/LeavePolicy.js';
import User from '../models/User.js';

/**
 * Reusable helper to calculate working days (excluding weekends).
 */
function calculateWorkingDays(startDate, endDate) {
  let days = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * Reusable helper to get the total approved leave days for a user, type, and month.
 */
async function getMonthlyUsage(employeeId, leaveType, date) {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    const leavesThisMonth = await LeaveRequest.aggregate([
        {
            $match: {
                employee: new mongoose.Types.ObjectId(employeeId),
                leaveType: leaveType,
                status: 'Approved',
                fromDate: { $lte: endOfMonth },
                toDate: { $gte: startOfMonth }
            }
        },
        { $group: { _id: null, totalDays: { $sum: '$numberOfDays' } } }
    ]);
    
    return leavesThisMonth.length > 0 ? leavesThisMonth[0].totalDays : 0;
}


// --- HEAVILY REWRITTEN to handle new Yearly/Monthly policy logic ---
export const createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;
    const employeeId = req.user.userId;

    // 1. Find the governing policy for the requested leave type
    const policy = await LeavePolicy.findOne({ type: leaveType });
    if (!policy) {
      return res.status(400).json({ error: `The leave type '${leaveType}' does not exist.` });
    }

    // 2. Server-side date validation and day calculation
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (from < today) return res.status(400).json({ error: 'Cannot apply for leave in the past.' });
    if (to < from) return res.status(400).json({ error: 'End date cannot be before start date.' });

    const daysToApply = calculateWorkingDays(from, to);
    if (daysToApply <= 0) return res.status(400).json({ error: "The selected date range contains no working days." });

    // 3. Perform validation based on the policy's rules
    if (policy.category === 'Paid') {
      if (policy.renewalType === 'Yearly') {
        // --- Logic for Yearly Policies ---
        
        // A. Check Annual Balance
        const balance = await LeaveBalance.findOne({ employee: employeeId, leaveType, year: from.getFullYear() });
        if (!balance) return res.status(400).json({ error: `A balance record for '${leaveType}' does not exist for you.` });
        if ((balance.total - balance.used) < daysToApply) {
          return res.status(400).json({ error: `Insufficient annual balance for '${leaveType}'. You have ${balance.total - balance.used} days remaining.` });
        }

        // B. Check Optional Monthly Usage RESTRICTION
        if (policy.monthlyDayLimit && policy.monthlyDayLimit > 0) {
          const usedThisMonth = await getMonthlyUsage(employeeId, leaveType, from);
          if ((usedThisMonth + daysToApply) > policy.monthlyDayLimit) {
            return res.status(400).json({ error: `Monthly usage limit of ${policy.monthlyDayLimit} for '${leaveType}' would be exceeded.` });
          }
        }

      } else { // renewalType is 'Monthly'
        // --- Logic for Monthly Policies ---
        
        // A. Check the monthly GRANT amount.
        const monthlyGrant = policy.monthlyDayLimit;
        const usedThisMonth = await getMonthlyUsage(employeeId, leaveType, from);

        if ((usedThisMonth + daysToApply) > monthlyGrant) {
          return res.status(400).json({ error: `You have already used ${usedThisMonth} of your ${monthlyGrant} available '${leaveType}' days this month.` });
        }
      }
    }
    // For 'Unpaid' policies, no balance/allowance checks are needed.

    // 4. If all validations pass, create the new request
    const newRequest = new LeaveRequest({
      employee: employeeId,
      leaveType: policy.type,
      leaveCategory: policy.category,
      numberOfDays: daysToApply,
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


// --- REWRITTEN to correctly deduct balance only for Yearly policies ---
export const updateLeaveRequestStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const requestId = req.params.id;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const leaveRequest = await LeaveRequest.findById(requestId);
    if (!leaveRequest) return res.status(404).json({ error: 'Leave request not found.' });
    if (leaveRequest.status !== 'Pending') return res.status(400).json({ error: `This leave request has already been '${leaveRequest.status}'.` });
    
    // --- Core Logic: Update balance ONLY if the request is Approved, Paid, AND Yearly ---
    if (status === 'Approved' && leaveRequest.leaveCategory === 'Paid') {
      
      const policy = await LeavePolicy.findOne({ type: leaveRequest.leaveType });

      // This is the crucial check. Only deduct from balance for yearly policies.
      if (policy && policy.renewalType === 'Yearly') {
        const days = leaveRequest.numberOfDays;
        
        await LeaveBalance.updateOne(
          {
            employee: leaveRequest.employee,
            leaveType: leaveRequest.leaveType,
            year: new Date(leaveRequest.fromDate).getFullYear()
          },
          { $inc: { used: days } }
        );
      }
      // For 'Monthly' and 'Unpaid' leaves, we do nothing to the LeaveBalance collection.
    }

    // Update the request itself with the action details
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


// --- The following GET endpoints do not require changes ---

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
    const requests = await LeaveRequest.find(filter).populate('employee', 'name email role').populate('actionBy', 'name email').sort({ appliedAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMyLeaveRequests = async (req, res) => {
  try {
    const requests = await LeaveRequest.find({ employee: req.user.userId }).populate('actionBy', 'name email').sort({ appliedAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLeaveRequestById = async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id).populate('employee', 'name email role').populate('actionBy', 'name email');
    if (!request) return res.status(404).json({ error: 'Leave request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};