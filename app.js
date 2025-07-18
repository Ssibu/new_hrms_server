import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './mongodb.js';
import employeeRoutes from './routes/employee.js';
import employeeSalaryRoutes from './routes/employeeSalary.js';
import employeeTaskRoutes from './routes/employeeTask.js';
import hrPolicyRoutes from './routes/hrPolicy.js';
import authRoutes from './routes/auth.js';
import auth from './middleware/auth.js';
import userRoutes from './routes/user.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: true, // You can specify your frontend URL here for better security
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Test route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.use('/api/employees', auth, employeeRoutes);
app.use('/api/employee-salaries', auth, employeeSalaryRoutes);
app.use('/api/employee-tasks', auth, employeeTaskRoutes);
app.use('/api/hr-policies', auth, hrPolicyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', auth, userRoutes);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

export default app; 