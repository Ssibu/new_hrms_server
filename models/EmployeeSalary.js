import mongoose from 'mongoose';

/**
 * This sub-document stores a snapshot of a single, calculated line item on the payslip.
 * It holds the final "Result" of a calculation for that month.
 */
const CalculatedComponentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  }, // e.g., "Basic Salary", "HRA", "Provident Fund", "Loss of Pay"
  category: { 
    type: String, 
    enum: ['Earning', 'Deduction', 'Loss of Pay'], 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  } // This is the final calculated amount for the month
}, { _id: false });


const EmployeeSalarySchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true 
  },
  month: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 12 
  },
  year: { 
    type: Number, 
    required: true 
  },
  
  /**
   * This array stores a complete snapshot of all the calculated line items 
   * (both earnings and deductions) for this specific payslip.
   * This replaces the old 'deductionDetails' and 'grossSalary' fields.
   */
  components: [CalculatedComponentSchema],
  
  /**
   * The final, top-level calculated values.
   */
  grossEarnings: { 
    type: Number, 
    required: true 
  }, // The sum of all 'Earning' components
  totalDeductions: { 
    type: Number, 
    required: true 
  }, // The sum of all 'Deduction' and 'Loss of Pay' components
  netSalary: { 
    type: Number, 
    required: true 
  }, // Gross Earnings - Total Deductions
  
  status: { 
    type: String, 
    enum: ['Draft', 'Generated', 'Paid'], 
    default: 'Draft' 
  },
}, { timestamps: true });

// This index is crucial to prevent duplicate payslips for the same employee in the same month.
EmployeeSalarySchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('EmployeeSalary', EmployeeSalarySchema);