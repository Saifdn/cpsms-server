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
  },
  {
    timestamps: true,
    discriminatorKey: 'role',
  }
);

const User = mongoose.model("User", baseUserSchema);

export default User;