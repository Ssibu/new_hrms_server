import mongoose from 'mongoose';

const SalaryComponentSchema = new mongoose.Schema({
  /**
   * The unique, user-friendly name of the salary component.
   * e.g., "House Rent Allowance (HRA)", "Provident Fund (PF)"
   */
  name: { 
    type: String, 
    required: [true, 'Component name is required.'], 
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
    required: [true, 'Component type is required.']
  },

  /**
   * The default calculation method for this component.
   * 'Percentage' means it's a percentage of the basic salary.
   * 'Fixed' means it's a flat monetary amount.
   */
  calculationType: {
    type: String,
    enum: ['Fixed', 'Percentage'],
    required: [true, 'Calculation type is required.']
  },

  /**
   * The default value for the calculation.
   * If calculationType is 'Fixed', this is the flat amount (e.g., 2000).
   * If calculationType is 'Percentage', this is the percentage value (e.g., 40 for 40%).
   */
  value: {
    type: Number,
    required: [true, 'A default value is required.']
  },

  /**
   * A flag to determine if this component should be included in income tax calculations.
   * Useful for future enhancements.
   */
  isTaxable: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('SalaryComponent', SalaryComponentSchema);