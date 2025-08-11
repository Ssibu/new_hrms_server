import mongoose from 'mongoose';

const CalculatedComponentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['Earning', 'Deduction', 'Loss of Pay'], required: true },
  amount: { type: Number, required: true } // This is the final calculated amount for the month
}, { _id: false });

const EmployeeSalarySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  
  // This array stores a snapshot of all calculated line items for the payslip.
  components: [CalculatedComponentSchema],
  
  grossEarnings: { type: Number, required: true },
  totalDeductions: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  status: { type: String, enum: ['Draft', 'Generated', 'Paid'], default: 'Draft' },
}, { timestamps: true });

EmployeeSalarySchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('EmployeeSalary', EmployeeSalarySchema);