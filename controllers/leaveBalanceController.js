import LeaveBalance from '../models/LeaveBalance.js';
import LeavePolicy from '../models/LeavePolicy.js';
import User from '../models/User.js';

/**
 * [Self-Healing] Gets the leave balance for the current employee.
 * If any 'Paid' leave policy exists for which the user does not have a balance,
 * it creates the missing balance record automatically.
 */
export const getMyLeaveBalance = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const employeeId = req.user.userId;

    // 1. Get all currently active 'Paid' policies.
    const paidPolicies = await LeavePolicy.find({ category: 'Paid' });

    // 2. Get the user's existing balances for the year.
    const existingBalances = await LeaveBalance.find({
      employee: employeeId,
      year: year
    });

    // 3. Figure out which balances are missing.
    const existingBalanceTypes = existingBalances.map(b => b.leaveType);
    const missingBalances = paidPolicies.filter(policy => !existingBalanceTypes.includes(policy.type));

    // 4. If there are any missing balances, create them.
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

    // 5. Fetch and return the complete, up-to-date list of balances.
    const allBalances = await LeaveBalance.find({ employee: employeeId, year: year });
    res.json(allBalances);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * [Self-Healing] Gets leave balance for a specific employee by ID.
 * Also creates any missing balance records automatically.
 */
export const getEmployeeLeaveBalance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const year = new Date().getFullYear();

    // The logic is identical to getMyLeaveBalance, just with a dynamic employeeId.
    const paidPolicies = await LeavePolicy.find({ category: 'Paid' });
    const existingBalances = await LeaveBalance.find({ employee: employeeId, year: year });

    const existingBalanceTypes = existingBalances.map(b => b.leaveType);
    const missingBalances = paidPolicies.filter(policy => !existingBalanceTypes.includes(policy.type));

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

/**
 * [Admin] Gets all employees' existing leave balances for a given year.
 * This function remains a simple fetch for performance reasons on a large scale.
 * Individual balances can be generated on-demand via getEmployeeLeaveBalance.
 */
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
 * Validates that the leave type is 'Paid'.
 */
export const updateLeaveBalance = async (req, res) => {
  try {
    const { employeeId, leaveType, used, total } = req.body;
    const year = new Date().getFullYear();

    // Ensure it's a 'Paid' leave type before proceeding.
    const policy = await LeavePolicy.findOne({ type: leaveType });
    if (!policy || policy.category !== 'Paid') {
      return res.status(400).json({ error: `Leave balances can only be set for 'Paid' leave types. '${leaveType}' is not a paid leave.` });
    }

    // Find existing balance or create a new one if it doesn't exist.
    const updatedBalance = await LeaveBalance.findOneAndUpdate(
      { employee: employeeId, leaveType, year },
      { 
        $set: {
          used: used,
          total: total
        } 
      },
      { new: true, upsert: true, setDefaultsOnInsert: true } // upsert: true will create if not found
    );
    
    res.json(updatedBalance);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * [Admin] Resets all leave balances for a new year for all employees.
 * This is an idempotent operation; it's safe to run multiple times.
 */
export const resetLeaveBalances = async (req, res) => {
  try {
    const { year } = req.body;
    const targetYear = year || new Date().getFullYear();

    const paidPolicies = await LeavePolicy.find({ category: 'Paid' });
    const employees = await User.find({ role: { $in: ['Employee', 'Admin'] } });

    // This makes the operation idempotent. Deletes any old records for the target year.
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