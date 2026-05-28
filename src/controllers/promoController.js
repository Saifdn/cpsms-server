import * as promoService from "../services/promoService.js";

export const getAllPromoAds = async (req, res, next) => {
  try {
    const data = await promoService.listPromoAds();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const createPromoAd = async (req, res, next) => {
  try {
    const data = await promoService.createPromoAd(req.body, req.file);
    res.status(201).json({ success: true, message: "Promo Ad created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const updatePromoAd = async (req, res, next) => {
  try {
    const data = await promoService.updatePromoAd(req.params.id, req.body, req.file);
    res.json({ success: true, message: "Promo Ad updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const deletePromoAd = async (req, res, next) => {
  try {
    await promoService.deletePromoAd(req.params.id);
    res.json({ success: true, message: "Promo Ad deleted successfully" });
  } catch (err) {
    next(err);
  }
};
