import mongoose from 'mongoose';

const LeaveRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaveType: {
    type: String,
    // REMOVED: The hardcoded enum to allow for any leave type defined in LeavePolicy.
    required: true
  },
  // --- NEW FIELD ---
  // Stores whether the leave is 'Paid' or 'Unpaid' at the time of request.
  // This will be determined by the frontend based on the selected leaveType's policy.
  leaveCategory: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    required: true
  },
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  numberOfDays: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  actionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  actionAt: {
    type: Date
  },
  remarks: String
}, { timestamps: true });

export default mongoose.model('LeaveRequest', LeaveRequestSchema);