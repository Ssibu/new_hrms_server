import LeavePolicy from '../models/LeavePolicy.js';

// Get all leave policies
export const getAllLeavePolicies = async (req, res) => {
  try {
    const policies = await LeavePolicy.find().populate('createdBy', 'name email');
    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get leave policy by ID
export const getLeavePolicyById = async (req, res) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id).populate('createdBy', 'name email');
    if (!policy) return res.status(404).json({ error: 'Leave policy not found' });
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new leave policy
export const createLeavePolicy = async (req, res) => {
  try {
    const { type, description, totalDaysPerYear } = req.body;
    
    // Check if policy type already exists
    const existingPolicy = await LeavePolicy.findOne({ type });
    if (existingPolicy) {
      return res.status(400).json({ error: 'Leave policy for this type already exists' });
    }

    const newPolicy = new LeavePolicy({
      type,
      description,
      totalDaysPerYear,
      createdBy: req.user.userId
    });
    
    await newPolicy.save();
    res.status(201).json(newPolicy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update leave policy
export const updateLeavePolicy = async (req, res) => {
  try {
    const updatedPolicy = await LeavePolicy.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    ).populate('createdBy', 'name email');
    
    if (!updatedPolicy) return res.status(404).json({ error: 'Leave policy not found' });
    res.json(updatedPolicy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete leave policy
export const deleteLeavePolicy = async (req, res) => {
  try {
    const deletedPolicy = await LeavePolicy.findByIdAndDelete(req.params.id);
    if (!deletedPolicy) return res.status(404).json({ error: 'Leave policy not found' });
    res.json({ message: 'Leave policy deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 