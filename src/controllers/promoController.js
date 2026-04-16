import PromoAd from "../models/PromoAd.js";

export const getAllPromoAds = async (req, res) => {
  try {
    const promos = await PromoAd.find().sort({ createdAt: -1 });
    res.json({ success: true, count: promos.length, data: promos });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createPromoAd = async (req, res) => {
  try {
    const { name, description } = req.body;

    // check image
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    // convert buffer → base64
    const imageBase64 =
  `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const promo = await PromoAd.create({
      name,
      description,
      imageBase64,
    });

    res.status(201).json({
      success: true,
      message: "Promo Ad created successfully",
      data: promo,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deletePromoAd = async (req, res) => {
  try {
    const promo = await PromoAd.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!promo) return res.status(404).json({ success: false, message: "Promo Ad not found" });
    res.json({ success: true, message: "Promo Ad deactivated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};