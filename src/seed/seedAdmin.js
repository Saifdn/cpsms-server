import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";
import connectDB from "../config/db.js";
import dotenv from "dotenv";
dotenv.config();

const seedSuperAdmin = async () => {
  try {
    const existingAdmin = await Admin.findOne({ adminLevel: "super" });

    if (existingAdmin) {
      console.log("Super admin already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await Admin.create({
      fullName: "Super Admin",
      email: "admin@kfk.com",
      password: hashedPassword,
      role: "admin",
      adminLevel: "super"
    });

    console.log("Super admin created:", admin.email);

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

connectDB().then(seedSuperAdmin);