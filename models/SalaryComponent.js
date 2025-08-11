import mongoose from 'mongoose';

const SalaryComponentSchema = new mongoose.Schema({
  /**
   * The unique, user-friendly name of the salary component.
   * e.g., "House Rent Allowance", "Provident Fund"
   */
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  
  /**
   * Defines whether this component adds to the salary (Earning)
   * or subtracts from it (Deduction).
   */
  type: {
    type: String,
    enum: ['Earning', 'Deduction'],
    required: true
  },

  /**
   * A flag for future tax calculation enhancements.
   */
  isTaxable: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('SalaryComponent', SalaryComponentSchema);