import { v2 as cloudinary } from 'cloudinary';

// ✨ FIX 2: REMOVE the dotenv.config() call from this file.
// The variables are already loaded by server.ts.

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

export default cloudinary;