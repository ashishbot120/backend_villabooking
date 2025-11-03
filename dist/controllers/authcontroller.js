"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutCart = exports.removeFromCart = exports.addToCart = exports.getCart = exports.updateUserRole = exports.googleSignIn = exports.login = exports.signup = exports.logout = exports.generateTokenAndSetCookie = void 0;
const user_1 = __importDefault(require("../models/user"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
const booking_1 = __importDefault(require("../models/booking")); // Needed for checkout
const villa_1 = __importDefault(require("../models/villa")); // Needed for checkout
/**
 * Helper function to generate a JWT and set it as an HTTP-Only cookie.
 */
const generateTokenAndSetCookie = (res, userId) => {
    const token = jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const isProd = process.env.NODE_ENV === "production";
    console.log('=== COOKIE GENERATION DEBUG ===');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Token generated for userId:', userId);
    const cookieOptions = {
        httpOnly: true,
        secure: isProd, // false in development (http)
        sameSite: isProd ? "none" : "lax",
        path: "/",
        domain: isProd ? "your-production-domain.com" : undefined, // ✅ Use undefined for localhost
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    console.log('Cookie options:', cookieOptions);
    res.cookie("token", token, cookieOptions);
    console.log('✅ Cookie set successfully');
    console.log('=== END COOKIE DEBUG ===\n');
    // Store token in res.locals for potential use in response
    res.locals = { ...res.locals, token };
};
exports.generateTokenAndSetCookie = generateTokenAndSetCookie;
const logout = (res) => {
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        domain: isProd ? "your-production-domain.com" : undefined,
    });
};
exports.logout = logout;
/**
 * Controller for local user signup (email/password).
 */
const signup = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        // 1. Check if user already exists
        const userExists = await user_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ msg: 'User with this email already exists.' });
        }
        // 2. Hash the password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // 3. Create the new user with the hashed password
        const newUser = new user_1.default({
            name,
            email,
            password: hashedPassword, // Store the hashed password
            phone,
            // userType defaults to 'user' based on your User model
        });
        if (newUser) {
            await newUser.save();
            // 4. Log the user in immediately by generating a token
            (0, exports.generateTokenAndSetCookie)(res, newUser._id.toString());
            res.status(201).json({
                user: {
                    id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    userType: newUser.userType,
                }
            });
        }
        else {
            res.status(400).json({ msg: 'Invalid user data' });
        }
    }
    catch (error) {
        res.status(500).json({ msg: error.message || 'An unexpected error occurred during signup.' });
    }
};
exports.signup = signup;
/**
 * Controller for local user login (email/password).
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await user_1.default.findOne({ email }).select('+password');
        if (!user) {
            console.log(`Login attempt failed: User not found for email ${email}`);
            return res.status(400).json({ msg: 'Invalid credentials. User not found.' });
        }
        if (!user.password) {
            return res.status(400).json({
                msg: 'This account was created using a social provider. Please log in with Google.',
                socialAccount: true
            });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        // --- For Debugging ---
        if (!isMatch) {
            console.log(`Login attempt failed: Password mismatch for email ${email}`);
            return res.status(400).json({ msg: 'Invalid credentials. Password does not match.' });
        }
        // --------------------
        (0, exports.generateTokenAndSetCookie)(res, user._id.toString());
        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
            }
        });
    }
    catch (error) {
        res.status(500).json({ msg: error.message || 'An unexpected error occurred during login.' });
    }
};
exports.login = login;
/**
 * Controller for Google Sign-In (handles both login and signup).
 */
const googleSignIn = async (req, res) => {
    try {
        const code = req.body.token;
        if (!code) {
            return res.status(400).json({ msg: 'Authorization code not provided.' });
        }
        const oAuth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 
        // This URI must exactly match what's in your Google Cloud Console
        'http://localhost:3000/auth/google/callback');
        const { tokens } = await oAuth2Client.getToken({ code });
        if (!tokens.access_token) {
            throw new Error("Failed to retrieve access token from Google.");
        }
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch user info from Google.');
        }
        const googleUser = await response.json();
        const { sub, email, name, picture } = googleUser;
        let user = await user_1.default.findOne({ email });
        if (user) {
            if (!user.googleId) {
                user.googleId = sub;
                await user.save();
            }
        }
        else {
            user = new user_1.default({
                googleId: sub,
                name,
                email,
                profilePicture: picture,
                phone: '000-000-0000', // Placeholder
            });
            await user.save();
        }
        (0, exports.generateTokenAndSetCookie)(res, user._id.toString());
        res.status(200).json({
            message: "Authentication successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                picture: user.profilePicture,
            },
            token: res.locals?.token,
        });
    }
    catch (error) {
        console.error("Google Sign-In Error:", error);
        res.status(500).json({ msg: error.message || "Google sign-in failed." });
    }
};
exports.googleSignIn = googleSignIn;
const updateUserRole = async (req, res) => {
    try {
        const { userType } = req.body;
        const userId = req.user?._id; // Get user ID from the 'protect' middleware
        if (!userId) {
            return res.status(401).json({ message: 'Not authorized.' });
        }
        if (userType !== 'host' && userType !== 'user') {
            return res.status(400).json({ message: 'Invalid user type specified.' });
        }
        const user = await user_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        user.userType = userType.toLowerCase();
        await user.save();
        // Return the updated user object (without password)
        const updatedUser = {
            id: user._id,
            name: user.name,
            email: user.email,
            userType: user.userType,
        };
        res.status(200).json({ message: `User role updated to ${userType}`, user: updatedUser });
    }
    catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Server error while updating role.' });
    }
};
exports.updateUserRole = updateUserRole;
// --- Cart Controllers ---
const getCart = async (req, res) => {
    try {
        const user = await user_1.default.findById(req.user._id).populate({
            path: 'cart.villa',
            model: 'Villa'
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user.cart);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.getCart = getCart;
// @desc    Add item to cart
// @route   POST /api/cart
const addToCart = async (req, res) => {
    try {
        const { villaId, checkIn, checkOut, guests, price } = req.body;
        const user = await user_1.default.findById(req.user._id);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        user.cart.push({ villa: villaId, checkIn, checkOut, guests, price });
        await user.save();
        res.status(200).json(user.cart);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.addToCart = addToCart;
// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
const removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;
        const user = await user_1.default.findById(req.user._id);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        user.cart = user.cart.filter(item => item._id.toString() !== itemId);
        await user.save();
        res.status(200).json(user.cart);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.removeFromCart = removeFromCart;
// @desc    Checkout all items in cart and create bookings
// @route   POST /api/cart/checkout
const checkoutCart = async (req, res) => {
    try {
        const user = await user_1.default.findById(req.user._id);
        if (!user || user.cart.length === 0) {
            return res.status(400).json({ message: 'Cart is empty or user not found' });
        }
        // Create bookings and update villa availability for all items
        for (const item of user.cart) {
            // Create the booking
            const newBooking = new booking_1.default({
                user: user._id,
                villa: item.villa,
                checkIn: item.checkIn,
                checkOut: item.checkOut,
                guests: item.guests,
                price: item.price,
            });
            await newBooking.save();
            // Mark dates as unavailable on the villa
            await villa_1.default.findByIdAndUpdate(item.villa, {
                $push: {
                    unavailability: { startDate: item.checkIn, endDate: item.checkOut }
                }
            });
        }
        // Clear the user's cart
        user.cart = [];
        await user.save();
        res.status(200).json({ message: 'Checkout successful! All items have been booked.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error during checkout' });
    }
};
exports.checkoutCart = checkoutCart;
