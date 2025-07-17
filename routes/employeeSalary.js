import { Router } from 'express';
import {
  getAllSalaries,
  getSalaryById,
  createSalary,
  updateSalary,
  deleteSalary
} from '../controllers/employeeSalaryController.js';

const router = Router();

router.get('/', getAllSalaries);
router.get('/:id', getSalaryById);
router.post('/', createSalary);
router.put('/:id', updateSalary);
router.delete('/:id', deleteSalary);

export default router; 