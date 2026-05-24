import mongoose from "mongoose";

const baseUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      // select: false,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    countryCode: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'staff', 'graduate'],
      required: true,
    },
    refreshToken: {
      token: { type: String },
      createdAt: { type: Date, default: Date.now },
      expiresAt: { type: Date }
    },
    passwordResetToken: {
      token: {type: String },
      createdAt: {type: Date, default: Date.now },
      expiresAt: {type: Date }
    },
    easyparcel: {
      access_token: { type: String, default: null },
      refresh_token: { type: String, default: null },
      expires_at: { type: Date, default: null },
      refresh_token_expires_at: { type: Date, default: null },
      connected: { type: Boolean, default: false },
      connected_at: { type: Date, default: null },
    }
  },
  {
    timestamps: true,
    discriminatorKey: 'role',
  }
);

// Is access token still valid (with 5-min buffer)?
baseUserSchema.methods.isEPTokenValid = function () {
  if (!this.easyparcel.access_token || !this.easyparcel.expires_at) return false;
  return new Date(this.easyparcel.expires_at) - Date.now() > 5 * 60 * 1000;
};
 
// Is refresh token still valid?
baseUserSchema.methods.isEPRefreshValid = function () {
  if (!this.easyparcel.refresh_token || !this.easyparcel.refresh_token_expires_at)
    return false;
  return new Date(this.easyparcel.refresh_token_expires_at) > Date.now();
};

const User = mongoose.model("User", baseUserSchema);

export default User;