import mongoose from 'mongoose';

const EmployeeTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['open', 'claimed', 'in_progress', 'paused', 'completed'], default: 'open' },
  estimateTime: { type: Number }, // in minutes or hours
  claimedAt: { type: Date },
  startedAt: { type: Date },
  pausedAt: { type: Date },
  completedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('EmployeeTask', EmployeeTaskSchema); 