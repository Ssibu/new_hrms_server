import mongoose from 'mongoose';

/**
 * This sub-schema defines a SINGLE salary rule assigned to an employee.
 * It now includes logic for complex percentage calculations and stores the result.
 */
const AssignedComponentSchema = new mongoose.Schema({
  /**
   * Link to the master component definition (e.g., "House Rent Allowance").
   */
  component: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryComponent',
    required: true
  },

  /**
   * The calculation method.
   * 'Fixed': A direct currency amount.
   * 'Percentage': A percentage of other components.
   */
  calculationType: {
    type: String,
    enum: ['Fixed', 'Percentage'],
    required: true
  },

  /**
   * The value for the calculation.
   * e.g., 50000 for a Fixed 'Basic Salary', or 40 for a Percentage 'HRA'.
   */
  value: {
    type: Number,
    required: true,
    min: 0
  },
  
  /**
   * --- NEW FIELD ---
   * This field is ONLY used when calculationType is 'Percentage'.
   * It holds an array of master component IDs that this component's percentage
   * should be calculated on.
   * Example: For HRA, this array could contain the ObjectIDs for 'Basic Salary'
   * and 'Dearness Allowance'.
   */
  percentageOf: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryComponent'
  }],

  /**
   * --- RE-INCLUDED AS REQUESTED ---
   * The final calculated amount for this specific component in this profile.
   * IMPORTANT: This value is not set manually. It MUST be calculated and updated by
   * the backend controller every time the profile is saved or updated.
   * For example, if 'Basic Salary' changes, the amount for 'HRA' must be
   * recalculated and saved automatically.
   */
  amount: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: false }); // _id is not needed for this sub-document


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
   * An array of all the salary component rules and their calculated values
   * assigned to this employee.
   */
  components: [AssignedComponentSchema]
}, { timestamps: true });

export default mongoose.model('EmployeeSalaryProfile', EmployeeSalaryProfileSchema);