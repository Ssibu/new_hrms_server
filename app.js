import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './mongodb.js';
import employeeRoutes from './routes/employee.js';

import employeeTaskRoutes from './routes/employeeTask.js';
import hrPolicyRoutes from './routes/hrPolicy.js';
import leavePolicyRoutes from './routes/leavePolicy.js';
import leaveRequestRoutes from './routes/leaveRequest.js';
import leaveBalanceRoutes from './routes/leaveBalance.js';
import attendanceRoutes from './routes/attendance.routes.js';
import authRoutes from './routes/auth.js';
import auth from './middleware/auth.js';
import userRoutes from './routes/user.js';
import payrollRoutes from './routes/payroll.routes.js'; 
import salaryComponentRoutes from './routes/salaryComponent.routes.js';

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

app.use('/api/employee-tasks', auth, employeeTaskRoutes);
app.use('/api/hr-policies', auth, hrPolicyRoutes);
app.use('/api/leave-policies', auth, leavePolicyRoutes);
app.use('/api/leave-requests', auth, leaveRequestRoutes);
app.use('/api/leave-balances', auth, leaveBalanceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', auth, userRoutes);
app.use('/api/attendance', auth, attendanceRoutes);
app.use('/api/payroll', auth, payrollRoutes);
app.use('/api/salary-components', auth, salaryComponentRoutes);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

export default app; 