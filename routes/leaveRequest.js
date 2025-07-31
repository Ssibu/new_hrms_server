import { Router } from 'express';
import {
  getAllLeaveRequests,
  getMyLeaveRequests,
  createLeaveRequest,
  updateLeaveRequestStatus,
  getLeaveRequestById,
  updateLeaveRequestDate // <-- IMPORT: Import the new controller function
} from '../controllers/leaveRequestController.js';
import permit from '../middleware/permission.js';

const router = Router();

// --- HR / Admin Routes ---
// These routes are typically used by users with higher privileges to manage all requests.

// GET all leave requests with filtering
router.get('/', permit('leave:read'), getAllLeaveRequests);

// PUT to update the status (Approve/Reject) of a specific request
router.put('/:id/status', permit('leave:update'), updateLeaveRequestStatus);

// --- NEW ROUTE ---
// PUT to update the date range of a specific pending request
router.put('/:id/date', permit('leave:update'), updateLeaveRequestDate);


// --- Employee Routes ---
// These routes are for individual employees to manage their own leave requests.

// GET the current user's leave requests
router.get('/my', permit('leave:read'), getMyLeaveRequests);

// POST to create a new leave request
router.post('/', permit('leave:create'), createLeaveRequest);

// --- Common Route ---
// GET a single leave request by its ID. Can be used by an employee to view their
// own request details or by an admin to view any request.
router.get('/:id', permit('leave:read'), getLeaveRequestById);

export default router;