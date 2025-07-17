import { Router } from 'express';
import {
  getAllPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy
} from '../controllers/hrPolicyController.js';

const router = Router();

router.get('/', getAllPolicies);
router.get('/:id', getPolicyById);
router.post('/', createPolicy);
router.put('/:id', updatePolicy);
router.delete('/:id', deletePolicy);

export default router; 