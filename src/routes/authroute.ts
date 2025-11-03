import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authmiddleware';

// 1. IMPORT FROM YOUR NEW, SPLIT CONTROLLERS
import { 
    signup, 
    login, 
    googleSignIn, 
    logout, 
    updateUserRole,
    getCart, 
    addToCart, 
    removeFromCart, 
    checkoutCart 
} from '../controllers/authcontroller';

import { 
    createVilla, 
    getAllVillas, 
    getVillaById, 
    deleteVilla, 
    updateVillaAvailability,
    updateVilla, 
    addUnavailability,
    aiSearchVillas,
    getMyVillas
} from '../controllers/villacontroller'; 

import { 
    getMyBookings,
    createBooking 
} from '../controllers/bookingcontroller';

const router = express.Router();

// --- Storage Setup ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- Auth Routes ( /api/... ) ---
router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleSignIn);
router.post("/logout", logout);
router.patch('/users/update-role', protect, updateUserRole);

// --- Villa Routes ( /api/villas/... ) ---

// GET /api/villas (Get all villas)
router.get('/villas', getAllVillas); 

// GET /api/villas/ai-search
// Specific route, MUST be before /:id
router.get('/villas/ai-search', aiSearchVillas); 

//
// ✅✅✅ THIS IS THE FIX ✅✅✅
//
// GET /api/villas/my-listings
// This route was in the wrong place. It needs to start with /villas/
// and MUST come BEFORE /villas/:id
//
router.get('/villas/my-listings', protect, getMyVillas);
//
// ✅✅✅ END OF FIX ✅✅✅
//

// GET /api/villas/:id (Get one villa)
// Dynamic route, MUST be after specific routes
router.get('/villas/:id', getVillaById); 

// --- Other Villa Routes ---
router.post('/villas', protect, upload.array('photos', 10), createVilla); // POST /api/villas
router.put('/villas/:id', protect, upload.array('photos', 10), updateVilla); // PUT /api/villas/:id
router.delete('/villas/:id', protect, deleteVilla); // DELETE /api/villas/:id
router.patch('/villas/:id/availability', protect, updateVillaAvailability); // PATCH /api/villas/:id/availability
router.post('/villas/:id/unavailability', protect, addUnavailability); // POST /api/villas/:id/unavailability

// --- Booking Routes ( /api/... ) ---
router.post('/bookings', protect, createBooking); // POST /api/bookings
router.get('/mybookings', protect, getMyBookings); // GET /api/mybookings

// --- Cart Routes ( /api/cart/... ) ---
router.route('/cart') // GET & POST /api/cart
    .get(protect, getCart)
    .post(protect, addToCart);

router.route('/cart/checkout') // POST /api/cart/checkout
    .post(protect, checkoutCart);

router.route('/cart/:itemId') // DELETE /api/cart/:itemId
    .delete(protect, removeFromCart);

export default router;