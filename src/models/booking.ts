import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking extends Document {
  villa: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  price: number;
   status: 'pending' | 'confirmed' | 'cancelled'; 
   paymentId?: string;
}

const bookingSchema: Schema = new Schema({
  villa: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Villa' },
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { type: Number, required: true },
  price: { type: Number, required: true },
   status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending', // Default to pending until payment is confirmed
  },
  paymentId: { type: String },
}, { timestamps: true });

export default mongoose.model<IBooking>('Booking', bookingSchema);
