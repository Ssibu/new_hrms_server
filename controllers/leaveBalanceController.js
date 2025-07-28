import LeaveBalance from '../models/LeaveBalance.js';
import LeavePolicy from '../models/LeavePolicy.js';
import User from '../models/User.js';

// Get leave balance for current employee
export const getMyLeaveBalance = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const balances = await LeaveBalance.find({
      employee: req.user.userId,
      year: year
    });

    // If no balances exist, create them ONLY from PAID policies
    if (balances.length === 0) {
      // --- MODIFIED ---
      // Fetch only policies that are 'Paid'
      const paidPolicies = await LeavePolicy.find({ category: 'Paid' });
      if (paidPolicies.length === 0) {
        // If there are no paid policies, return an empty array.
        return res.json([]);
      }

      const newBalances = paidPolicies.map(policy => ({
        employee: req.user.userId,
        leaveType: policy.type,
        total: policy.totalDaysPerYear, // This is now safe to access
        used: 0,
        year: year
      }));

      await LeaveBalance.insertMany(newBalances);
      const createdBalances = await LeaveBalance.find({ employee: req.user.userId, year: year });
      return res.json(createdBalances);
    }

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get leave balance for a specific employee (for HR/Admin)
export const getEmployeeLeaveBalance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const year = new Date().getFullYear();
    const balances = await LeaveBalance.find({
      employee: employeeId,
      year: year
    });

    if (balances.length === 0) {
      // --- MODIFIED ---
      // Create balances ONLY from PAID policies
      const paidPolicies = await LeavePolicy.find({ category: 'Paid' });
      if (paidPolicies.length === 0) {
        return res.json([]);
      }

      const newBalances = paidPolicies.map(policy => ({
        employee: employeeId,
        leaveType: policy.type,
        total: policy.totalDaysPerYear,
        used: 0,
        year: year
      }));

      await LeaveBalance.insertMany(newBalances);
      const createdBalances = await LeaveBalance.find({ employee: employeeId, year: year });
      return res.json(createdBalances);
    }

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Get all employees' leave balances (for HR/Admin)
// This function is inefficient and can be improved, but for now, let's fix the core logic.
// The main issue is that it doesn't create balances if they are missing.
export const getAllEmployeesLeaveBalance = async (req, res) => {
  try {
    // This endpoint just fetches existing balances, so no changes are strictly needed,
    // but be aware it might show empty balances for new employees.
    const balances = await LeaveBalance.find({ year: new Date().getFullYear() })
      .populate('employee', 'name email');

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Update leave balance manually (for HR/Admin)
export const updateLeaveBalance = async (req, res) => {
  try {
    const { employeeId, leaveType, used, total } = req.body;
    const year = new Date().getFullYear();

    // --- START: NEW VALIDATION LOGIC ---
    // Before updating or creating a balance, ensure it's for a 'Paid' leave type.
    const policy = await LeavePolicy.findOne({ type: leaveType });

    if (!policy || policy.category !== 'Paid') {
      return res.status(400).json({ error: `Leave balances can only be set for 'Paid' leave types. '${leaveType}' is not a paid leave.` });
    }
    // --- END: NEW VALIDATION LOGIC ---

    let balance = await LeaveBalance.findOne({
      employee: employeeId,
      leaveType,
      year: year
    });

    if (!balance) {
      balance = new LeaveBalance({
        employee: employeeId,
        leaveType,
        used: used || 0,
        total: total || policy.totalDaysPerYear, // Default to policy total
        year: year
      });
    } else {
      balance.used = used !== undefined ? used : balance.used;
      balance.total = total !== undefined ? total : balance.total;
    }

    await balance.save();
    res.json(balance);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Reset leave balances for a new year (for HR/Admin)
export const resetLeaveBalances = async (req, res) => {
  try {
    const { year } = req.body;
    const targetYear = year || new Date().getFullYear();

    // --- MODIFIED ---
    // Fetch only PAID policies to create balances from
    const paidPolicies = await LeavePolicy.find({ category: 'Paid' });
    const employees = await User.find({ role: { $in: ['Employee', 'Admin'] } }); // Or whatever roles should have balances

    // --- IMPROVEMENT ---
    // To make this operation safe to run multiple times, delete old balances for the target year first.
    await LeaveBalance.deleteMany({ year: targetYear });

    const newBalances = [];
    for (const employee of employees) {
      for (const policy of paidPolicies) {
        newBalances.push({
          employee: employee._id,
          leaveType: policy.type,
          total: policy.totalDaysPerYear,
          used: 0,
          year: targetYear
        });
      }
    }

    if (newBalances.length > 0) {
      await LeaveBalance.insertMany(newBalances);
    }

    res.json({ message: `Leave balances for ${targetYear} have been reset successfully for ${employees.length} employees.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};