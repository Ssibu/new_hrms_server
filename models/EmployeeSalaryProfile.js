import mongoose from 'mongoose';

// This sub-document defines a single, specific salary rule as it is assigned to an employee.
const AssignedComponentSchema = new mongoose.Schema({
  /**
   * A direct link to a component in the master SalaryComponent library.
   * This tells us the component's name and type (Earning/Deduction).
   */
  component: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryComponent',
    required: true
  },
  /**
   * The calculation method for this component, chosen by HR for THIS employee.
   * e.g., "Percentage"
   */
  calculationType: {
    type: String,
    enum: ['Fixed', 'Percentage'],
    required: true
  },
  /**
   * The value for the calculation, set by HR for THIS employee.
   * e.g., 40 (if 'Percentage') or 5000 (if 'Fixed')
   */
  value: {
    type: Number,
    required: true
  }
}, { _id: false });


const EmployeeSalaryProfileSchema = new mongoose.Schema({
  /**
   * A unique link to the employee this salary profile belongs to.
   */
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true // Guarantees one salary profile per employee.
  },
  
  /**
   * The employee's specific basic salary, set by HR on this page.
   */
  basicSalary: {
    type: Number,
    required: [true, 'Basic Salary is required for a salary profile.']
  },

  /**
   * An array of all the custom salary component rules that have been assigned to this employee.
   */
  components: [AssignedComponentSchema]
}, { timestamps: true });

export default mongoose.model('EmployeeSalaryProfile', EmployeeSalaryProfileSchema);