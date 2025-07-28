import { Router } from 'express';
import {
  getAllLeaveRequests,
  getMyLeaveRequests,
  createLeaveRequest,
  updateLeaveRequestStatus,
  getLeaveRequestById
} from '../controllers/leaveRequestController.js';
import permit from '../middleware/permission.js';

const router = Router();

// HR routes
router.get('/', permit('leave:read'), getAllLeaveRequests);
router.put('/:id/status', permit('leave:update'), updateLeaveRequestStatus);

// Employee routes
router.get('/my', permit('leave:read'), getMyLeaveRequests);
router.post('/', permit('leave:create'), createLeaveRequest);
router.get('/:id', permit('leave:read'), getLeaveRequestById);

export default router; 