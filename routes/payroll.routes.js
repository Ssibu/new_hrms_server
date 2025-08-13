import { Router } from 'express';
import { 
  generatePayslip, 
  getPayslip, 
  bulkGeneratePayslips 
} from '../controllers/payroll.controller.js';
import permit from '../middleware/permission.js';

const router = Router();

/**
 * @route   POST /api/payroll/generate
 * @desc    Generate a payslip for a single employee for a specific month.
 * @access  Private (Requires 'payroll:create' permission)
 */
router.post('/generate', permit('payroll:create'), generatePayslip);

/**
 * @route   POST /api/payroll/generate/bulk
 * @desc    Generate payslips for all employees for a specific month.
 * @access  Private (Requires 'payroll:create' permission)
 */
router.post('/generate/bulk', permit('payroll:create'), bulkGeneratePayslips);

/**
 * @route   GET /api/payroll/:employeeId
 * @desc    Fetch a previously generated payslip for a specific employee and month.
 * @access  Private (Requires 'payroll:read' permission)
 */
router.get('/:employeeId', permit('payroll:read'), getPayslip);

export default router;