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
  getEligibleEmployees,
  getTasksByEmployee
} from '../controllers/employeeTaskController.js';
import EmployeeTask from '../models/EmployeeTask.js'; // Added import for EmployeeTask model
import permit from '../middleware/permission.js';

const router = Router();

router.post('/', permit('task:create'), createTask);
router.get('/', permit('task:read'), getAllTasks);
router.get('/open', permit('task:read'), getOpenTasks);
router.post('/:id/claim', permit('task:update'), claimTask);
router.get('/my', permit('task:read'), getMyTasks);
router.post('/:id/start', permit('task:update'), startTask);
router.post('/:id/pause', permit('task:update'), pauseTask);
router.post('/:id/complete', permit('task:update'), completeTask);
router.get('/eligible/:taskId', permit('task:read'), getEligibleEmployees);
router.get('/employee/:employeeId', permit('task:read'), getTasksByEmployee);

export default router; 