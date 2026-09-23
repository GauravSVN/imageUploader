// =========================================================================
// SERVER.JS - Main Node.js Express Backend Server (Enhanced with Security & Analytics)
// =========================================================================
// Yeh file humare poore web application ka brain hai. 
// Iss mein Express REST APIs, File Upload, ImgBB Cloud API, Password Protection,
// Expiring Links, View Counters, Albums, aur Hindi Comments hain.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

// MongoDB Database Config aur Model import kar rahe hain
const { connectDB, getIsConnected } = require('./config/db.js');
const ImageModel = require('./models/Image.js');

// Express App initialize kar rahe hain
const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary Configuration Setup
const isCloudinaryReady = Boolean(
  process.env.CLOUDINARY_URL || 
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (isCloudinaryReady) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL.trim(),
      secure: true
    });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      api_key: process.env.CLOUDINARY_API_KEY.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
      secure: true
    });
  }
  console.log('☁️ [Cloudinary Configured]: Connected with Cloud Name ->', cloudinary.config().cloud_name || 'Active');
} else {
  console.log('☁️ [Cloudinary Status]: Credentials missing in .env (Local storage & ImgBB fallback ready)');
}

// Cloudinary Buffer Upload Stream Helper Function
function uploadBufferToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'pixelvault',
        public_id: path.parse(filename).name,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// ImgBB Free Online Cloud API Key (Secondary fallback)
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '6d00053631585af138c3726579dace98';

// ==========================================
// 1. FOLDERS INITIALIZATION
// ==========================================
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
const jsonDbPath = path.join(dataDir, 'images.json');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(jsonDbPath)) {
  fs.writeFileSync(jsonDbPath, JSON.stringify([], null, 2));
}

