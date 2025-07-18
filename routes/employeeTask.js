import { Router } from 'express';
import {
  createTask,
  getAllTasks,
  getOpenTasks,
  claimTask,
  getMyTasks,
  startTask,
  pauseTask,
  completeTask,
  getEligibleEmployees
} from '../controllers/employeeTaskController.js';
import EmployeeTask from '../models/EmployeeTask.js'; // Added import for EmployeeTask model

const router = Router();

router.post('/', createTask);
router.get('/', getAllTasks);
router.get('/open', getOpenTasks);
router.post('/:id/claim', claimTask);
router.get('/my', async (req, res) => {
  try {
    const { userId } = req.query; // Now expects userId as query param
    const tasks = await EmployeeTask.find({ assignedTo: userId })
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post('/:id/start', startTask);
router.post('/:id/pause', pauseTask);
router.post('/:id/complete', completeTask);
router.get('/eligible/:taskId', getEligibleEmployees);

export default router; 