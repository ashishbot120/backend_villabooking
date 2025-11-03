"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyVillas = exports.aiSearchVillas = exports.addUnavailability = exports.updateVilla = exports.updateVillaAvailability = exports.deleteVilla = exports.getVillaById = exports.getAllVillas = exports.createVilla = void 0;
const villa_1 = __importDefault(require("../models/villa"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
// --- AI Search Helper Functions ---
const mongoIdToQdrantId = (id) => {
    if (id.length !== 24 || !/^[a-f0-9]{24}$/.test(id)) {
        return id;
    }
    const paddedId = id + '00000000';
    return [
        paddedId.substring(0, 8),
        paddedId.substring(8, 12),
        paddedId.substring(12, 16),
        paddedId.substring(16, 20),
        paddedId.substring(20, 32)
    ].join('-');
};
const qdrantIdToMongoId = (id) => {
    if (id.length !== 36) {
        return id;
    }
    const hex = id.replace(/-/g, '');
    return hex.substring(0, 24);
};
// --- Villa Controllers ---
const createVilla = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Not authorized, user not found.' });
        }
        const files = req.files;
        const { title, description, address, amenities, price, bedrooms, bathrooms, area, guests // ← ADD guests here
         } = req.body;
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'At least one photo is required.' });
        }
        // ← ADD validation for guests
        if (!guests || Number(guests) < 1) {
            return res.status(400).json({ message: 'Maximum guest capacity is required (minimum 1).' });
        }
        const photoUploadPromises = files.map(file => {
            const b64 = Buffer.from(file.buffer).toString("base64");
            const dataURI = `data:${file.mimetype};base64,${b64}`;
            return cloudinary_1.default.uploader.upload(dataURI, {
                folder: "villas",
            });
        });
        const uploadResults = await Promise.all(photoUploadPromises);
        const photoUrls = uploadResults.map(result => result.secure_url);
        const parsedAmenities = JSON.parse(amenities);
        const newVilla = new villa_1.default({
            title,
            description,
            address,
            amenities: parsedAmenities,
            price: Number(price),
            photos: photoUrls,
            host: userId,
            bedrooms: Number(bedrooms),
            bathrooms: Number(bathrooms),
            area: Number(area),
            guests: Number(guests), // ← ADD this line
        });
        await newVilla.save();
        // AI INDEXING BLOCK
        try {
            const aiPayload = {
                mongo_id: mongoIdToQdrantId(newVilla._id.toString()),
                name: newVilla.title || "",
                description: newVilla.description || "",
                bedrooms: newVilla.bedrooms || 0,
                amenities: Object.keys(newVilla.amenities || {})
            };
            fetch(`${process.env.AI_SERVICE_URL}/index-villa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aiPayload),
            }).catch(aiError => {
                console.error('AI Indexing Failed (async):', aiError.message);
            });
            console.log('Sent new villa to AI service for indexing.');
        }
        catch (aiError) {
            console.error('AI Indexing Failed:', aiError.message);
        }
        res.status(201).json({ message: 'Villa listed successfully!', villa: newVilla });
    }
    catch (error) {
        console.error('Error creating villa:', error);
        res.status(500).json({ message: 'Server error while creating villa.' });
    }
};
exports.createVilla = createVilla;
const getAllVillas = async (req, res) => {
    try {
        const { location, guests, date } = req.query;
        const filter = {};
        if (location) {
            filter.address = { $regex: location, $options: 'i' };
        }
        // ← UPDATE: Filter by guests field instead of bedrooms
        if (guests) {
            filter.guests = { $gte: Number(guests) };
        }
        if (date) {
            const requestedDate = new Date(date);
            filter.unavailability = {
                $not: {
                    $elemMatch: {
                        startDate: { $lte: requestedDate },
                        endDate: { $gte: requestedDate }
                    }
                }
            };
        }
        // ← ADD 'guests' to the select fields
        const villas = await villa_1.default.find(filter)
            .select('title description address photos price bedrooms bathrooms area guests amenities isAvailable unavailability host createdAt')
            .populate('host', '_id name')
            .sort({ createdAt: -1 });
        res.status(200).json(villas.length > 0 ? villas : []);
    }
    catch (error) {
        console.error('Error fetching villas:', error);
        res.status(500).json({ message: 'Server error while fetching villas.' });
    }
};
exports.getAllVillas = getAllVillas;
const getVillaById = async (req, res) => {
    try {
        const { id } = req.params;
        const villa = await villa_1.default.findById(id).populate('host', '_id name');
        if (!villa) {
            return res.status(404).json({ message: 'Villa not found.' });
        }
        res.status(200).json(villa);
    }
    catch (error) {
        console.error('Error fetching villa by ID:', error);
        res.status(500).json({ message: 'Server error while fetching villa.' });
    }
};
exports.getVillaById = getVillaById;
const deleteVilla = async (req, res) => {
    try {
        const villa = await villa_1.default.findById(req.params.id);
        if (!villa) {
            return res.status(404).json({ message: 'Villa not found' });
        }
        if (villa.host.toString() !== req.user?._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }
        await villa.deleteOne();
        // AI DELETION BLOCK
        try {
            fetch(`${process.env.AI_SERVICE_URL}/delete-villa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mongo_id: mongoIdToQdrantId(req.params.id) }),
            }).catch(aiError => {
                console.error('AI Deletion Failed (async):', aiError.message);
            });
            console.log('Sent deletion request to AI service.');
        }
        catch (aiError) {
            console.error('AI Deletion Failed:', aiError.message);
        }
        res.status(200).json({ message: 'Villa removed successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteVilla = deleteVilla;
const updateVillaAvailability = async (req, res) => {
    try {
        const villa = await villa_1.default.findById(req.params.id);
        if (!villa)
            return res.status(404).json({ message: 'Villa not found' });
        if (villa.host.toString() !== req.user?._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }
        villa.isAvailable = req.body.isAvailable;
        await villa.save();
        res.status(200).json(villa);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateVillaAvailability = updateVillaAvailability;
const updateVilla = async (req, res) => {
    try {
        const villa = await villa_1.default.findById(req.params.id);
        if (!villa) {
            return res.status(404).json({ message: 'Villa not found' });
        }
        if (villa.host.toString() !== req.user?._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }
        const { title, description, address, price, amenities, photosToDelete, bedrooms, bathrooms, area, guests // ← ADD guests here
         } = req.body;
        if (title)
            villa.title = title;
        if (description)
            villa.description = description;
        if (address)
            villa.address = address;
        if (price)
            villa.price = Number(price);
        if (amenities)
            villa.amenities = JSON.parse(amenities);
        if (bedrooms)
            villa.bedrooms = Number(bedrooms);
        if (bathrooms)
            villa.bathrooms = Number(bathrooms);
        if (area)
            villa.area = Number(area);
        if (guests)
            villa.guests = Number(guests); // ← ADD this line
        // Handle photo deletion
        if (photosToDelete) {
            const parsedPhotosToDelete = JSON.parse(photosToDelete);
            if (parsedPhotosToDelete.length > 0) {
                const publicIds = parsedPhotosToDelete.map(url => `villas/${url.split('/').pop()?.split('.')[0]}`);
                await cloudinary_1.default.api.delete_resources(publicIds);
            }
            villa.photos = villa.photos.filter(url => !parsedPhotosToDelete.includes(url));
        }
        // Handle new photo uploads
        const files = req.files;
        if (files && files.length > 0) {
            const photoUploadPromises = files.map(file => {
                const b64 = Buffer.from(file.buffer).toString("base64");
                const dataURI = `data:${file.mimetype};base64,${b64}`;
                return cloudinary_1.default.uploader.upload(dataURI, { folder: "villas" });
            });
            const uploadResults = await Promise.all(photoUploadPromises);
            const newPhotoUrls = uploadResults.map(result => result.secure_url);
            villa.photos.push(...newPhotoUrls);
        }
        const updatedVilla = await villa.save();
        await updatedVilla.populate('host', '_id name');
        const mongoId = updatedVilla._id.toString();
        // AI RE-INDEXING BLOCK
        try {
            const aiPayload = {
                mongo_id: mongoIdToQdrantId(mongoId),
                name: updatedVilla.title || "",
                description: updatedVilla.description || "",
                bedrooms: updatedVilla.bedrooms || 0,
                amenities: Object.keys(updatedVilla.amenities || {})
            };
            fetch(`${process.env.AI_SERVICE_URL}/index-villa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aiPayload),
            }).catch(aiError => {
                console.error('AI Re-indexing Failed (async):', aiError.message);
            });
            console.log('Sent updated villa to AI service for re-indexing.');
        }
        catch (aiError) {
            console.error('AI Re-indexing Failed:', aiError.message);
        }
        res.status(200).json(updatedVilla);
    }
    catch (error) {
        console.error('Error updating villa:', error);
        res.status(500).json({ message: 'Server error while updating villa' });
    }
};
exports.updateVilla = updateVilla;
const addUnavailability = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const villa = await villa_1.default.findById(req.params.id);
        if (!villa) {
            return res.status(404).json({ message: 'Villa not found.' });
        }
        if (villa.host.toString() !== req.user.id) {
            return res.status(403).json({ message: 'User not authorized.' });
        }
        villa.unavailability.push({
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        });
        await villa.save();
        res.status(200).json(villa);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};
exports.addUnavailability = addUnavailability;
const aiSearchVillas = async (req, res) => {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'A search query is required.' });
    }
    try {
        const aiResponse = await fetch(`${process.env.AI_SERVICE_URL}/search?query=${encodeURIComponent(query)}`);
        if (!aiResponse.ok) {
            const errorData = await aiResponse.json();
            console.error('AI service responded with an error:', errorData);
            throw new Error('AI service responded with an error');
        }
        const data = await aiResponse.json();
        const qdrantIds = data.ids;
        if (!qdrantIds || qdrantIds.length === 0) {
            return res.status(200).json([]);
        }
        const mongoIds = qdrantIds.map(qdrantIdToMongoId);
        const villas = await villa_1.default.find({
            '_id': { $in: mongoIds }
        });
        const sortedVillas = mongoIds.map(id => villas.find(v => v._id.toString() === id)).filter(v => v);
        res.status(200).json(sortedVillas);
    }
    catch (error) {
        console.error('Error during AI search:', error);
        res.status(500).json({ message: 'Server error during AI search.' });
    }
};
exports.aiSearchVillas = aiSearchVillas;
const getMyVillas = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authorized.' });
        }
        const villas = await villa_1.default.find({ host: userId })
            .populate('host', '_id name')
            .sort({ createdAt: -1 });
        if (!villas) {
            return res.status(200).json([]);
        }
        res.status(200).json(villas);
    }
    catch (error) {
        console.error('Error fetching host villas:', error);
        res.status(500).json({ message: 'Server error while fetching your villas.' });
    }
};
exports.getMyVillas = getMyVillas;
