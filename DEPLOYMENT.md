# 🚀 ChroniCompanion Deployment Guide

## ☁️ Cloud Deployment Setup

### Step 1: Set Up Neon Database

1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project called "ChroniCompanion"
3. Copy your connection string (looks like: `postgresql://user:pass@host/dbname`)

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app) and connect your GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your ChroniCompanion repository
4. Add environment variables:
   - `DATABASE_URL`: Your Neon connection string
   - `OPENAI_API_KEY`: Your OpenAI API key (optional)
5. Deploy! 🚀

### Step 3: Update Your Mobile App

1. Note your Railway app URL (e.g., `https://your-app.railway.app`)
2. Update `frontend/js/main.js` line 4:
   ```javascript
   this.apiBase = "https://your-app.railway.app";
   ```
3. Rebuild your APK:
   ```bash
   npx cap sync android
   cd android && export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" && ./gradlew assembleDebug
   ```

### Alternative: Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project root
3. Add environment variables in Vercel dashboard
4. Your API will be at `https://your-project.vercel.app`

## 🎉 Result

Your ChroniCompanion app will now work for ALL users worldwide!
