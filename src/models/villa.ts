import { Document, Schema, model } from 'mongoose';

// Defines the plain data structure for an unavailability period
interface IUnavailabilityData {
  startDate: Date;
  endDate: Date;
}

// Defines the Mongoose Subdocument type
export interface IUnavailability extends IUnavailabilityData, Document {}

// Defines the main Villa Document interface
export interface IVilla extends Document {
  title: string;
  description: string;
  address: string;
  amenities: { [key: string]: boolean };
  photos: string[];
  price: number;
  host: Schema.Types.ObjectId;
  isAvailable: boolean;
  unavailability: IUnavailabilityData[];
  bedrooms: number;
  bathrooms: number;
  area: number;
  guests: number; // ← ADD THIS - Max guests allowed
}

// Schema for the unavailability subdocument
const UnavailabilitySchema = new Schema<IUnavailabilityData>({
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
});

// Main Villa Schema
const VillaSchema = new Schema<IVilla>({
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
  host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

const Villa = model<IVilla>('Villa', VillaSchema);
export default Villa;