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

export const mergeAwb = async (req, res, next) => {
  try {
    const bytes = await shipmentService.mergeAwbPdfs(req.body.shipmentIds);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="awb-labels.pdf"',
      "Content-Length": bytes.length,
    });
    res.send(Buffer.from(bytes));
  } catch (err) {
    next(err);
  }
};

export const getFrameOrderPendingShipments = async (req, res, next) => {
  try {
    const result = await shipmentService.getFrameOrderPendingShipments(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getFrameOrderSubmittedShipments = async (req, res, next) => {
  try {
    const result = await shipmentService.getFrameOrderSubmittedShipments(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getFrameOrderQuotation = async (req, res, next) => {
  try {
    const result = await shipmentService.getFrameOrderQuotation(req.body.frameOrderIds, req.epToken);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const submitFrameOrderShipment = async (req, res, next) => {
  try {
    const { successCount, processed, results } = await shipmentService.submitFrameOrderShipment(req.body, req.epToken);
    res.json({
      success: true,
      message: `Successfully submitted ${successCount} frame orders to EasyParcel`,
      processed,
      successCount,
      results,
    });
  } catch (err) {
    next(err);
  }
};

export const mergeFrameOrderAwb = async (req, res, next) => {
  try {
    const bytes = await shipmentService.mergeFrameOrderAwbPdfs(req.body.frameOrderIds);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="awb-labels.pdf"',
      "Content-Length": bytes.length,
    });
    res.send(Buffer.from(bytes));
  } catch (err) {
    next(err);
  }
};
