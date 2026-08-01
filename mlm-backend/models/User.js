const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerifiedAt: { type: Date, default: null },
    password: { type: String, required: true }, // bcrypt hash
    status: { type: String, default: 'active' }, // active | inactive | blocked
    isKycVerified: { type: Boolean, default: false },
    profilePhoto: { type: String, default: null },

    // --- Agent / MLM columns ---
    phone: { type: String, unique: true, sparse: true },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    mlmLevel: { type: Number, default: 1 },
    totalTeamSize: { type: Number, default: 0 },

    // --- Rank columns ---
    rank: { type: mongoose.Schema.Types.ObjectId, ref: 'Rank', default: null },
    totalGroupSales: { type: Number, default: 0 }, // renamed from total_group_sqft

    // --- Personal info (agent-editable) ---
    gender: { type: String, enum: ['male', 'female', 'other', null], default: null },
    address: { type: String, default: null },
    country: { type: String, default: 'India' },

    // --- Position / commission slab (admin-set only) ---
    position: { type: String, default: null },
    slabPerSqft: { type: Number, default: null },

    // --- Sub Admin module-level permissions ---
    // Only relevant for role slug 'sub_admin'. super_admin always has full access
    // regardless of this array. Valid keys: kyc, agents, referrals, projects,
    // customers, bookings, emis, reports, withdrawals, tickets, ranks, settings, audit_logs
    permissions: { type: [String], default: [] },

    rememberToken: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.index({ referredBy: 1 });

module.exports = mongoose.model('User', userSchema);
