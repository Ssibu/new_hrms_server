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
   * If true, this component's value will be pro-rated based on days present.
   * e.g., (Component Value * Days Present) / Total Days in Month.
   * If false, the component value is fixed and not affected by attendance.
   */
  isProRata: {
    type: Boolean,
    default: false // Defaulting to false is safer. Let the user explicitly enable it.
  }
}, { timestamps: true });

export default mongoose.model('SalaryComponent', SalaryComponentSchema);