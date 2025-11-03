"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const authmiddleware_1 = require("../middleware/authmiddleware");
// 1. IMPORT FROM YOUR NEW, SPLIT CONTROLLERS
const authcontroller_1 = require("../controllers/authcontroller");
const villacontroller_1 = require("../controllers/villacontroller");
const bookingcontroller_1 = require("../controllers/bookingcontroller");
const router = express_1.default.Router();
// --- Storage Setup ---
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
// --- Auth Routes ( /api/... ) ---
router.post('/signup', authcontroller_1.signup);
router.post('/login', authcontroller_1.login);
router.post('/google', authcontroller_1.googleSignIn);
router.post("/logout", authcontroller_1.logout);
router.patch('/users/update-role', authmiddleware_1.protect, authcontroller_1.updateUserRole);
// --- Villa Routes ( /api/villas/... ) ---
// GET /api/villas (Get all villas)
router.get('/villas', villacontroller_1.getAllVillas);
// GET /api/villas/ai-search
// Specific route, MUST be before /:id
router.get('/villas/ai-search', villacontroller_1.aiSearchVillas);
//
// ✅✅✅ THIS IS THE FIX ✅✅✅
//
// GET /api/villas/my-listings
// This route was in the wrong place. It needs to start with /villas/
// and MUST come BEFORE /villas/:id
//
router.get('/villas/my-listings', authmiddleware_1.protect, villacontroller_1.getMyVillas);
//
// ✅✅✅ END OF FIX ✅✅✅
//
// GET /api/villas/:id (Get one villa)
// Dynamic route, MUST be after specific routes
router.get('/villas/:id', villacontroller_1.getVillaById);
// --- Other Villa Routes ---
router.post('/villas', authmiddleware_1.protect, upload.array('photos', 10), villacontroller_1.createVilla); // POST /api/villas
router.put('/villas/:id', authmiddleware_1.protect, upload.array('photos', 10), villacontroller_1.updateVilla); // PUT /api/villas/:id
router.delete('/villas/:id', authmiddleware_1.protect, villacontroller_1.deleteVilla); // DELETE /api/villas/:id
router.patch('/villas/:id/availability', authmiddleware_1.protect, villacontroller_1.updateVillaAvailability); // PATCH /api/villas/:id/availability
router.post('/villas/:id/unavailability', authmiddleware_1.protect, villacontroller_1.addUnavailability); // POST /api/villas/:id/unavailability
// --- Booking Routes ( /api/... ) ---
router.post('/bookings', authmiddleware_1.protect, bookingcontroller_1.createBooking); // POST /api/bookings
router.get('/mybookings', authmiddleware_1.protect, bookingcontroller_1.getMyBookings); // GET /api/mybookings
// --- Cart Routes ( /api/cart/... ) ---
router.route('/cart') // GET & POST /api/cart
    .get(authmiddleware_1.protect, authcontroller_1.getCart)
    .post(authmiddleware_1.protect, authcontroller_1.addToCart);
router.route('/cart/checkout') // POST /api/cart/checkout
    .post(authmiddleware_1.protect, authcontroller_1.checkoutCart);
router.route('/cart/:itemId') // DELETE /api/cart/:itemId
    .delete(authmiddleware_1.protect, authcontroller_1.removeFromCart);
exports.default = router;
