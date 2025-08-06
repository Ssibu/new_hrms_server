import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', // Correctly references your Employee model
    required: [true, 'Employee ID is required for an attendance record.']
  },

  date: {
    type: Date,
    required: [true, 'Date is required for an attendance record.']
  },

  checkIn: {
    type: Date,
    default: null
  },

  checkOut: {
    type: Date,
    default: null
  },

  status: {
    type: String,
    enum: ['Present', 'Absent', 'On Leave', 'Holiday', 'Half Day'],
    required: [true, 'Attendance status is required.'],
    default: 'Absent'
  },
  
  // --- NEW FIELD ADDED ---
  /**
   *  If the status is 'On Leave', this field will store a reference
   *  to the specific LeaveRequest document that authorized this absence.
   *  This is the key to linking attendance to payroll deductions.
   */
  onLeaveRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveRequest', // <-- CRITICAL LINK to the LeaveRequest model
    default: null        // This will be null for 'Present', 'Absent', or 'Holiday' statuses.
  },

  remark: {
    type: String,
    trim: true
  }

}, {
  timestamps: true
});

AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', AttendanceSchema);

export default Attendance;