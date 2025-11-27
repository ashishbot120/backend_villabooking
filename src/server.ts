import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
// Ensure you have this file or replace with direct connection logic if needed
import connectDB from './config/db'; 
import authRoutes from './routes/authroute';
import paymentRoutes from './routes/paymentroutes';
import bookingRoutes from './routes/bookingroutes';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CRITICAL FIX: Trust Vercel's Proxy
// This allows 'secure: true' cookies to work behind the load balancer
app.set('trust proxy', 1);

// --- CORS Setup ---
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "https://frontend-villabooking.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// --- Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Debugging Middleware
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// --- Database Connection ---
// If connectDB is a function that connects to mongo, call it here.
// Or use the mongoose.connect pattern if you prefer.
connectDB();

// --- Routes ---
app.use('/api', authRoutes); 
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);

// --- Health Check ---
app.get('/', (req, res) => {
  res.send('API is running...');
});

// --- Server Startup ---
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`✅ Server running locally on http://localhost:${PORT}`));
}

export default app;