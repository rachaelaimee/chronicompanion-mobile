# 🏗️ ChroniCompanion Infrastructure Guide

_Last Updated: August 2025_

## 📋 Quick Reference

| Service       | Purpose            | Status    | URL/Config                                                 |
| ------------- | ------------------ | --------- | ---------------------------------------------------------- |
| **Railway**   | Backend API        | ✅ Active | `https://chronicompanion-mobile-production.up.railway.app` |
| **Firebase**  | Authentication     | ✅ Active | Firebase Console Project: ChroniCompanion                  |
| **OpenAI**    | AI Health Insights | ✅ Active | API Key in Railway env vars                                |
| **Capacitor** | Mobile Framework   | ✅ Active | Cross-platform iOS/Android                                 |
| **Vercel**    | Frontend Hosting   | ✅ Active | `https://chronicompanion.app`                              |
| **Ko-fi**     | Donations          | ✅ Active | `ko-fi.com/chronicompanion`                                |
| **AdSense**   | Ads Revenue        | ✅ Active | Publisher ID: `pub-5788516341374259`                       |

---

## 🌐 Backend Services

### Railway (Primary Backend)

- **URL**: `https://chronicompanion-mobile-production.up.railway.app`
- **Purpose**: Main API server, database, AI endpoints
- **Technology**: Python FastAPI + SQLite
- **Environment Variables**:
  - `OPENAI_API_KEY`: For AI health insights
  - Database automatically managed by Railway
- **Endpoints**:
  - `/health` - Health check
  - `/api/entries` - Health entries CRUD
  - `/api/ai/*` - AI insight endpoints
  - `/api/export` - Data export functionality

### ~~Localhost Development~~ (DEPRECATED)

- ❌ **DO NOT USE**: `http://localhost:8000`
- **Why**: Security concerns, import errors, not accessible from mobile
- **Use Railway instead** for all development and production

---

## 🔐 Authentication & User Management

### Firebase Authentication

- **Project**: ChroniCompanion (Firebase Console)
- **Enabled Providers**: Google Sign-In
- **Configuration Files**:
  - `android/app/google-services.json` (Android config)
  - `capacitor.config.json` (Capacitor Firebase plugin)
- **SHA-1 Fingerprint**: `BA:B3:39:9A:2A:0B:32:67:EB:1A:13:D4:D9:0E:EE:A0:38:02:3A:2D`
- **Features**:
  - ✅ Google Sign-In
  - ✅ Cross-device data sync capability
  - 🔄 User profile management (planned)

---

## 🤖 AI & Intelligence

### OpenAI Integration

- **Service**: OpenAI GPT-3.5-turbo
- **API Key**: Stored in Railway environment variables
- **Features**:
  - Predictive health insights
  - Coping strategy suggestions
  - Crisis pattern detection
  - Weekly health coaching
- **Caching**: 8-hour intervals in localStorage
- **Fallback**: Offline insights when API unavailable

---

## 📱 Mobile Development

### Capacitor Framework

- **Purpose**: Cross-platform iOS/Android from web code
- **Configuration**: `capacitor.config.json`
- **Plugins Used**:
  - `@capacitor-firebase/authentication@7.3.0`
  - `@capacitor/filesystem@7.1.3`
  - `@capacitor/share@7.0.1`
  - `@capacitor-community/file-opener@7.0.1`

### Android Specific

- **Package Name**: `io.github.rachaelaimee.chronicompanion`
- **Build Tool**: Android Studio
- **Key Files**:
  - `android/app/google-services.json` (Firebase config)
  - `android/app/build.gradle` (Dependencies)
  - `android/build.gradle` (Project config)

---

## 🌍 Frontend Hosting

### Vercel (Primary)

- **URL**: `https://chronicompanion.app`
- **Purpose**: Public web app hosting
- **Features**:
  - Custom domain
  - Automatic deployments from git
  - HTTPS/SSL included
  - Private repository support

### ~~GitHub Pages~~ (DEPRECATED)

