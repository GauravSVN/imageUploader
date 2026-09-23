// ==========================================
// MODELS/IMAGE.JS - MongoDB Image Schema (Enhanced with Security & Analytics)
// ==========================================
// Yeh Mongoose Schema define karta hai ki database mein har photo ki kya details save hongi.

const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  // Unique Identifier string
  id: { type: String, required: true },

  // Asli file ka naam jo user ne upload ki thi (e.g., 'profile_pic.png')
  originalName: { type: String, required: true },

  // Unique file name jo system server par save karega (e.g., 'img-1729000-xyz.webp')
  fileName: { type: String, required: true },

  // Storage Mode: 'cloud' (Online ImgBB link) ya 'local' (Computer Disk storage)
  storageType: { 
    type: String, 
    enum: ['cloud', 'local'], 
    default: 'cloud' 
  },

  // Agar Online Free Cloud upload hua hai toh direct URL
  cloudUrl: { type: String, default: null },

  // Cloudinary public_id (for permanent cloud deletion)
  cloudinaryPublicId: { type: String, default: null },

  // Agar Local Computer Storage upload hua hai toh relative server URL
  localPath: { type: String, default: null },

  // File ka total size bytes mein
  fileSize: { type: Number, required: true },

  // Image File Format / MIME Type (e.g., 'image/webp', 'image/png', 'image/jpeg')
  mimeType: { type: String, required: true },

  // Image ki dimensions (Width aur Height pixels mein)
  dimensions: {
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },

  // ==========================================
  // ENHANCED FEATURES FIELDS
  // ==========================================
  
  // 🔒 Password Protection (Optional password string)
  password: { type: String, default: null },

  // ⏱️ Expiration Date (Null = Never expires)
  expiresAt: { type: Date, default: null },

  // 👁️ Private vs Public Visibility
  isPrivate: { type: Boolean, default: false },

  // 📁 Album Folder Category ('General', 'Work', 'Personal', 'Social Media', 'Vault')
  album: { type: String, default: 'General' },

  // 🎨 AI Filter Preset Applied ('none', 'cinematic', 'vintage', 'cyberpunk', 'grayscale', 'sepia', 'hdr')
  filterPreset: { type: String, default: 'none' },

  // 💧 Watermark Text
  watermarkText: { type: String, default: null },

  // 📊 Analytics Counters
  viewsCount: { type: Number, default: 0 },
  downloadsCount: { type: Number, default: 0 },

  // Upload karne ki Date & Time
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Image', imageSchema);
