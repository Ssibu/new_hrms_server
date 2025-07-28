import { Router } from 'express';
import {
  getMyLeaveBalance,
  getEmployeeLeaveBalance,
  getAllEmployeesLeaveBalance,
  updateLeaveBalance,
  resetLeaveBalances
} from '../controllers/leaveBalanceController.js';
import permit from '../middleware/permission.js';

const router = Router();

// Employee routes
router.get('/my', permit('leave:read'), getMyLeaveBalance);

// HR routes
router.get('/employee/:employeeId', permit('leave:read'), getEmployeeLeaveBalance);
router.get('/all', permit('leave:read'), getAllEmployeesLeaveBalance);
router.put('/update', permit('leave:update'), updateLeaveBalance);
router.post('/reset', permit('leave:update'), resetLeaveBalances);

export default router; 