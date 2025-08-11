import mongoose from 'mongoose';

const AssignedComponentSchema = new mongoose.Schema({
  component: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryComponent',
    required: true
  },
  calculationType: {
    type: String,
    enum: ['Fixed', 'Percentage'],
    required: true
  },
  value: {
    type: Number,
    required: true
  }
}, { _id: false });

const EmployeeSalaryProfileSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true
  },
  // The basicSalary field is GONE.
  // The components array is now the single source of truth for the salary structure.
  components: [AssignedComponentSchema]
}, { timestamps: true });

export default mongoose.model('EmployeeSalaryProfile', EmployeeSalaryProfileSchema);