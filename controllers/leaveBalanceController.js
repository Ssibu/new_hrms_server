import LeaveBalance from '../models/LeaveBalance.js';
import LeavePolicy from '../models/LeavePolicy.js';
import User from '../models/User.js';

// Get leave balance for current employee
export const getMyLeaveBalance = async (req, res) => {
  try {
    const balances = await LeaveBalance.find({ 
      employee: req.user.userId,
      year: new Date().getFullYear()
    });

    // If no balances exist, create them from policies
    if (balances.length === 0) {
      const policies = await LeavePolicy.find();
      const newBalances = [];

      for (const policy of policies) {
        const balance = new LeaveBalance({
          employee: req.user.userId,
          leaveType: policy.type,
          total: policy.totalDaysPerYear,
          used: 0,
          year: new Date().getFullYear()
        });
        newBalances.push(balance);
      }

      await LeaveBalance.insertMany(newBalances);
      const updatedBalances = await LeaveBalance.find({ 
        employee: req.user.userId,
        year: new Date().getFullYear()
      });
      return res.json(updatedBalances);
    }

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get leave balance for specific employee (HR only)
export const getEmployeeLeaveBalance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const balances = await LeaveBalance.find({ 
      employee: employeeId,
      year: new Date().getFullYear()
    });

    if (balances.length === 0) {
      // Create balances from policies
      const policies = await LeavePolicy.find();
      const newBalances = [];

      for (const policy of policies) {
        const balance = new LeaveBalance({
          employee: employeeId,
          leaveType: policy.type,
          total: policy.totalDaysPerYear,
          used: 0,
          year: new Date().getFullYear()
        });
        newBalances.push(balance);
      }

      await LeaveBalance.insertMany(newBalances);
      const updatedBalances = await LeaveBalance.find({ 
        employee: employeeId,
        year: new Date().getFullYear()
      });
      return res.json(updatedBalances);
    }

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all employees' leave balances (HR only)
export const getAllEmployeesLeaveBalance = async (req, res) => {
  try {
    const employees = await User.find({ role: 'Employee' });
    const balances = [];

    for (const employee of employees) {
      const employeeBalances = await LeaveBalance.find({ 
        employee: employee._id,
        year: new Date().getFullYear()
      });

      balances.push({
        employee: {
          _id: employee._id,
          name: employee.name,
          email: employee.email
        },
        balances: employeeBalances
      });
    }

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update leave balance manually (HR only)
export const updateLeaveBalance = async (req, res) => {
  try {
    const { employeeId, leaveType, used, total } = req.body;

    let balance = await LeaveBalance.findOne({
      employee: employeeId,
      leaveType,
      year: new Date().getFullYear()
    });

    if (!balance) {
      balance = new LeaveBalance({
        employee: employeeId,
        leaveType,
        used: used || 0,
        total: total || 0,
        year: new Date().getFullYear()
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

// Reset leave balances for new year (HR only)
export const resetLeaveBalances = async (req, res) => {
  try {
    const { year } = req.body;
    const policies = await LeavePolicy.find();
    const employees = await User.find({ role: 'Employee' });

    const newBalances = [];

    for (const employee of employees) {
      for (const policy of policies) {
        const balance = new LeaveBalance({
          employee: employee._id,
          leaveType: policy.type,
          total: policy.totalDaysPerYear,
          used: 0,
          year: year || new Date().getFullYear()
        });
        newBalances.push(balance);
      }
    }

    await LeaveBalance.insertMany(newBalances);
    res.json({ message: 'Leave balances reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 