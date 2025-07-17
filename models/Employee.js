import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  empId: { type: String, required: true, unique: true },
  number: { type: String, required: true },
  address: { type: String, required: true },
  experience: { type: String, required: true },
  dateOfJoining: { type: Date, required: true },
  salary: { type: Number, required: true },
  role: {
    type: String,
    enum: ['hr', 'manager', 'employee'],
    default: 'employee',
    required: true
  }
});

export default mongoose.model('Employee', EmployeeSchema); 