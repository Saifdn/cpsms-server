import * as paymentService from "../services/paymentService.js";

export const getPaymentById = async (req, res, next) => {
  try {
    const data = await paymentService.getPaymentById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getPaymentStatusById = async (req, res, next) => {
  try {
    const data = await paymentService.getPaymentStatus(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
