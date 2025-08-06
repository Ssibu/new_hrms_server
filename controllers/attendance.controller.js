import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js'; // Often needed for validation or populating

/**
 * Normalizes a date to the start of the day in UTC.
 * This is crucial for ensuring that a 'date' is consistent regardless of time.
 * @param {Date} date The input date.
 * @returns {Date} The date set to midnight UTC.
 */
const getStartOfDayUTC = (date) => {
  const newDate = new Date(date);
  newDate.setUTCHours(0, 0, 0, 0);
  return newDate;
};


// @desc    Employee checks in for the current day
// @route   POST /api/attendance/check-in
// @access  Private (Employee)
export const checkIn = async (req, res) => {
  try {
    const employeeId = req.user.userId; // Assuming user ID is attached by auth middleware
    const today = getStartOfDayUTC(new Date());

    // Check if there's already an attendance record for today
    const existingRecord = await Attendance.findOne({
      employee: employeeId,
      date: today
    });

    if (existingRecord && existingRecord.checkIn) {
      return res.status(400).json({ error: 'You have already checked in today.' });
    }

    if (existingRecord && existingRecord.status === 'On Leave') {
      return res.status(400).json({ error: 'Cannot check in. You are marked as "On Leave" for today.' });
    }

    // Find and update the record, or create it if it doesn't exist (`upsert: true`)
    const attendanceRecord = await Attendance.findOneAndUpdate(
      { employee: employeeId, date: today },
      {
        $set: {
          checkIn: new Date(),
          status: 'Present'
        }
      },
      { new: true, upsert: true }
    ).populate('employee', 'name empId');
    
    res.status(200).json(attendanceRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// @desc    Employee checks out for the current day
// @route   POST /api/attendance/check-out
// @access  Private (Employee)
export const checkOut = async (req, res) => {
  try {
    const employeeId = req.user.userId;
    const today = getStartOfDayUTC(new Date());

    const attendanceRecord = await Attendance.findOne({
      employee: employeeId,
      date: today
    });

    if (!attendanceRecord || !attendanceRecord.checkIn) {
      return res.status(400).json({ error: 'You must check in before you can check out.' });
    }

    if (attendanceRecord.checkOut) {
      return res.status(400).json({ error: 'You have already checked out today.' });
    }

    attendanceRecord.checkOut = new Date();
    await attendanceRecord.save();

    res.status(200).json(attendanceRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// @desc    Get the current employee's attendance history (with date range filter)
// @route   GET /api/attendance/my
// @access  Private (Employee)
export const getMyAttendance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = { employee: req.user.employeeId };
    console.log(filter)


    if (startDate && endDate) {
      filter.date = {
        $gte: getStartOfDayUTC(startDate),
        $lte: getStartOfDayUTC(endDate)
      };
    }

    const records = await Attendance.find(filter).sort({ date: -1 });
    res.json(records);
    console.log(records)
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// @desc    Get a full attendance report for HR/Admin (with filters)
// @route   GET /api/attendance
// @access  Private (Admin/HR)
export const getAttendanceReport = async (req, res) => {
  try {
    const { date, employeeId, status } = req.query;
    let filter = {};

    if (date) {
      const reportDate = getStartOfDayUTC(date);
      filter.date = reportDate;
    }

    if (employeeId) {
      filter.employee = employeeId;
    }

    if (status) {
      filter.status = status;
    }
    
    const records = await Attendance.find(filter)
      .populate('employee', 'name empId role')
      .populate({
          path: 'onLeaveRequest',
          select: 'leaveType leaveCategory'
      })
      .sort({ 'employee.name': 1, date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// @desc    Manually update an attendance record for HR/Admin
// @route   PUT /api/attendance/:id
// @access  Private (Admin/HR)
export const updateAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, status, remark } = req.body;

    const record = await Attendance.findById(id);
    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    // Update only the fields that were provided in the request body
    if (checkIn) record.checkIn = checkIn;
    if (checkOut) record.checkOut = checkOut;
    if (status) record.status = status;
    if (remark !== undefined) record.remark = remark;
    
    // Logic to prevent invalid states
    if (record.checkOut && record.checkIn > record.checkOut) {
        return res.status(400).json({ error: 'Check-out time cannot be before check-in time.' });
    }
    
    // If status is changed to anything other than 'On Leave', we should clear the leave link.
    if (status && status !== 'On Leave') {
        record.onLeaveRequest = null;
    }

    await record.save();

    const updatedRecord = await Attendance.findById(id)
      .populate('employee', 'name empId role');

    res.json(updatedRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};