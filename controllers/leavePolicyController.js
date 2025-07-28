import LeavePolicy from '../models/LeavePolicy.js';

// Get all leave policies
// NO CHANGES NEEDED - This will now correctly show the 'category' for each policy.
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
    // Destructure the new 'category' field from the request body
    const { type, description, category, totalDaysPerYear } = req.body;

    // --- START: NEW VALIDATION LOGIC ---
    if (!category) {
      return res.status(400).json({ error: 'Leave category (\'Paid\' or \'Unpaid\') is required.' });
    }

    // If the policy is 'Paid', totalDaysPerYear is mandatory and must be a positive number.
    if (category === 'Paid' && (!totalDaysPerYear || totalDaysPerYear <= 0)) {
      return res.status(400).json({ error: 'Total days per year is required for a Paid leave policy and must be greater than 0.' });
    }

    // If the policy is 'Unpaid', we ensure totalDaysPerYear is not stored.
    const policyData = {
      type,
      description,
      category,
      createdBy: req.user.userId // Assuming req.user is populated by your auth middleware
    };

    if (category === 'Paid') {
      policyData.totalDaysPerYear = totalDaysPerYear;
    }
    // --- END: NEW VALIDATION LOGIC ---

    // Check if policy type already exists (this check remains)
    const existingPolicy = await LeavePolicy.findOne({ type });
    if (existingPolicy) {
      return res.status(400).json({ error: `A leave policy for type '${type}' already exists.` });
    }

    const newPolicy = new LeavePolicy(policyData);

    // The .save() method will now also trigger the conditional validation in your schema
    await newPolicy.save();
    res.status(201).json(newPolicy);
  } catch (err) {
    // This will catch validation errors from Mongoose as well
    res.status(400).json({ error: err.message });
  }
};


// Update leave policy
// --- MODIFIED ---
export const updateLeavePolicy = async (req, res) => {
  try {
    const { category, totalDaysPerYear } = req.body;

    // --- START: NEW UPDATE LOGIC ---
    // If the update request tries to change the category to 'Unpaid',
    // we must explicitly unset the totalDaysPerYear field in the database.
    if (category === 'Unpaid') {
        req.body.totalDaysPerYear = undefined; // Ensure totalDays isn't stored
    }
    // --- END: NEW UPDATE LOGIC ---

    const updatedPolicy = await LeavePolicy.findByIdAndUpdate(
      req.params.id,
      req.body, // The updated fields from the request body
      {
        new: true, // This returns the updated document
        runValidators: true // This is crucial! It ensures your schema rules (like the conditional 'required') are applied on update
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