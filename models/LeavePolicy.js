import mongoose from 'mongoose';

const LeavePolicySchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['CL', 'EL', 'SL'], 
    required: true 
  },
  description: String,
  totalDaysPerYear: Number,
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

export default mongoose.model('LeavePolicy', LeavePolicySchema); 