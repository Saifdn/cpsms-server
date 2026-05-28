import * as shipmentService from "../services/shipmentService.js";

export const getPendingShipments = async (req, res, next) => {
  try {
    const result = await shipmentService.getPendingShipments(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getSubmittedShipments = async (req, res, next) => {
  try {
    const result = await shipmentService.getSubmittedShipments(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getQuotation = async (req, res, next) => {
  try {
    const result = await shipmentService.getQuotation(req.body.bookingIds, req.epToken);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const submitOrder = async (req, res, next) => {
  try {
    const { successCount, processed, results } = await shipmentService.submitOrder(req.body, req.epToken);
    res.json({
      success: true,
      message: `Successfully submitted ${successCount} orders to EasyParcel`,
      processed,
      successCount,
      results,
    });
  } catch (err) {
    next(err);
  }
};

export const getWalletBalance = async (req, res, next) => {
  try {
    const data = await shipmentService.getWalletBalance(req.epToken);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
