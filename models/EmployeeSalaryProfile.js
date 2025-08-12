import mongoose from 'mongoose';

const AssignedComponentSchema = new mongoose.Schema({
  /**
   * A direct link to a component in the master SalaryComponent library.
   */
  component: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryComponent',
    required: true
  },
  /**
   * The calculation method for this component, chosen by HR for this employee.
   */
  calculationType: {
    type: String,
    enum: ['Fixed', 'Percentage'],
    required: true
  },
  /**
   * The value for the calculation, set by HR for this employee.
   */
  value: {
    type: Number,
    required: true
  },
  
  // --- NEW FIELDS AS PER YOUR SENIOR'S REQUIREMENT ---
  /**
   * The calculated amount for this component, stored directly in the profile.
   * This will need to be recalculated and updated every time the basic salary changes.
   */
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  /**
   * A boolean flag to indicate if this component's calculation is based on days.
   * (e.g., pro-rated).
   */
  days: {
    type: Boolean,
    default: false
  }
  // --- END OF NEW FIELDS ---

}, { _id: false });


const EmployeeSalaryProfileSchema = new mongoose.Schema({
  /**
   * A unique link to the employee this salary profile belongs to.
   */
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true
  },
  
  /**
   * The employee's specific basic salary, set by HR on the assignment page.
   */
  

  /**
   * An array of all the salary component rules assigned to this employee.
   */
  components: [AssignedComponentSchema]
}, { timestamps: true });

export default mongoose.model('EmployeeSalaryProfile', EmployeeSalaryProfileSchema);