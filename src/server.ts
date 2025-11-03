import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db';
import authRoutes from './routes/authroute';
import paymentRoutes from './routes/paymentroutes';
import bookingRoutes from './routes/bookingroutes';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`\n❌ FATAL ERROR: Environment variable ${varName} is not defined.\n`);
    process.exit(1);
  }
}

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS Setup ---
app.use(cors({
  origin: "http://localhost:3000", // frontend URL
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// --- Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use((req, _res, next) => {
  console.log('Cookie header:', req.headers.cookie);
  console.log('req.cookies:', req.cookies);
  next();
});


// --- Routes ---
// ✅ This is the single, correct way to mount your routes.
app.use('/api', authRoutes); 

app.use('/api/payments', paymentRoutes);

app.use('/api/bookings', bookingRoutes);

// --- Start Server ---
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));