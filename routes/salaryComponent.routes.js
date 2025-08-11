import { Router } from 'express';
import {
  createSalaryComponent,
  getAllSalaryComponents,
  getSalaryComponentById,
  updateSalaryComponent,
  deleteSalaryComponent
} from '../controllers/salaryComponent.controller.js';
import permit from '../middleware/permission.js';

const router = Router();

// These routes should only be accessible to users with permission to manage payroll.
// We will use a new permission, 'payroll:manage'.

router.post('/', permit('payroll:manage'), createSalaryComponent);
router.get('/', permit('payroll:manage'), getAllSalaryComponents);
router.get('/:id', permit('payroll:manage'), getSalaryComponentById);
router.put('/:id', permit('payroll:manage'), updateSalaryComponent);
router.delete('/:id', permit('payroll:manage'), deleteSalaryComponent);

export default router;