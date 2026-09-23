// ==========================================
// CONFIG/DB.JS - MongoDB Database Connection
// ==========================================
// Yeh file MongoDB database se connection banane ke liye use hoti hai.

const mongoose = require('mongoose');

// MongoDB Connection URI (Local database ya Cloud MongoDB Atlas)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snapvault_imagestore';

// Global variable check karne ke liye ki MongoDB connect hua hai ya nahi
let isConnected = false;

const connectDB = async () => {
  try {
    const isAtlas = MONGO_URI.includes('mongodb+srv');
    console.log(`🔌 [MongoDB Info]: Connecting to ${isAtlas ? 'MongoDB Atlas Cloud' : 'Local MongoDB'}...`);
    
    // Cloud database ke liye 10 seconds ka timeout taaki Render ke cloud network se safely handshake ho sake
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });
    
    isConnected = true;
    console.log('✅ [MongoDB Status]: Database successfully connect ho gaya hai!');
  } catch (error) {
    isConnected = false;
    console.log('⚠️ [MongoDB Warning]: Connection nahi ban paya ->', error.message);
    console.log('💡 [Smart Fallback]: App automatic Local JSON database (data/images.json) par switch ho gayi hai. AAPKI APP 100% WORKING RAHEGI!');
  }
};

// Check karne ke liye helper function
const getIsConnected = () => isConnected;

module.exports = { connectDB, getIsConnected };
