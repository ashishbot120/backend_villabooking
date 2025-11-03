"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bookingcontroller_1 = require("../controllers/bookingcontroller");
const authmiddleware_1 = require("../middleware/authmiddleware");
const router = express_1.default.Router();
// @route   GET /api/bookings/mybookings
// @desc    Get all bookings for the logged-in user
router.get('/mybookings', authmiddleware_1.protect, bookingcontroller_1.getMyBookings);
// @route   POST /api/bookings
// @desc    Create a new booking
router.post('/', authmiddleware_1.protect, bookingcontroller_1.createBooking);
// @route   GET /api/bookings/:id
// @desc    Get a single booking by its ID
// @note    This MUST be last, after '/mybookings'
router.get('/:id', authmiddleware_1.protect, bookingcontroller_1.getBookingById);
exports.default = router;
