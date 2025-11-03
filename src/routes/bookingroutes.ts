import express from 'express';
import { 
    getMyBookings, 
    createBooking, 
    getBookingById 
} from '../controllers/bookingcontroller';
import { protect } from '../middleware/authmiddleware';

const router = express.Router();

// @route   GET /api/bookings/mybookings
// @desc    Get all bookings for the logged-in user
router.get('/mybookings', protect, getMyBookings);

// @route   POST /api/bookings
// @desc    Create a new booking
router.post('/', protect, createBooking);

// @route   GET /api/bookings/:id
// @desc    Get a single booking by its ID
// @note    This MUST be last, after '/mybookings'
router.get('/:id', protect, getBookingById);

export default router;