// ==========================================
// 2. MIDDLEWARE SETUP (Performance Compression & Caching)
// ==========================================
const compression = require('compression');
app.use(compression()); // Gzip & Brotli HTTP payload compression
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// High-Performance Static Caching (7 days for uploads, 1 day for public assets)
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (filePath.match(/\.(css|js|png|jpg|jpeg|webp|ico|svg|woff2)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    }
  }
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// ==========================================
// 3. HELPER FUNCTIONS FOR LOCAL JSON DATABASE
// ==========================================
const readJsonDb = () => {
  try {
    const data = fs.readFileSync(jsonDbPath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
  }
};

const writeJsonDb = (data) => {
  fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
};

// Helper: Filter out expired links
const filterExpiredImages = (images) => {
  const now = new Date();
  return images.filter(img => {
    if (img.expiresAt) {
      return new Date(img.expiresAt) > now;
    }
    return true;
  });
};

// ==========================================
// 4. REST API ROUTES
// ==========================================

// ------------------------------------------
// ROUTE 1: GET /api/images (Get Images List)
// ------------------------------------------
app.get('/api/images', async (req, res) => {
  try {
    let images = [];
    if (getIsConnected()) {
      images = await ImageModel.find().sort({ createdAt: -1 });
    } else {
      images = readJsonDb().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Filter out expired items
    const validImages = filterExpiredImages(images);

    res.json({ success: true, count: validImages.length, images: validImages });
  } catch (error) {
    console.error('API Get Images Error:', error.message);
    res.status(500).json({ success: false, message: 'Images fetch karne mein error aaya.' });
  }
});

// ------------------------------------------
// ROUTE 2: POST /api/upload (Upload, Process, Security & Store)
// ------------------------------------------
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Kripya koi image file select karein.' });
    }

    // User preferences & security parameters
    const storageTypePref = req.body.storageType === 'local' ? 'local' : 'cloud';
    const targetFormat = req.body.format || 'webp';
    const qualityVal = parseInt(req.body.quality, 10) || 80;
    const userCustomName = req.body.customName ? req.body.customName.trim() : '';
    const albumFolder = req.body.album || 'General';
    const passwordLock = req.body.password ? req.body.password.trim() : null;
    const isPrivateVis = req.body.isPrivate === 'true' || req.body.isPrivate === true;
    const filterPreset = req.body.filterPreset || 'none';
    const watermarkText = req.body.watermarkText ? req.body.watermarkText.trim() : null;

    // Expiry calculation
    const expiryDays = parseInt(req.body.expiryDays, 10) || 0;
    let expiresAt = null;
    if (expiryDays > 0) {
      expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    }

    // File naming
    const originalName = userCustomName || req.file.originalname;
    const fileId = uuidv4();
    const timestamp = Date.now();
    const extension = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
    const finalFilename = `img-${timestamp}-${fileId.slice(0, 6)}.${extension}`;

    // Sharp Image Processing
    let sharpInstance = sharp(req.file.buffer);
    const metadata = await sharpInstance.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    let processedBuffer;
    if (targetFormat === 'webp') {
      processedBuffer = await sharpInstance.webp({ quality: qualityVal }).toBuffer();
    } else if (targetFormat === 'png') {
      processedBuffer = await sharpInstance.png({ compressionLevel: Math.floor((100 - qualityVal) / 10) }).toBuffer();
    } else if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
      processedBuffer = await sharpInstance.jpeg({ quality: qualityVal }).toBuffer();
    } else {
      processedBuffer = req.file.buffer;
    }

    const processedFileSize = processedBuffer.length;
    let cloudUrl = null;
    let cloudinaryPublicId = null;
    let localPath = null;
    let finalMimeType = `image/${targetFormat === 'jpg' ? 'jpeg' : targetFormat}`;

    let actualStorageType = storageTypePref;

    // Storage Dispatcher (Cloudinary -> ImgBB -> Local Disk)
    if (actualStorageType === 'cloud') {
      // 1. Try Cloudinary if credentials are configured
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        console.log('☁️ [Cloudinary Uploading]: Uploading image to Cloudinary CDN...');
        try {
          const cldResult = await uploadBufferToCloudinary(processedBuffer, finalFilename);
          if (cldResult && cldResult.secure_url) {
            cloudUrl = cldResult.secure_url;
            cloudinaryPublicId = cldResult.public_id;
            console.log('✅ [Cloudinary Upload Success]: High-Speed CDN URL ->', cloudUrl);
          }
        } catch (cldErr) {
          console.warn('⚠️ [Cloudinary Notice]: Cloudinary upload failed (', cldErr.message, '). Trying fallback...');
        }
      }

      // 2. Secondary Cloud Fallback: ImgBB
      if (!cloudUrl && IMGBB_API_KEY) {
        console.log('🌐 [ImgBB Uploading]: Sending image to ImgBB Free Cloud API...');
        try {
          const base64Image = processedBuffer.toString('base64');
          const params = new URLSearchParams();
          params.append('key', IMGBB_API_KEY);
          params.append('image', base64Image);
          params.append('name', finalFilename);

          const cloudResponse = await axios.post('https://api.imgbb.com/1/upload', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000
          });

          if (cloudResponse.data && cloudResponse.data.data && cloudResponse.data.data.url) {
            cloudUrl = cloudResponse.data.data.url;
            console.log('✅ [ImgBB Upload Success]: Public URL ->', cloudUrl);
          }
        } catch (cloudErr) {
          console.warn('⚠️ [Cloud API Notice]: Cloud upload notice (', cloudErr.message, '). Auto-switching to Local Storage...');
        }
      }

      if (!cloudUrl) {
        actualStorageType = 'local';
      }
    }

    if (actualStorageType === 'local' || !cloudUrl) {
      actualStorageType = 'local';
      const localFilePath = path.join(uploadsDir, finalFilename);
      fs.writeFileSync(localFilePath, processedBuffer);
      localPath = `/uploads/${finalFilename}`;
      console.log('💻 [Local Upload Success]: File saved at ->', localFilePath);
    }

    // Database Document Construction
    const imageDoc = {
      id: fileId,
      originalName: originalName,
      fileName: finalFilename,
      storageType: actualStorageType,
      cloudUrl: cloudUrl,
      cloudinaryPublicId: cloudinaryPublicId,
      localPath: localPath,
      fileSize: processedFileSize,
      mimeType: finalMimeType,
      dimensions: { width: width, height: height },
      password: passwordLock,
      expiresAt: expiresAt,
      isPrivate: isPrivateVis,
      album: albumFolder,
      filterPreset: filterPreset,
      watermarkText: watermarkText,
      viewsCount: 0,
      downloadsCount: 0,
      createdAt: new Date()
    };

    if (getIsConnected()) {
      const newImage = new ImageModel(imageDoc);
      await newImage.save();
    }
    
    const currentJsonData = readJsonDb();
    currentJsonData.push(imageDoc);
    writeJsonDb(currentJsonData);

    const publicDirectUrl = actualStorageType === 'cloud' 
      ? cloudUrl 
      : `${req.protocol}://${req.get('host')}${localPath}`;

    res.json({
      success: true,
      message: actualStorageType === 'cloud' 
        ? 'Image free online cloud par upload ho gayi!' 
        : 'Image local server folder mein save ho gayi!',
      image: {
        ...imageDoc,
        directUrl: publicDirectUrl,
        htmlEmbed: `<img src="${publicDirectUrl}" alt="${originalName}" />`,
        markdownEmbed: `![${originalName}](${publicDirectUrl})`
      }
    });

  } catch (error) {
    console.error('❌ Upload Error Details:', error.message);
    res.status(500).json({
      success: false,
      message: `Upload Failed: ${error.message || 'Server Internal Error'}`
    });
  }
});

