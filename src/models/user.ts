import { Schema, model, type Document } from "mongoose"
import bcrypt from "bcryptjs"

export interface ICartItem {
  villa: Schema.Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  price: number;
}

// Interface representing a document in MongoDB.
export interface IUser extends Document {
  _id: string
  name: string
  email: string
  password?: string
  phone: string
  googleId?: string
  profilePicture?: string
  userType: "user" | "host" // ✨ 1. Add userType to the interface
  cart: ICartItem[];
}

const CartItemSchema = new Schema<ICartItem>({
    villa: { type: Schema.Types.ObjectId, ref: 'Villa', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, required: true },
    price: { type: Number, required: true },
});

const userSchema = new Schema<IUser>(
  {
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
  },
  { timestamps: true },
)

// Pre-save hook to hash password if it's provided/modified
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next()
  }
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

const User = model<IUser>("User", userSchema)

export default User
