"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const CartItemSchema = new mongoose_1.Schema({
    villa: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Villa', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, required: true },
    price: { type: Number, required: true },
});
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: false,
        select: false,
    },
    phone: {
        type: String,
        required: true,
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    profilePicture: {
        type: String,
    },
    // ✨ 2. Add userType to the schema
    userType: {
        type: String,
        enum: ["user", "host"], // Only allows these two values
        default: "user", // New users will be 'user' by default
        required: true,
    },
    cart: [CartItemSchema],
}, { timestamps: true });
// Pre-save hook to hash password if it's provided/modified
userSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this.password) {
        return next();
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    this.password = await bcryptjs_1.default.hash(this.password, salt);
    next();
});
const User = (0, mongoose_1.model)("User", userSchema);
exports.default = User;