- ❌ **DO NOT USE**: Had 404 issues with folder structure
- **Use Vercel instead**

---

## 💰 Monetization

### AdSense

- **Publisher ID**: `pub-5788516341374259`
- **Ad Units**:
  - Support Ad 1: `9428322867`
  - Support Ad 2: `1509184834`
- **Files**:
  - `frontend/ads.txt` (verification)
  - `frontend/index.html` (meta tag verification)
- **Display**: Only on support modal (not intrusive)

### Ko-fi Donations

- **URL**: `ko-fi.com/chronicompanion`
- **Integration**: Direct links with pre-filled amounts ($1, $3, $5)
- **Purpose**: User support for app development

### ~~Play Store Subscriptions~~ (PLANNED)

- 🔄 **Status**: To be implemented with Play Billing Library 8 (June 2025)
- **Features**: 7-day free trials, premium AI features
- **Alternative**: Current approach - all features free

---

## 📊 Data Storage

### Frontend Storage

- **Primary**: IndexedDB (offline-first)
- **Backup**: localStorage
- **Cache**: AI responses (8-hour TTL)
- **Sync**: Automatic when online

### Backend Database

- **Type**: SQLite (managed by Railway)
- **Location**: Railway cloud infrastructure
- **Backup**: Automatic Railway backups
- **Models**: JournalEntry, Users (when auth implemented)

---

## 🔧 Development Tools

### Code Management

- **Repository**: GitHub (private)
- **Branch Strategy**:
  - `main` - Production ready
  - `working-version` - Development branch
- **Deployment**:
  - Frontend: Auto-deploy to Vercel on push
  - Backend: Auto-deploy to Railway on push

### Build Process

1. **Frontend Changes**:
   ```bash
   npx cap sync android
   npx cap open android
   ```
2. **Backend Changes**: Automatic Railway deployment
3. **Testing**: Android Studio → Build APK → Test on device

---

## 🚨 Important File Locations

### Configuration Files

- `capacitor.config.json` - Capacitor mobile config
- `android/app/google-services.json` - Firebase Android config
- `frontend/ads.txt` - AdSense verification
- `backend/.env` - Environment variables (DO NOT COMMIT)
- `package.json` - Dependencies and scripts

### Key Directories

- `frontend/` - Web app source code
- `backend/` - Python API server
- `android/` - Android project (generated by Capacitor)
- `data/` - Development data storage

---

## 🔄 Current Status Summary

### ✅ Working Features

- Health entry tracking (offline-first)
- AI health insights (all free currently)
- Data export functionality
- Mobile app building
- Firebase authentication (Google Sign-In)
- AdSense ads (support modal only)
- Ko-fi donations

### 🔄 In Progress

- Cross-device data synchronization
- User profile management
- Advanced dashboard analytics

### 📋 Planned Features

- Play Store billing integration
- Premium feature tiers
- iOS app deployment
- Advanced AI coaching
- Community features

---

## ⚠️ Critical Reminders

1. **NEVER use localhost in production** - Always use Railway backend
2. **Firebase config is environment-specific** - Different configs for dev/prod
3. **OpenAI API key is sensitive** - Only store in Railway environment variables
4. **Mobile builds require sync** - Always run `npx cap sync android` after frontend changes
5. **Commit strategy** - Small commits, avoid breaking changes
6. **Firebase Auth debugging** - Check browser console for Firebase initialization errors
7. **AI fallbacks active** - App shows offline insights when backend AI fails

---

## 🆘 Troubleshooting Quick Reference

| Issue                 | Solution                                        |
| --------------------- | ----------------------------------------------- |
| AI not working        | Check Railway backend status + OpenAI API key   |
| Mobile build fails    | Check Firebase config files are in place        |
| Authentication issues | Verify SHA-1 fingerprint in Firebase console    |
| 404 errors            | Ensure using correct Railway/Vercel URLs        |
| Data not syncing      | Check IndexedDB storage + Railway API endpoints |

---

_📝 Remember to update this document when adding new services or making infrastructure changes!_
