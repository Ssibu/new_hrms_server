import LeavePolicy from '../models/LeavePolicy.js';

// Get all leave policies
// NO CHANGES NEEDED
export const getAllLeavePolicies = async (req, res) => {
  try {
    const policies = await LeavePolicy.find().populate('createdBy', 'name email');
    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get leave policy by ID
// NO CHANGES NEEDED
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
// --- MODIFIED ---
export const createLeavePolicy = async (req, res) => {
  try {
    // Destructure the new 'monthlyAllowance' field
    const { type, description, category, totalDaysPerYear, monthlyAllowance } = req.body;

    // --- START: MODIFIED VALIDATION LOGIC ---
    if (!category) {
      return res.status(400).json({ error: 'Leave category (\'Paid\' or \'Unpaid\') is required.' });
    }

    // Validation for 'Paid' leave
    if (category === 'Paid' && (!totalDaysPerYear || totalDaysPerYear <= 0)) {
      return res.status(400).json({ error: 'Total days per year is required for a Paid leave policy and must be greater than 0.' });
    }

    // New: Validation for monthly allowance for specific types
    if (['CL', 'SL', 'EL'].includes(type) && (!monthlyAllowance || monthlyAllowance <= 0)) {
        return res.status(400).json({ error: `A monthly allowance is required for leave type '${type}' and must be greater than 0.` });
    }

    const policyData = {
      type,
      description,
      category,
      createdBy: req.user.userId // Assuming req.user is populated
    };

    if (category === 'Paid') {
      policyData.totalDaysPerYear = totalDaysPerYear;
    }

    // New: Add monthlyAllowance to the data if the type requires it
    if (['CL', 'SL', 'EL'].includes(type)) {
      policyData.monthlyAllowance = monthlyAllowance;
    }
    // --- END: MODIFIED VALIDATION LOGIC ---

    const existingPolicy = await LeavePolicy.findOne({ type });
    if (existingPolicy) {
      return res.status(400).json({ error: `A leave policy for type '${type}' already exists.` });
    }

    const newPolicy = new LeavePolicy(policyData);
    await newPolicy.save(); // Mongoose schema validation will also run here
    res.status(201).json(newPolicy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// Update leave policy
// --- MODIFIED ---
export const updateLeavePolicy = async (req, res) => {
  try {
    const { category, totalDaysPerYear, type, monthlyAllowance } = req.body;
    const updateData = { ...req.body };

    // --- START: MODIFIED UPDATE LOGIC ---

    // Find the policy first to check its current state if needed
    const policyToUpdate = await LeavePolicy.findById(req.params.id);
    if (!policyToUpdate) {
        return res.status(404).json({ error: 'Leave policy not found' });
    }
    
    // If changing category to 'Unpaid', unset totalDaysPerYear
    if (category === 'Unpaid') {
      updateData.totalDaysPerYear = undefined;
    }

    // Determine the final type (either the new one from req.body or the existing one)
    const finalType = type || policyToUpdate.type;

    // If the final type does not require a monthly allowance, unset it
    if (!['CL', 'SL', 'EL'].includes(finalType)) {
        updateData.monthlyAllowance = undefined;
    } else {
        // If it does require it, but no value was provided in the update, keep the old one
        if (monthlyAllowance === undefined) {
          updateData.monthlyAllowance = policyToUpdate.monthlyAllowance;
        }
    }
    // --- END: MODIFIED UPDATE LOGIC ---

    const updatedPolicy = await LeavePolicy.findByIdAndUpdate(
      req.params.id,
      { $set: updateData }, // Use $set to apply the changes
      {
        new: true,
        runValidators: true, // This is crucial to re-run schema validations
        context: 'query' // Helps in running validators on update
      }
    ).populate('createdBy', 'name email');

    if (!updatedPolicy) {
      return res.status(404).json({ error: 'Leave policy not found' });
    }
    res.json(updatedPolicy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// Delete leave policy
// NO CHANGES NEEDED
export const deleteLeavePolicy = async (req, res) => {
  try {
    const deletedPolicy = await LeavePolicy.findByIdAndDelete(req.params.id);
    if (!deletedPolicy) return res.status(404).json({ error: 'Leave policy not found' });
    res.json({ message: 'Leave policy deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};