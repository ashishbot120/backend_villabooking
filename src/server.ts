import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db';
import authRoutes from './routes/authroute';
import paymentRoutes from './routes/paymentroutes';
import bookingRoutes from './routes/bookingroutes';

// Load env vars (safe for both local and Vercel)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS Setup (FIXED) ---
// Origin must be an array of strings, not a single string with "||"
app.use(cors({
  origin: ["http://localhost:3000", "https://frontend-villabooking.vercel.app"],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// --- Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Debugging Middleware (Optional: remove in production if too noisy)
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// --- Database Connection ---
// Only connect if we haven't already (important for serverless hot-reloads)
connectDB();

// --- Routes ---
app.use('/api', authRoutes); 
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);

// --- Health Check Route (Good for debugging Vercel) ---
app.get('/', (req, res) => {
  res.send('API is running...');
});

// --- Server Startup (FIXED FOR VERCEL) ---
// Only listen on a port if we are NOT in a Vercel serverless environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`✅ Server running locally on http://localhost:${PORT}`));
}

// Export the app for Vercel
export default app;