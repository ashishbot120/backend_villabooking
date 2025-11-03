"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentcpntroller_1 = require("../controllers/paymentcpntroller");
const authmiddleware_1 = require("../middleware/authmiddleware"); // Make sure this path is correct
const router = express_1.default.Router();
// POST /api/payments/create-order
// (This is called when the user clicks "Pay Now")
router.post('/create-order', authmiddleware_1.protect, paymentcpntroller_1.createPaymentOrder);
// POST /api/payments/verify
// (This is called by the Razorpay success handler)
router.post('/verify', authmiddleware_1.protect, paymentcpntroller_1.verifyPayment);
exports.default = router;
