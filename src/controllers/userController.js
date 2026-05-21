import Graduate from "../models/Graduate.js";
import Staff from "../models/Staff.js";
import Admin from "../models/Admin.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

const userProjection = "-refreshToken -password -passwordResetToken -__v";

export const getAllGraduates = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const total = await Graduate.countDocuments();

    const graduates = await Graduate.find()
      .select(userProjection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      data: graduates,
      count: graduates.length,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get All Graduates Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch graduates" 
    });
  }
};

export const getGraduateById = async (req, res) => {
  try {
    const graduate = await Graduate.findById(req.params.id)
      .select(userProjection);
    if (!graduate) {
      return res.status(404).json({ message: "Graduate not found" });
    }
    res.json({ success: true, data: graduate });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Create new graduate with auto-generated password
export const createGraduate = async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide fullName, email and phone"
      });
    }

    // Generate a random password (e.g. 10 characters)
    const randomPassword = crypto.randomBytes(5).toString('hex'); // Example: "a1b2c3d4e5"

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create the graduate
    const graduate = await Graduate.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: 'graduate',
    });

    // Send email with the plain password
    await sendEmail(
      email,
      "Your Graduate Account Created",
      `
        Hello ${fullName},

        Your account has been created successfully.

        Email: ${email}
        Password: ${randomPassword}

        Please login and change your password immediately for security.

        Best regards,
        KFK Studio Team
      `
    );

    res.status(201).json({
      success: true,
      message: "Graduate created successfully. Password has been sent to their email.",
      data: {
        id: graduate._id,
        fullName: graduate.fullName,
        email: graduate.email,
        phone: graduate.phone,
        role: graduate.role
      }
    });

  } catch (error) {
    console.error(error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    res.status(400).json({ 
      success: false, 
      message: error.message || "Failed to create graduate" 
    });
  }
};

// Update graduate
export const updateGraduate = async (req, res) => {
  try {
    const graduate = await Graduate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true }
    );

    if (!graduate) {
      return res.status(404).json({ message: "Graduate not found" });
    }

    res.json({
      success: true,
      message: "Graduate updated successfully",
      data: graduate,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete graduate
export const deleteGraduate = async (req, res) => {
  try {
    const graduate = await Graduate.findByIdAndDelete(req.params.id);
    if (!graduate) {
      return res.status(404).json({ message: "Graduate not found" });
    }

    res.json({ 
      success: true, 
      message: "Graduate deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== STAFF CRUD ====================

// Get all staff
export const getAllStaff = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const total = await Staff.countDocuments();

    const staff = await Staff.find()
      .select(userProjection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      data: staff,
      count: staff.length,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get All Staff Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch staff" 
    });
  }
};

// Get single staff
export const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id)
      .select(userProjection);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Create new staff with auto-generated password
export const createStaff = async (req, res) => {
  try {
    const { fullName, email, phone, department } = req.body;

    if (!fullName || !email || !phone || !department) {
      return res.status(400).json({
        success: false,
        message: "Please provide fullName, email, phone and department"
      });
    }

    // Generate a random password
    const randomPassword = crypto.randomBytes(8).toString('hex'); // 16 characters

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create the staff member
    const staff = await Staff.create({
      fullName,
      email,
      phone,
      department,
      password: hashedPassword,
      role: 'staff',                    // Important: Set role as 'staff'
    });

    // Send email with the plain password
    await sendEmail(
      email,
      "Your Staff Account Created",
      `
        Hello ${fullName},

        Your staff account has been created successfully.

        Email: ${email}
        Password: ${randomPassword}

        Please login and change your password immediately for security.

        Best regards,
        KFK Studio Team
      `
    );

    res.status(201).json({
      success: true,
      message: "Staff created successfully. Password has been sent to their email.",
      data: {
        id: staff._id,
        fullName: staff.fullName,
        email: staff.email,
        phone: staff.phone,
        department: staff.department,
        role: staff.role
      }
    });

  } catch (error) {
    console.error(error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    res.status(400).json({ 
      success: false, 
      message: error.message || "Failed to create staff" 
    });
  }
};

// Update staff
export const updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true }
    );

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.json({
      success: true,
      message: "Staff updated successfully",
      data: staff,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete staff
export const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.json({ 
      success: true, 
      message: "Staff deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== ADMIN CRUD ====================

// Get all admins
export const getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const total = await Admin.countDocuments();

    const admins = await Admin.find()
      .select(userProjection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      data: admins,
      count: admins.length,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get All Admins Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch admins" 
    });
  }
};

// Get single admin
export const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id)
      .select(userProjection);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.json({ success: true, data: admin });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Create new admin with auto-generated password
export const createAdmin = async (req, res) => {
  try {
    const { fullName, email, phone, role = "admin" } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide fullName, email and phone"
      });
    }

    // Validate admin level
    const validRoles = ["admin", "superadmin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin level. Must be 'admin' or 'superadmin'"
      });
    }

    // Generate a random password
    const randomPassword = crypto.randomBytes(8).toString('hex'); // 16 characters

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create the admin
    const admin = await Admin.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: role,                    // 'admin' or 'superadmin'
    });

    // Send email with the plain password
    await sendEmail(
      email,
      "Your Admin Account Created",
      `
        Hello ${fullName},

        Your admin account has been created successfully.

        Email: ${email}
        Password: ${randomPassword}
        Role: ${role}

        Please login and change your password immediately for security.

        Best regards,
        KFK Studio Team
      `
    );

    res.status(201).json({
      success: true,
      message: "Admin created successfully. Password has been sent to their email.",
      data: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone,
        role: admin.role
      }
    });

  } catch (error) {
    console.error(error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    res.status(400).json({ 
      success: false, 
      message: error.message || "Failed to create admin" 
    });
  }
};

// Update admin
export const updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true }
    );

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({
      success: true,
      message: "Admin updated successfully",
      data: admin,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete admin
export const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ 
      success: true, 
      message: "Admin deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};