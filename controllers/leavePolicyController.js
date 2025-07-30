import LeavePolicy from '../models/LeavePolicy.js';

// Get all leave policies - NO CHANGES NEEDED
export const getAllLeavePolicies = async (req, res) => {
  try {
    const policies = await LeavePolicy.find().populate('createdBy', 'name email');
    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get leave policy by ID - NO CHANGES NEEDED
export const getLeavePolicyById = async (req, res) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id).populate('createdBy', 'name email');
    if (!policy) return res.status(404).json({ error: 'Leave policy not found' });
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- HEAVILY MODIFIED to handle renewalType logic ---
export const createLeavePolicy = async (req, res) => {
  try {
    // Destructure all new fields from the request body
    const { type, description, category, renewalType, totalDaysPerYear, monthlyDayLimit } = req.body;

    // --- START: NEW VALIDATION LOGIC ---

    const policyData = {
      type,
      description,
      category,
      createdBy: req.user.userId
    };

    // Validation is primarily for 'Paid' policies
    if (category === 'Paid') {
      if (!renewalType || !['Yearly', 'Monthly'].includes(renewalType)) {
        return res.status(400).json({ error: 'Renewal Type (\'Yearly\' or \'Monthly\') is required for a Paid policy.' });
      }
      policyData.renewalType = renewalType;

      if (renewalType === 'Yearly') {
        if (!totalDaysPerYear || totalDaysPerYear <= 0) {
          return res.status(400).json({ error: 'Total Days Per Year is required for a Yearly policy.' });
        }
        policyData.totalDaysPerYear = totalDaysPerYear;
        // monthlyDayLimit is optional for Yearly policies (it's a restriction)
        if (monthlyDayLimit) {
          policyData.monthlyDayLimit = monthlyDayLimit;
        }
      } else { // renewalType is 'Monthly'
        if (!monthlyDayLimit || monthlyDayLimit <= 0) {
          return res.status(400).json({ error: 'Monthly Day Limit (as a grant) is required for a Monthly policy.' });
        }
        policyData.monthlyDayLimit = monthlyDayLimit;
        // totalDaysPerYear is not applicable for Monthly policies
      }
    }
    // For 'Unpaid' policies, no further validation is needed.
    // --- END: NEW VALIDATION LOGIC ---

    const existingPolicy = await LeavePolicy.findOne({ type });
    if (existingPolicy) {
      return res.status(400).json({ error: `A leave policy for type '${type}' already exists.` });
    }

    const newPolicy = new LeavePolicy(policyData);
    // The .save() will trigger the final, schema-level conditional 'required' checks
    await newPolicy.save();
    res.status(201).json(newPolicy);
  } catch (err) {
    // Catches Mongoose validation errors as well
    res.status(400).json({ error: err.message });
  }
};

// --- HEAVILY MODIFIED to handle conditional updates ---
export const updateLeavePolicy = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // --- START: NEW UPDATE LOGIC ---
    
    // If category is being changed to 'Unpaid', unset all financial/renewal fields
    if (updateData.category === 'Unpaid') {
      updateData.renewalType = undefined;
      updateData.totalDaysPerYear = undefined;
      updateData.monthlyDayLimit = undefined;
    } 
    // If the policy type is being set, handle its requirements
    else if (updateData.category === 'Paid' && updateData.renewalType) {
      if (updateData.renewalType === 'Monthly') {
        // If switching to Monthly, totalDaysPerYear is irrelevant and should be unset.
        updateData.totalDaysPerYear = undefined;
      }
      // If switching to Yearly, we don't unset monthlyDayLimit as it could be an intentional restriction.
      // The frontend should handle clearing it if desired.
    }

    // Use findByIdAndUpdate with options to ensure schema rules are applied
    const updatedPolicy = await LeavePolicy.findByIdAndUpdate(
      req.params.id,
      { $set: updateData, $unset: { 
          // Explicitly remove fields that are now undefined
          ...(updateData.totalDaysPerYear === undefined && { totalDaysPerYear: 1 }),
          ...(updateData.monthlyDayLimit === undefined && { monthlyDayLimit: 1 }),
          ...(updateData.renewalType === undefined && { renewalType: 1 })
        }
      },
      {
        new: true, // Return the updated document
        runValidators: true, // This is crucial to re-run schema validations
        context: 'query'
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

// Delete leave policy - NO CHANGES NEEDED
export const deleteLeavePolicy = async (req, res) => {
  try {
    const deletedPolicy = await LeavePolicy.findByIdAndDelete(req.params.id);
    if (!deletedPolicy) return res.status(404).json({ error: 'Leave policy not found' });
    res.json({ message: 'Leave policy deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};