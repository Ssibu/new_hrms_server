import mongoose from 'mongoose';

const EmployeeSalarySchema = new mongoose.Schema({
  empId: { type: String, required: true },
  name: { type: String, required: true },
  increment: { type: Number, required: true },
  effectiveDate: { type: String, required: true },
  remarks: { type: String },
});

export default mongoose.model('EmployeeSalary', EmployeeSalarySchema); 