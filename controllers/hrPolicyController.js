import HRPolicy from '../models/HRPolicy.js';

export const getAllPolicies = async (req, res) => {
  try {
    const policies = await HRPolicy.find();
    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPolicyById = async (req, res) => {
  try {
    const policy = await HRPolicy.findById(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createPolicy = async (req, res) => {
  try {
    const newPolicy = new HRPolicy(req.body);
    await newPolicy.save();
    res.status(201).json(newPolicy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updatePolicy = async (req, res) => {
  try {
    const updated = await HRPolicy.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Policy not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deletePolicy = async (req, res) => {
  try {
    const deleted = await HRPolicy.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Policy not found' });
    res.json({ message: 'Policy deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 