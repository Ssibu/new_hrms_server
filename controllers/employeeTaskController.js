import EmployeeTask from '../models/EmployeeTask.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

export const createTask = async (req, res) => {
  try {
    const { title, description, createdBy } = req.body;
   
    const task = new EmployeeTask({ title, description, createdBy });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } 
};

export const getAllTasks = async (req, res) => {
  try {
    const tasks = await EmployeeTask.find().populate('createdBy assignedTo', 'name email role');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getOpenTasks = async (req, res) => {
  try {
    const tasks = await EmployeeTask.find({ status: 'open', assignedTo: null });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const claimTask = async (req, res) => {
  try {
    const { estimateTime, userId } = req.body;
    const task = await EmployeeTask.findOne({ _id: req.params.id, status: 'open', assignedTo: null });
    if (!task) return res.status(404).json({ message: 'Task not available for claim' });
    task.assignedTo = userId;
    task.status = 'claimed';
    task.estimateTime = estimateTime;
    task.claimedAt = new Date();
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMyTasks = async (req, res) => {
  try {

    // Always use the authenticated user's ID from req.user
    const userId = req.user.userId;
    console.log(userId)
    
    const tasks = await EmployeeTask.find({ assignedTo: userId }).populate('createdBy', 'name email role');
    res.json(tasks);
    console.log(tasks)
    
    
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const startTask = async (req, res) => {
  try {
    const { userId } = req.body;
    const task = await EmployeeTask.findOne({ _id: req.params.id, assignedTo: userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    task.status = 'in_progress';
    task.startedAt = new Date();
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const pauseTask = async (req, res) => {
  try {
    const { userId } = req.body;
    const task = await EmployeeTask.findOne({ _id: req.params.id, assignedTo: userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    task.status = 'paused';
    task.pausedAt = new Date();
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const completeTask = async (req, res) => {
  try {
    const { userId } = req.body;
    const task = await EmployeeTask.findOne({ _id: req.params.id, assignedTo: userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    task.status = 'completed';
    task.completedAt = new Date();

    // Calculate rating
    let rating = 3; // default
    if (task.estimateTime && task.startedAt && task.completedAt) {
      const actualTime = (task.completedAt - task.startedAt) / (1000 * 60); // in minutes
      const estimate = task.estimateTime;
      const percent = (actualTime / estimate) * 100;
      if (percent <= 75) {
        rating = 5;
      } else if (percent > 75 && percent <= 100) {
        rating = 4;
      } else if (percent > 100 && percent <= 130) {
        rating = 3;
      } else if (percent > 130 && percent < 150) {
        rating = 2;
      } else if (percent >= 150) {
        rating = 1;
      }
    }
    task.rating = rating;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getEligibleEmployees = async (req, res) => {
  try {
    const task = await EmployeeTask.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const employees = await User.find({ role: 'Employee' });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTasksByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log(employeeId)
    
    
    // Validate that the user is admin or has appropriate permissions
    if (req.user.role !== 'Admin' && (!req.user.permissions || !req.user.permissions.includes('task:read'))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }
    
    
    const tasks = await EmployeeTask.find({ assignedTo: employeeId }).populate('createdBy', 'name email role');
    console.log(tasks);

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
