import { Request, Response } from 'express';
import User, { IUser } from '../models/user';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { AuthRequest } from '../middleware/authmiddleware';
import Booking from '../models/booking'; 
import Villa from '../models/villa'; 

type UserWithPassword = IUser & { password: string };

/**
 * Helper function to generate a JWT and set it as an HTTP-Only cookie.
 */
export const generateTokenAndSetCookie = (res: Response, userId: string) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "30d" });
    const isProd = process.env.NODE_ENV === "production";

    console.log('=== COOKIE GENERATION DEBUG ===');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Token generated for userId:', userId);

    const cookieOptions = {
        httpOnly: true,
        // ✅ Secure must be true on Vercel
        secure: isProd, 
        // ✅ SameSite 'none' is required for cross-site/proxy cookies
        sameSite: isProd ? ("none" as const) : ("lax" as const), 
        path: "/",
        // ❌ REMOVED DOMAIN: Letting the browser infer the domain is safer
        maxAge: 30 * 24 * 60 * 60 * 1000, 
    };

    console.log('Cookie options:', cookieOptions);

    res.cookie("token", token, cookieOptions);

    console.log('✅ Cookie set successfully');
    console.log('=== END COOKIE DEBUG ===\n');

    (res as any).locals = { ...(res as any).locals, token };
};

export const logout = (res: Response) => {
    const isProd = process.env.NODE_ENV === "production";
    
    res.clearCookie("token", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? ("none" as const) : ("lax" as const),
        path: "/",
    });
    res.status(200).json({ message: "Logged out successfully" });
};

/**
 * Controller for local user signup (email/password).
 */
export const signup = async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ msg: 'User with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword, 
            phone,
        });

        if (newUser) {
            await newUser.save();
            generateTokenAndSetCookie(res, newUser._id.toString());

            res.status(201).json({
                user: {
                    id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    userType: newUser.userType,
                }
            });
        } else {
            res.status(400).json({ msg: 'Invalid user data' });
        }
    } catch (error: any) {
        res.status(500).json({ msg: error.message || 'An unexpected error occurred during signup.' });
    }
};

/**
 * Controller for local user login (email/password).
 */
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password') as UserWithPassword | null;

        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials. User not found.' });
        }

        if (!user.password) {
            return res.status(400).json({ 
                msg: 'This account was created using a social provider. Please log in with Google.',
                socialAccount: true 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials. Password does not match.' });
        }

        generateTokenAndSetCookie(res, user._id.toString());

        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
            }
        });

    } catch (error: any) {
        res.status(500).json({ msg: error.message || 'An unexpected error occurred during login.' });
    }
};

/**
 * Controller for Google Sign-In.
 */
export const googleSignIn = async (req: Request, res: Response) => {
    try {
        const code = req.body.token;
        // ✅ Get redirectUri from frontend if available
        const redirectUri = req.body.redirectUri; 

        if (!code) {
            return res.status(400).json({ msg: 'Authorization code not provided.' });
        }

        // ✅ Use dynamic redirect URI logic
        const oAuth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            redirectUri || (process.env.NODE_ENV === 'production' 
                ? 'https://frontend-villabooking.vercel.app/auth/google/callback' 
                : 'http://localhost:3000/auth/google/callback')
        );

        const { tokens } = await oAuth2Client.getToken({ code });

        if (!tokens.access_token) {
            throw new Error("Failed to retrieve access token from Google.");
        }

        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info from Google.');
        }

        const googleUser = await response.json();
        const { sub, email, name, picture } = googleUser;

        let user = await User.findOne({ email });

        if (user) {
            if (!user.googleId) {
                user.googleId = sub;
                await user.save();
            }
        } else {
            user = new User({
                googleId: sub,
                name,
                email,
                profilePicture: picture,
                phone: '000-000-0000', 
            });
            await user.save();
        }

        generateTokenAndSetCookie(res, user._id.toString());
        res.status(200).json({
            message: "Authentication successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                picture: user.profilePicture,
            },
            token: (res as any).locals?.token,
        });
    } catch (error: any) {
        console.error("Google Sign-In Error:", error);
        res.status(500).json({ msg: error.message || "Google sign-in failed." });
    }
}

export const updateUserRole = async (req: AuthRequest, res: Response) => {
    try {
        const { userType } = req.body;
        const userId = req.user?._id; 

        if (!userId) {
            return res.status(401).json({ message: 'Not authorized.' });
        }

        if (userType !== 'host' && userType !== 'user') {
            return res.status(400).json({ message: 'Invalid user type specified.' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.userType = userType.toLowerCase();
        await user.save();

        const updatedUser = {
            id: user._id,
            name: user.name,
            email: user.email,
            userType: user.userType,
        };

        res.status(200).json({ message: `User role updated to ${userType}`, user: updatedUser });

    } catch (error: any) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Server error while updating role.' });
    }
};

// --- Cart Controllers ---
export const getCart = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id).populate({
            path: 'cart.villa',
            model: 'Villa'
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user.cart);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const addToCart = async (req: AuthRequest, res: Response) => {
    try {
        const { villaId, checkIn, checkOut, guests, price } = req.body;
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.cart.push({ villa: villaId, checkIn, checkOut, guests, price });
        await user.save();
        res.status(200).json(user.cart);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const removeFromCart = async (req: AuthRequest, res: Response) => {
    try {
        const { itemId } = req.params;
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.cart = user.cart.filter(item => (item as any)._id.toString() !== itemId);
        await user.save();
        res.status(200).json(user.cart);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const checkoutCart = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id);
        if (!user || user.cart.length === 0) {
            return res.status(400).json({ message: 'Cart is empty or user not found' });
        }

        for (const item of user.cart) {
            const newBooking = new Booking({
                user: user._id,
                villa: item.villa,
                checkIn: item.checkIn,
                checkOut: item.checkOut,
                guests: item.guests,
                price: item.price,
            });
            await newBooking.save();

            await Villa.findByIdAndUpdate(item.villa, {
                $push: {
                    unavailability: { startDate: item.checkIn, endDate: item.checkOut }
                }
            });
        }

        user.cart = [];
        await user.save();

        res.status(200).json({ message: 'Checkout successful! All items have been booked.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error during checkout' });
    }
};