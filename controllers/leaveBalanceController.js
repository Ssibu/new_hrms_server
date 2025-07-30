import LeaveBalance from '../models/LeaveBalance.js';
import LeavePolicy from '../models/LeavePolicy.js';
import User from '../models/User.js';

/**
 * [Self-Healing] Gets the leave balance for the current employee.
 * It now ONLY creates balances for 'Paid' policies with a 'Yearly' renewal type.
 */
export const getMyLeaveBalance = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const employeeId = req.user.userId;

    // 1. Get all currently active 'Paid' policies that renew 'Yearly'.
    const yearlyPolicies = await LeavePolicy.find({ 
      category: 'Paid', 
      renewalType: 'Yearly' 
    });

    // 2. Get the user's existing balances for the year.
    const existingBalances = await LeaveBalance.find({
      employee: employeeId,
      year: year
    });

    // 3. Figure out which YEARLY balances are missing.
    const existingBalanceTypes = existingBalances.map(b => b.leaveType);
    const missingBalances = yearlyPolicies.filter(policy => !existingBalanceTypes.includes(policy.type));

    // 4. If there are missing YEARLY balances, create them.
    if (missingBalances.length > 0) {
      const newBalanceDocs = missingBalances.map(policy => ({
        employee: employeeId,
        leaveType: policy.type,
        total: policy.totalDaysPerYear, // This is safe because we filtered for Yearly policies
        used: 0,
        year: year
      }));
      await LeaveBalance.insertMany(newBalanceDocs);
    }

    // 5. Fetch and return the complete, up-to-date list of balances.
    const allBalances = await LeaveBalance.find({ employee: employeeId, year: year });
    res.json(allBalances);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * [Self-Healing] Gets leave balance for a specific employee by ID.
 * Also creates any missing YEARLY balance records automatically.
 */
export const getEmployeeLeaveBalance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const year = new Date().getFullYear();

    // The logic is identical to getMyLeaveBalance, just with a dynamic employeeId.
    const yearlyPolicies = await LeavePolicy.find({ 
      category: 'Paid', 
      renewalType: 'Yearly' 
    });
    const existingBalances = await LeaveBalance.find({ employee: employeeId, year: year });

    const existingBalanceTypes = existingBalances.map(b => b.leaveType);
    const missingBalances = yearlyPolicies.filter(policy => !existingBalanceTypes.includes(policy.type));

    if (missingBalances.length > 0) {
      const newBalanceDocs = missingBalances.map(policy => ({
        employee: employeeId,
        leaveType: policy.type,
        total: policy.totalDaysPerYear,
        used: 0,
        year: year
      }));
      await LeaveBalance.insertMany(newBalanceDocs);
    }
    
    const allBalances = await LeaveBalance.find({ employee: employeeId, year: year });
    res.json(allBalances);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// [Admin] Gets all employees' existing leave balances for a given year. - NO CHANGES NEEDED
export const getAllEmployeesLeaveBalance = async (req, res) => {
  try {
    const balances = await LeaveBalance.find({ year: new Date().getFullYear() })
      .populate('employee', 'name email');
    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * [Admin] Manually updates a specific leave balance.
 * Validates that the leave type corresponds to a 'Paid', 'Yearly' policy.
 */
export const updateLeaveBalance = async (req, res) => {
  try {
    const { employeeId, leaveType, used, total } = req.body;
    const year = new Date().getFullYear();

    // --- MODIFIED: Stricter validation ---
    const policy = await LeavePolicy.findOne({ type: leaveType });
    if (!policy || policy.category !== 'Paid' || policy.renewalType !== 'Yearly') {
      return res.status(400).json({ error: `Leave balances can only be managed for 'Paid' and 'Yearly' policies. '${leaveType}' does not qualify.` });
    }

    const updatedBalance = await LeaveBalance.findOneAndUpdate(
      { employee: employeeId, leaveType, year },
      { 
        $set: {
          used: used,
          total: total
        } 
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    
    res.json(updatedBalance);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * [Admin] Resets all leave balances for a new year for all employees.
 * This now correctly ONLY creates balances for 'Yearly' policies.
 */
export const resetLeaveBalances = async (req, res) => {
  try {
    const { year } = req.body;
    const targetYear = year || new Date().getFullYear();

    // --- MODIFIED: Fetch ONLY yearly policies ---
    const yearlyPolicies = await LeavePolicy.find({ 
      category: 'Paid', 
      renewalType: 'Yearly' 
    });
    const employees = await User.find({ role: { $in: ['Employee', 'Admin'] } });

    await LeaveBalance.deleteMany({ year: targetYear });

    const newBalances = [];
    for (const employee of employees) {
      for (const policy of yearlyPolicies) { // Loop through the correct policy list
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