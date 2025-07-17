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

const router = Router();

router.post('/', createTask);
router.get('/', getAllTasks);
router.get('/open', getOpenTasks);
router.post('/:id/claim', claimTask);
router.get('/my', getMyTasks);
router.post('/:id/start', startTask);
router.post('/:id/pause', pauseTask);
router.post('/:id/complete', completeTask);
router.get('/eligible/:taskId', getEligibleEmployees);

export default router; 