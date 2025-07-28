import mongoose from 'mongoose';

const LeaveBalanceSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  leaveType: { 
    type: String, 
    enum: ['CL', 'EL', 'SL'],
    required: true 
  },
  used: { 
    type: Number, 
    default: 0 
  },
  total: { 
    type: Number,
    required: true 
  },
  year: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  }
}, { timestamps: true });

// Compound index to ensure unique balance per employee, leave type, and year
LeaveBalanceSchema.index({ employee: 1, leaveType: 1, year: 1 }, { unique: true });

export default mongoose.model('LeaveBalance', LeaveBalanceSchema); 