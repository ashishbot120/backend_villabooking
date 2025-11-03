import express from 'express';
import { createPaymentOrder, verifyPayment } from '../controllers/paymentcpntroller';
import { protect } from '../middleware/authmiddleware'; // Make sure this path is correct

const router = express.Router();

// POST /api/payments/create-order
// (This is called when the user clicks "Pay Now")
router.post('/create-order', protect, createPaymentOrder);

// POST /api/payments/verify
// (This is called by the Razorpay success handler)
router.post('/verify', protect, verifyPayment);

export default router;