import EmployeeSalaryProfile from '../models/EmployeeSalaryProfile.js';
import mongoose from 'mongoose';

// @desc    Get the salary profile for a specific employee by their ID
// @route   GET /api/employee-salary-profiles/:employeeId
// @access  Private (HR/Admin)
export const getProfileByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ error: 'Invalid employee ID format.' });
    }

    // Find the profile and populate the nested 'component' details.
    // This will fetch the name and type from the master SalaryComponent library.
    const profile = await EmployeeSalaryProfile.findOne({ employee: employeeId })
      .populate('components.component'); 

    if (!profile) {
      // This is not an error. It simply means a profile hasn't been created yet.
      // The frontend will use this null response to display a fresh form.
      return res.status(200).json(null);
    }
    
    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Create or update the salary profile for a specific employee
// @route   PUT /api/employee-salary-profiles/:employeeId
// @access  Private (HR/Admin)
export const createOrUpdateProfile = async (req, res) => {
  try {
    const { employeeId } = req.params;
    // The frontend will send the basic salary and the array of assigned components.
    const { basicSalary, components } = req.body;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ error: 'Invalid employee ID format.' });
    }
    if (basicSalary === undefined || !Array.isArray(components)) {
        return res.status(400).json({ error: 'Basic salary and a components array are required.' });
    }

    const profileData = {
      employee: employeeId,
      basicSalary,
      components
    };
    
    // findOneAndUpdate with upsert:true is the perfect tool for this.
    // - If a profile for this employee exists, it will be UPDATED.
    // - If no profile exists, a new one will be CREATED.
    const updatedProfile = await EmployeeSalaryProfile.findOneAndUpdate(
      { employee: employeeId }, // The filter to find the document to update/create
      profileData,              // The data to set
      { new: true, upsert: true, runValidators: true } // Options
    ).populate('components.component');

    res.status(200).json({ message: 'Salary profile saved successfully.', profile: updatedProfile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};