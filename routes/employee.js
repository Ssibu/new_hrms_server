import { Router } from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../controllers/employeeController.js';
import permit from '../middleware/permission.js';

const router = Router();

router.get('/', permit('employee:read'), getAllEmployees);
router.get('/:id', permit('employee:read'), getEmployeeById);
router.post('/', permit('employee:create'), createEmployee);
router.put('/:id', permit('employee:update'), updateEmployee);
router.delete('/:id', permit('employee:delete'), deleteEmployee);

export default router; 