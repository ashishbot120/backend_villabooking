import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/user';

export interface AuthRequest extends Request {
  user?: IUser;
  token?: string;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // ✅ DEBUG: Log everything to see what's happening
  console.log('=== AUTH MIDDLEWARE DEBUG ===');
  console.log('Cookies received:', req.cookies);
  console.log('Cookie header:', req.headers.cookie);
  console.log('Authorization header:', req.headers.authorization);

  // 1. Check for token in httpOnly cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    console.log('✅ Token found in cookies');
  } 
  // 2. Fallback to Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('✅ Token found in Authorization header');
    } catch (error) {
      console.log('❌ Invalid Authorization header format');
      return res.status(401).json({ message: 'Not authorized, token format is invalid' });
    }
  }

  if (!token) {
    console.log('❌ No token found in cookies or headers');
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    console.log('Token to verify:', token.substring(0, 20) + '...');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

    // 3. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    console.log('✅ Token verified, userId:', decoded.userId);

    // 4. Find user and attach to request
    req.user = await User.findById(decoded.userId).select('-password');
    
    if (!req.user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    console.log('✅ User authenticated:', req.user.email);
    console.log('=== END AUTH DEBUG ===\n');

    // 5. Proceed to next middleware/controller
    next();
  } catch (error: any) {
    console.error("❌ Token verification failed:", error.message);
    console.log('=== END AUTH DEBUG ===\n');
    res.status(401).json({ message: 'Not authorized, token failed', error: error.message });
  }
};