"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Schema for the unavailability subdocument
const UnavailabilitySchema = new mongoose_1.Schema({
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
});
// Main Villa Schema
const VillaSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    amenities: {
        wifi: { type: Boolean, default: false },
        pool: { type: Boolean, default: false },
        kitchen: { type: Boolean, default: false },
        ac: { type: Boolean, default: false },
        parking: { type: Boolean, default: false },
        tv: { type: Boolean, default: false },
        garden: { type: Boolean, default: false },
        bbq: { type: Boolean, default: false },
    },
    photos: [{ type: String }],
    price: {
        type: Number,
        required: true,
        min: [0, 'Price must be a positive number'],
    },
    isAvailable: { type: Boolean, default: true },
    host: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    unavailability: [UnavailabilitySchema],
    bedrooms: {
        type: Number,
        required: [true, 'Number of bedrooms is required.'],
        min: [1, 'Must have at least one bedroom.'],
    },
    bathrooms: {
        type: Number,
        required: [true, 'Number of bathrooms is required.'],
        min: [1, 'Must have at least one bathroom.'],
    },
    area: {
        type: Number,
        required: [true, 'Area of the villa is required.'],
        min: [1, 'Area must be a positive number.'],
    },
    // ← ADD THIS NEW FIELD
    guests: {
        type: Number,
        required: [true, 'Maximum number of guests is required.'],
        min: [1, 'Must accommodate at least one guest.'],
        max: [50, 'Cannot accommodate more than 50 guests.'],
    },
}, { timestamps: true });
const Villa = (0, mongoose_1.model)('Villa', VillaSchema);
exports.default = Villa;
