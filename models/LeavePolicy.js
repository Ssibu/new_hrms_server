import mongoose from 'mongoose';

const LeavePolicySchema = new mongoose.Schema({
  type: {
    type: String,
    // You might want to add more types like 'LWP' (Leave Without Pay)
    enum: ['CL', 'EL', 'SL', 'LWP'],
    required: true,
    unique: true // A policy type (like 'CL') should be unique
  },
  description: String,
  category: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    required: true
  },
  // This field is only relevant for 'Paid' leave policies
  totalDaysPerYear: {
    type: Number,
    // Make this field required only if the category is 'Paid'
    required: function() { return this.category === 'Paid'; }
  },
  // New field for monthly leave allowance
  monthlyAllowance: {
    type: Number,
    // This field is only required for specific paid leave types
    required: function() {
      return ['CL', 'SL', 'EL'].includes(this.type);
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export default mongoose.model('LeavePolicy', LeavePolicySchema);