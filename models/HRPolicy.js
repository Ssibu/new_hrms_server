import mongoose from 'mongoose';

const HRPolicySchema = new mongoose.Schema({
  policyName: { type: String, required: true },
  eligibility: { type: String, required: true },
  eligibilityDays: { type: Number, required: true },
  description: { type: String, required: true },
});

export default mongoose.model('HRPolicy', HRPolicySchema); 