import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeavePolicy from './models/LeavePolicy.js';
import User from './models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for seeding');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedLeavePolicies = async () => {
  try {
    // Find an admin user to set as creator
    const adminUser = await User.findOne({ role: 'Admin' });
    const creatorId = adminUser ? adminUser._id : null;

    const defaultPolicies = [
      {
        type: 'CL',
        description: 'Casual Leave - For personal or casual purposes',
        totalDaysPerYear: 12,
        createdBy: creatorId
      },
      {
        type: 'EL',
        description: 'Earned Leave - Annual leave entitlement',
        totalDaysPerYear: 21,
        createdBy: creatorId
      },
      {
        type: 'SL',
        description: 'Sick Leave - For medical reasons',
        totalDaysPerYear: 15,
        createdBy: creatorId
      }
    ];

    // Check if policies already exist
    const existingPolicies = await LeavePolicy.find();
    if (existingPolicies.length > 0) {
      console.log('Leave policies already exist, skipping seed');
      return;
    }

    // Create policies
    await LeavePolicy.insertMany(defaultPolicies);
    console.log('Default leave policies created successfully');

    // Create leave balances for all employees
    const employees = await User.find({ role: 'Employee' });
    const policies = await LeavePolicy.find();
    
    const leaveBalances = [];
    for (const employee of employees) {
      for (const policy of policies) {
        leaveBalances.push({
          employee: employee._id,
          leaveType: policy.type,
          total: policy.totalDaysPerYear,
          used: 0,
          year: new Date().getFullYear()
        });
      }
    }

    if (leaveBalances.length > 0) {
      await mongoose.model('LeaveBalance').insertMany(leaveBalances);
      console.log(`Created leave balances for ${employees.length} employees`);
    }

  } catch (error) {
    console.error('Error seeding leave policies:', error);
  }
};

const main = async () => {
  await connectDB();
  await seedLeavePolicies();
  console.log('Seeding completed');
  process.exit(0);
};

main(); 