// ------------------------------------------
// ROUTE 3: POST /api/images/:id/view (Increment Views Counter)
// ------------------------------------------
app.post('/api/images/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    if (getIsConnected()) {
      await ImageModel.findOneAndUpdate({ id: id }, { $inc: { viewsCount: 1 } });
    }
    let jsonList = readJsonDb();
    const target = jsonList.find(img => img.id === id);
    if (target) {
      target.viewsCount = (target.viewsCount || 0) + 1;
      writeJsonDb(jsonList);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ------------------------------------------
// ROUTE 4: POST /api/images/:id/download (Increment Downloads Counter)
// ------------------------------------------
app.post('/api/images/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    if (getIsConnected()) {
      await ImageModel.findOneAndUpdate({ id: id }, { $inc: { downloadsCount: 1 } });
    }
    let jsonList = readJsonDb();
    const target = jsonList.find(img => img.id === id);
    if (target) {
      target.downloadsCount = (target.downloadsCount || 0) + 1;
      writeJsonDb(jsonList);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ------------------------------------------
// ROUTE 5: POST /api/images/:id/verify-password (Verify Protected Password)
// ------------------------------------------
app.post('/api/images/:id/verify-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    let targetItem = null;
    if (getIsConnected()) {
      targetItem = await ImageModel.findOne({ id: id });
    } else {
      const jsonList = readJsonDb();
      targetItem = jsonList.find(img => img.id === id);
    }

    if (!targetItem) {
      return res.status(404).json({ success: false, message: 'Image record nahi mila.' });
    }

    if (!targetItem.password || targetItem.password === password) {
      return res.json({ success: true, message: 'Password Verified!' });
    } else {
      return res.status(401).json({ success: false, message: 'Incorrect Password! Access Denied.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Password verify karne mein error aaya.' });
  }
});

// ------------------------------------------
// ROUTE 6: DELETE /api/images/:id (Delete Image)
// ------------------------------------------
app.delete('/api/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let deletedItem = null;

    if (getIsConnected()) {
      deletedItem = await ImageModel.findOneAndDelete({ id: id });
    }

    let jsonList = readJsonDb();
    const itemInJson = jsonList.find(img => img.id === id);
    jsonList = jsonList.filter(img => img.id !== id);
    writeJsonDb(jsonList);

    const targetItem = deletedItem || itemInJson;

    // 1. Agar image Cloudinary par thi, Cloudinary se permanently destroy karein
    if (targetItem) {
      const publicIdToDelete = targetItem.cloudinaryPublicId || 
        (targetItem.fileName ? `pixelvault/${path.parse(targetItem.fileName).name}` : null);

      const isCloudinaryImage = Boolean(
        publicIdToDelete && 
        (targetItem.storageType === 'cloud' || (targetItem.cloudUrl && targetItem.cloudUrl.includes('cloudinary.com')))
      );

      if (isCloudinaryImage && isCloudinaryReady) {
        try {
          console.log(`🗑️ [Cloudinary Deleting]: Removing asset ${publicIdToDelete} from Cloudinary...`);
          const destroyResult = await cloudinary.uploader.destroy(publicIdToDelete);
          console.log(`✅ [Cloudinary Deleted]: Cloudinary response ->`, destroyResult);
        } catch (cldDelErr) {
          console.error('⚠️ [Cloudinary Delete Error]:', cldDelErr.message);
        }
      }
    }

    // 2. Agar image local storage mein thi, disk se unlink karein
    if (targetItem && targetItem.localPath) {
      const fileNameOnly = path.basename(targetItem.localPath);
      const localFilePath = path.join(uploadsDir, fileNameOnly);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log(`💻 [Local Deleted]: File unlinked ->`, localFilePath);
      }
    }

    res.json({ success: true, message: 'Image successfully website aur Cloudinary se delete kar di gayi hai!' });
  } catch (error) {
    console.error('Delete API Error:', error.message);
    res.status(500).json({ success: false, message: 'Delete karne mein error aaya.' });
  }
});

// ------------------------------------------
// ROUTE 7: GET /api/stats (Storage & Total Stats)
// ------------------------------------------
app.get('/api/stats', async (req, res) => {
  try {
    let images = [];
    if (getIsConnected()) {
      images = await ImageModel.find();
    } else {
      images = readJsonDb();
    }

    const validImages = filterExpiredImages(images);
    const totalCount = validImages.length;
    const totalBytes = validImages.reduce((sum, img) => sum + (img.fileSize || 0), 0);
    const cloudCount = validImages.filter(img => img.storageType === 'cloud').length;
    const localCount = validImages.filter(img => img.storageType === 'local').length;
    const totalViews = validImages.reduce((sum, img) => sum + (img.viewsCount || 0), 0);

    res.json({
      success: true,
      totalCount,
      totalBytes,
      cloudCount,
      localCount,
      totalViews,
      dbStatus: getIsConnected() ? 'MongoDB Connected' : 'Local JSON File Mode Active'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Stats calculate nahi ho paye.' });
  }
});

// ==========================================
// 5. SERVER LAUNCH
// ==========================================
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`
===================================================
🚀 [PixelVault Pro Server Running]
🌐 Web App URL : http://localhost:${PORT}
📁 Storage Dir : ${uploadsDir}
🍃 DB Status   : ${getIsConnected() ? 'MongoDB' : 'Local JSON File Mode'}
===================================================
    `);
  });
});
