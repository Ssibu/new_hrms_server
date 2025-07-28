import mongoose from 'mongoose';

const LeaveRequestSchema = new mongoose.Schema({
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
  fromDate: { 
    type: Date, 
    required: true 
  },
  toDate: { 
    type: Date, 
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