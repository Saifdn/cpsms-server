import Studio from "../models/Studio.js";

// Get all studios
export const getAllStudios = async (req, res) => {
  try {
    const studios = await Studio.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: studios,
      count: studios.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch studios",
    });
  }
};

// Get single studio
export const getStudioById = async (req, res) => {
  try {
    const studio = await Studio.findById(req.params.id);

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found",
      });
    }

    res.json({
      success: true,
      data: studio,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Create new studio
export const createStudio = async (req, res) => {
  try {
    const { name, location, description } = req.body;

    if (!name || !location) {
      return res.status(400).json({
        success: false,
        message: "Name and location are required",
      });
    }

    const studio = await Studio.create({
      name,
      location,
      description,
      isAvailable: true,
      isOccupied: false,
    });

    res.status(201).json({
      success: true,
      message: "Studio created successfully",
      data: studio,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Toggle studio availability (Available / Unavailable)
export const toggleStudioAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const studio = await Studio.findByIdAndUpdate(
      id,
      { isAvailable },
      { returnDocument: "after" }
    );

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found",
      });
    }

    res.json({
      success: true,
      message: `Studio is now ${isAvailable ? "Available" : "Unavailable"}`,
      data: studio,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update studio availability",
    });
  }
};

// Update studio (for future use)
export const updateStudio = async (req, res) => {
  try {
    const studio = await Studio.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true }
    );

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found",
      });
    }

    res.json({
      success: true,
      message: "Studio updated successfully",
      data: studio,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete studio
export const deleteStudio = async (req, res) => {
  try {
    const studio = await Studio.findByIdAndDelete(req.params.id);

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found",
      });
    }

    res.json({
      success: true,
      message: "Studio deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};