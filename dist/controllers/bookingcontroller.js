"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBooking = exports.getBookingById = exports.getMyBookings = void 0;
const booking_1 = __importDefault(require("../models/booking")); // Your Mongoose Booking model
const villa_1 = __importDefault(require("../models/villa")); // Your Mongoose Villa model
/**
 * @desc    Get all bookings for the logged-in user
 * @route   GET /api/bookings/mybookings
 */
const getMyBookings = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authorized.' });
        }
        const bookings = await booking_1.default.find({ user: userId })
            .populate({
            path: 'villa',
            select: 'title address photos', // Only select fields you need for the list
        })
            .sort({ checkIn: 1 }); // Sort by upcoming check-in date
        res.status(200).json(bookings);
    }
    catch (error) {
        console.error('Error fetching my bookings:', error);
        res.status(500).json({ message: 'Server error while fetching bookings.' });
    }
};
exports.getMyBookings = getMyBookings;
/**
 * @desc    Get a single booking by its ID
 * @route   GET /api/bookings/:id
 */
const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authorized.' });
        }
        const booking = await booking_1.default.findById(id)
            .populate('villa') // Populates all villa details
            .populate('user', 'name email'); // Populates booker's name and email
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }
        // --- SECURITY CHECK ---
        // Make sure the logged-in user is the one who made the booking
        // Or, you could add: || req.user.role === 'admin'
        if (booking.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to this booking.' });
        }
        res.status(200).json(booking);
    }
    catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Booking not found (invalid ID).' });
        }
        console.error('Error fetching booking by ID:', error);
        res.status(500).json({ message: 'Server error while fetching booking.' });
    }
};
exports.getBookingById = getBookingById;
/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 */
const createBooking = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { villaId, checkIn, checkOut, guests, price } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'User not authorized.' });
        }
        // --- Add booking logic here ---
        // 1. Check if villa exists
        const villa = await villa_1.default.findById(villaId);
        if (!villa) {
            return res.status(404).json({ message: 'Villa not found.' });
        }
        // 2. Check for date availability (you'd have more complex logic here)
        // 3. Create new booking
        const newBooking = new booking_1.default({
            user: userId,
            villa: villaId,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            guests,
            price,
            status: 'confirmed' // or 'pending' if you have a payment step
        });
        await newBooking.save();
        res.status(201).json(newBooking);
    }
    catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Server error while creating booking.' });
    }
};
exports.createBooking = createBooking;
