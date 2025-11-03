"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = __importDefault(require("./config/db"));
const authroute_1 = __importDefault(require("./routes/authroute"));
const paymentroutes_1 = __importDefault(require("./routes/paymentroutes"));
const bookingroutes_1 = __importDefault(require("./routes/bookingroutes"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        console.error(`\n❌ FATAL ERROR: Environment variable ${varName} is not defined.\n`);
        process.exit(1);
    }
}
(0, db_1.default)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// --- CORS Setup ---
app.use((0, cors_1.default)({
    origin: "http://localhost:3000", // frontend URL
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
// --- Middleware ---
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
app.use((req, _res, next) => {
    console.log('Cookie header:', req.headers.cookie);
    console.log('req.cookies:', req.cookies);
    next();
});
// --- Routes ---
// ✅ This is the single, correct way to mount your routes.
app.use('/api', authroute_1.default);
app.use('/api/payments', paymentroutes_1.default);
app.use('/api/bookings', bookingroutes_1.default);
// --- Start Server ---
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
