import { Router } from 'express';
import {
  getAllLeavePolicies,
  getLeavePolicyById,
  createLeavePolicy,
  updateLeavePolicy,
  deleteLeavePolicy
} from '../controllers/leavePolicyController.js';
import permit from '../middleware/permission.js';

const router = Router();

router.get('/', permit('leave:read'), getAllLeavePolicies);
router.get('/:id', permit('leave:read'), getLeavePolicyById);
router.post('/', permit('leave:create'), createLeavePolicy);
router.put('/:id', permit('leave:update'), updateLeavePolicy);
router.delete('/:id', permit('leave:delete'), deleteLeavePolicy);

export default router; 