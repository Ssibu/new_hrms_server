import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getMyAttendance,
  getAttendanceReport,
  updateAttendanceRecord
} from '../controllers/attendance.controller.js';
import permit from '../middleware/permission.js'; // Assuming you have this permission middleware

const router = Router();

// --- Employee Routes ---

// Endpoint for an employee to check-in for the day
router.post('/check-in', checkIn);

// Endpoint for an employee to check-out for the day
router.post('/check-out', checkOut);

// Endpoint for an employee to get their own attendance history
router.get('/my', getMyAttendance);


// --- Admin/HR Routes ---

// Endpoint for HR to get a full attendance report with filters
router.get('/', permit('attendance:read'), getAttendanceReport);

// Endpoint for HR to manually update a specific attendance record
router.put('/:id', permit('attendance:update'), updateAttendanceRecord);


export default router;