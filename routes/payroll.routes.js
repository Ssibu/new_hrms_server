import { Router } from 'express';
import { generatePayslip, getPayslip } from '../controllers/payroll.controller.js';
import permit from '../middleware/permission.js';

const router = Router();

// Endpoint to calculate, save, and return a new payslip
router.post('/generate', permit('payroll:create'), generatePayslip);

// Endpoint to fetch a previously generated payslip
router.get('/:employeeId', permit('payroll:read'), getPayslip);

export default router;