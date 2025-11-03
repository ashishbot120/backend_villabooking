import { Response } from 'express';
import { AuthRequest } from '../middleware/authmiddleware';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/user';
import Booking from '../models/booking';
import Villa from '../models/villa';

// Initialize Razorpay with your key and secret
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});
// 1. REFINED: createPaymentOrder
//
// @desc    Create a Razorpay order for cart checkout
// @route   POST /api/payments/create-order
export const createPaymentOrder = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id).populate('cart.villa');
        if (!user || user.cart.length === 0) {
            return res.status(400).json({ message: 'Cart is empty.' });
        }

        // ---
        // CRITICAL FIX 1: Check for date conflicts BEFORE creating the order
        // ---
        for (const item of user.cart) {
            const villa = await Villa.findById(item.villa);
            const isUnavailable = villa?.unavailability.some(range => 
                (new Date(item.checkIn) < new Date(range.endDate) && 
                 new Date(item.checkOut) > new Date(range.startDate))
            );

            if (isUnavailable) {
                return res.status(400).json({ 
                    message: `Sorry, ${villa?.title} is not available for the selected dates. Please remove it from your cart.` 
                });
            }
        }

        // All dates are available, proceed with payment
        const totalAmount = user.cart.reduce((acc, item) => acc + item.price, 0);

        const options = {
    amount: totalAmount * 100, // Amount in paise
    currency: "INR",
    // This is now 38 characters (24 + 1 + 13), which is under the 40-char limit.
    receipt: `${user._id}_${new Date().getTime()}`,
};

        const order = await razorpay.orders.create(options);

        // Temporarily create bookings with 'pending' status
        const bookingPromises = user.cart.map(item => {
            const newBooking = new Booking({
                user: user._id,
                villa: item.villa,
                checkIn: item.checkIn,
                checkOut: item.checkOut,
                guests: item.guests,
                price: item.price,
                status: 'pending', // Status is pending
                orderId: order.id, // Link booking to the Razorpay order
            });
            return newBooking.save();
        });
        const pendingBookings = await Promise.all(bookingPromises);
        const bookingIds = pendingBookings.map(b => b._id);

        res.status(200).json({
            order,
            bookingIds // Send booking IDs to the frontend
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

//
// 2. REFINED: verifyPayment
//
// @desc    Verify payment and confirm bookings
// @route   POST /api/payments/verify
export const verifyPayment = async (req: AuthRequest, res: Response) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingIds } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // ---
        // OPTIMIZATION: Update all bookings in one go
        // ---
        await Booking.updateMany(
            { _id: { $in: bookingIds } },
            { $set: { status: 'confirmed', paymentId: razorpay_payment_id } }
        );
        
        // Loop to block dates (this is fine as it's separate logic per villa)
        for (const bookingId of bookingIds) {
            const booking = await Booking.findById(bookingId); // Re-fetch to get villa ID
            if (booking) {
                await Villa.findByIdAndUpdate(booking.villa, {
                    $push: {
                        unavailability: { startDate: booking.checkIn, endDate: booking.checkOut }
                    }
                });
            }
        }
        
        // Clear the user's cart
        await User.findByIdAndUpdate(req.user!._id, { $set: { cart: [] } });

        res.status(200).json({ success: true, message: "Payment verified and bookings confirmed." });
    
    } else {
        // ---
        // CRITICAL FIX 2: Clean up pending bookings if payment fails
        // ---
        await Booking.deleteMany({ _id: { $in: bookingIds } });

        res.status(400).json({ success: false, message: "Payment verification failed." });
    }
};