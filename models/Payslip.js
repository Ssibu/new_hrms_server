import mongoose from 'mongoose';

const PayslipSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true, min: 1, max: 12 }, // e.g., 8 for August
  year: { type: Number, required: true },
  grossSalary: { type: Number, required: true },
  totalDeductions: { type: Number, required: true, default: 0 },
  netSalary: { type: Number, required: true },
  deductionDetails: [{ // A detailed log of each deduction
    date: Date,
    reason: String // e.g., 'Absent', 'Unpaid Leave', 'Half Day'
  }],
  generatedOn: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure only one payslip can exist for an employee for a specific month and year
PayslipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('Payslip', PayslipSchema);