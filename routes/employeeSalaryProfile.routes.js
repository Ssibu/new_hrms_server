import { Router } from 'express';
import {
  getProfileByEmployeeId,
  createOrUpdateProfile
} from '../controllers/employeeSalaryProfile.controller.js';
import permit from '../middleware/permission.js';

const router = Router();

// We use the same 'payroll:manage' permission for consistency
router.get('/:employeeId', permit('payroll:manage'), getProfileByEmployeeId);
router.put('/:employeeId', permit('payroll:manage'), createOrUpdateProfile);

export default router;