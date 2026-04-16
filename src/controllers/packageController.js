import Package from "../models/Package.js";

// Get all packages
export const getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find().sort({ price: 1 });
    
    res.json({
      success: true,
      count: packages.length,
      data: packages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get single package
export const getPackageById = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });

    res.json({ success: true, data: pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create new package
export const createPackage = async (req, res) => {
  try {
    const { name, description, price, services } = req.body;

    const newPackage = await Package.create({
      name,
      description,
      price,
      services,
    });

    res.status(201).json({
      success: true,
      message: "Package created successfully",
      data: newPackage,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Package name already exists" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update package
export const updatePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true }
    );

    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });

    res.json({
      success: true,
      message: "Package updated successfully",
      data: pkg,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete package (soft delete - set isActive false)
export const deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);

    if (!pkg) {
      return res.status(404).json({ 
        success: false, 
        message: "Package not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Package deleted permanently" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};