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
    // 5 seconds ka timeout set kar rahe hain taaki agar MongoDB local system par run nahi ho raha toh app latke nahi
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000
    });
    
    isConnected = true;
    console.log('✅ [MongoDB Status]: Database successfully connect ho gaya hai!');
  } catch (error) {
    isConnected = false;
    console.log('⚠️ [MongoDB Warning]: Local MongoDB service active nahi hai.');
    console.log('💡 [Smart Fallback]: App automatic Local JSON database (data/images.json) par switch ho gayi hai. AAPKI APP 100% WORKING RAHEGI!');
  }
};

// Check karne ke liye helper function
const getIsConnected = () => isConnected;

module.exports = { connectDB, getIsConnected };
