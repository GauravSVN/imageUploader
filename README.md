# 📸 PixelVault Pro - Cloud Image Hosting & Management Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-68a063?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_Cloud-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-CDN_Storage-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

An ultra-modern, production-ready cloud image hosting studio and sharing platform featuring a sleek glassmorphic UI, Cloudinary CDN delivery, dual MongoDB/local fallback persistence, password-protected links, live QR codes, and automated SEO optimization.

---

## ✨ Features

- **☁️ Cloudinary CDN Integration:** High-speed cloud uploads with automatic CDN optimization, WebP compression, and responsive resizing.
- **🍃 Resilient Dual-Mode Database:** Seamlessly connects to **MongoDB Atlas Cloud**; automatically falls back to local JSON storage if offline so the app never crashes.
- **🗑️ Synchronized Cloud Deletion:** Deleting an image permanently removes it from both the MongoDB database and your Cloudinary media library.
- **🎨 Glassmorphic Premium UI:** Designed with modern CSS glassmorphism, responsive grid layouts, and micro-interactions.
- **🔒 Security & Privacy Controls:** Password protection for sensitive images, private mode toggles, and expiring shareable links.
- **📱 Instant Sharing & QR Codes:** Generate instant QR codes for mobile viewing, plus copyable direct links, HTML embed tags, and Markdown snippets.
- **⚡ SEO & Performance Tuned:** Built-in `robots.txt`, dynamic `sitemap.xml`, OpenGraph social previews, JSON-LD Schema markup, Gzip compression, and HTTP cache headers.
- **♿ WCAG 2.1 AA Accessibility:** Keyboard navigable, visible focus outlines, high-contrast text, skip navigation links, and screen-reader ARIA live regions.
- **📊 Real-Time Analytics:** Live tracking of views, download counts, and storage usage metrics.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Modern CSS3 (Variables, Flexbox, Grid), Vanilla JavaScript (ES6+)
- **Backend:** Node.js, Express.js
- **File Uploads & Processing:** Multer, Sharp (WebP conversion & dimensions detection)
- **Cloud Storage:** Cloudinary Node.js SDK
- **Database:** MongoDB Atlas via Mongoose ORM
- **Deployment Platform:** Render / Vercel / Railway

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/GauravSVN/imageUploader.git
cd imageUploader
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory by copying `.env.example`:
```bash
cp .env.example .env
```

Add your credentials inside `.env`:
```env
# Cloudinary Credentials (Free Cloud Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# MongoDB Atlas Connection URI
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/imageStore?retryWrites=true&w=majority

# Port (Optional, defaults to 3000)
PORT=3000
```

### 4. Run Locally
```bash
# Start server
node server.js
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to Render

1. Create a new **Web Service** on [Render.com](https://render.com) and link your GitHub repository.
2. Set the build settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
3. Under the **Environment Variables** tab, add:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `MONGO_URI`
4. In **MongoDB Atlas** under `Network Access`, ensure `0.0.0.0/0` is whitelisted so Render can access your database.
5. Click **Deploy**!

---

## 📁 Project Structure

```text
├── config/
│   └── db.js            # MongoDB Atlas connection & fallback handler
├── data/
│   └── images.json      # Offline local database fallback
├── models/
│   └── Image.js         # Mongoose Schema (Analytics, Cloudinary IDs, Privacy)
├── public/
│   ├── css/
│   │   └── style.css    # Responsive Glassmorphic Design System
│   ├── js/
│   │   └── app.js       # Dynamic UI controller & API interactions
│   ├── favicon.png      # Custom branding icon
│   ├── index.html       # Single-page web app with SEO & a11y
│   ├── robots.txt       # Search engine crawler instructions
│   └── sitemap.xml      # SEO sitemap index
├── uploads/             # Local temporary upload directory
├── .env.example         # Template for environment configuration
├── .gitignore           # Git ignore list protecting .env & uploads
├── package.json         # Node.js dependencies and scripts
├── README.md            # Project documentation
└── server.js            # Express application entry point & REST APIs
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
