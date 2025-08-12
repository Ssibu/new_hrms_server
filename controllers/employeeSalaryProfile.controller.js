import EmployeeSalaryProfile from '../models/EmployeeSalaryProfile.js';
import mongoose from 'mongoose';

// @desc    Get the salary profile for a specific employee by their ID
export const getProfileByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ error: 'Invalid employee ID format.' });
    }
    const profile = await EmployeeSalaryProfile.findOne({ employee: employeeId })
      .populate('components.component');
    if (!profile) {
      return res.status(200).json(null);
    }
    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Create or update the salary profile for an employee
export const createOrUpdateProfile = async (req, res) => {
  try {
    const { employeeId } = req.params;
    // --- THIS IS THE CRITICAL FIX ---
    // The request body now ONLY contains the 'components' array.
    const { components } = req.body;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ error: 'Invalid employee ID format.' });
    }
    // The validation now correctly checks only for the components array.
    if (!Array.isArray(components)) {
      return res.status(400).json({ error: 'A components array is required in the request body.' });
    }

    // The profile data no longer includes a separate basicSalary field.
    const profileData = {
      employee: employeeId,
      components
    };
    
    const updatedProfile = await EmployeeSalaryProfile.findOneAndUpdate(
      { employee: employeeId },
      profileData,
      { new: true, upsert: true, runValidators: true }
    ).populate('components.component');

    res.status(200).json({ message: 'Salary profile saved successfully.', profile: updatedProfile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};