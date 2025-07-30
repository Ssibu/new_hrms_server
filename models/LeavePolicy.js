import mongoose from 'mongoose';

const LeavePolicySchema = new mongoose.Schema({
  /**
   * The short code for the leave policy (e.g., 'CL', 'SL').
   */
  type: {
    type: String,
    enum: ['CL', 'EL', 'SL', 'LWP'],
    required: true,
    unique: true
  },

  /**
   * A user-friendly description of the leave policy.
   */
  description: String,

  /**
   * Defines if the leave is Paid or Unpaid. Crucial for balance calculations.
   */
  category: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    required: true
  },
  
  /**
   * --- NEW & CRUCIAL ---
   * Defines the core behavior of how leave is granted and renewed.
   * 'Yearly': A block of leave is given annually.
   * 'Monthly': A smaller amount of leave is granted each month.
   */
  renewalType: {
    type: String,
    enum: ['Yearly', 'Monthly'],
    // Required only for 'Paid' leaves, as 'Unpaid' leaves don't have a grant/renewal cycle.
    required: function() { return this.category === 'Paid'; }
  },

  /**
   * --- MODIFIED ---
   * Represents the total leave bucket for policies with a 'Yearly' renewal type.
   */
  totalDaysPerYear: {
    type: Number,
    // This field is now only required if the policy is 'Paid' AND renews 'Yearly'.
    required: function() { 
      return this.category === 'Paid' && this.renewalType === 'Yearly'; 
    }
  },

  /**
   * --- MODIFIED & RENAMED FOR CLARITY ---
   * This field now has a clear, dual purpose based on the renewalType.
   * - For 'Monthly' policies: It is the REQUIRED number of days GRANTED each month.
   * - For 'Yearly' policies: It is an OPTIONAL RESTRICTION on how many days can be used per month.
   */
  monthlyDayLimit: {
    type: Number,
    // It's required only if the policy is 'Paid' and renews 'Monthly'.
    required: function() { 
      return this.category === 'Paid' && this.renewalType === 'Monthly'; 
    }
  },

  /**
   * The user who created this policy.
   */
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export default mongoose.model('LeavePolicy', LeavePolicySchema);