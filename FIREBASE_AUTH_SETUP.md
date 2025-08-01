# 🔐 Firebase Authentication Setup Guide

## Overview
This guide will help you set up Firebase Authentication with Google Sign-In for ChroniCompanion. After setup, users will be able to sign in securely and sync their data across devices.

## Prerequisites
- Google/Gmail account
- Admin access to Google Cloud Console
- Your app's SHA-1 fingerprint (for Android)

---

## Step 1: Create Firebase Project

### 1.1 Go to Firebase Console
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Sign in with your Google account
3. Click "Add project"

### 1.2 Configure Project
1. **Project name**: `ChroniCompanion` (or your preferred name)
2. **Analytics**: Enable Google Analytics (recommended)
3. **Analytics account**: Use default or create new
4. Click "Create project"

---

## Step 2: Add Android App to Firebase

### 2.1 Add Android App
1. In Firebase console, click "Add app" → Android icon
2. **Android package name**: `io.github.rachaelaimee.chronicompanion`
3. **App nickname**: `ChroniCompanion Android`
4. **Debug signing certificate SHA-1**: *See Step 2.2 below*

### 2.2 Get Android SHA-1 Fingerprint
Run this command in your project root:
```bash
cd android
./gradlew signingReport
```

Look for the SHA-1 under "Variant: debug" - copy this value.

### 2.3 Download Configuration File
1. Download `google-services.json`
2. Place it in: `android/app/google-services.json`

---

## Step 3: Add Web App to Firebase

### 3.1 Add Web App
1. In Firebase console, click "Add app" → Web icon (</>) 
2. **App nickname**: `ChroniCompanion Web`
3. **Enable hosting**: No (we're using Vercel)
4. Click "Register app"

### 3.2 Get Web Configuration
Copy the Firebase config object that looks like:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 3.3 Create Firebase Config File
Create `frontend/firebase-config.js`:
```javascript
// Firebase Configuration
const firebaseConfig = {
  // Paste your config here
};

// Export for use in app
window.firebaseConfig = firebaseConfig;
```

---

## Step 4: Enable Google Authentication

### 4.1 Enable Authentication
1. In Firebase console → Authentication
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Click "Google"
5. Toggle "Enable"
6. Select support email
7. Click "Save"

---

## Step 5: Configure Google Sign-In

### 5.1 Get Web Client ID
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to APIs & Services → Credentials
4. Find "Web client" OAuth 2.0 Client ID
5. Copy the Client ID

### 5.2 Add Web Client ID to HTML
Add this to `frontend/index.html` in the `<head>` section:
```html
<!-- Firebase Configuration -->
<script src="firebase-config.js"></script>
```

---

## Step 6: Update Android Configuration

### 6.1 Update MainActivity.java
Add Firebase Authentication to your MainActivity:

```java
// In android/app/src/main/java/.../MainActivity.java
import com.getcapacitor.community.firebaseauth.FirebaseAuthentication;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(FirebaseAuthentication.class);
    }
}
```

### 6.2 Update build.gradle (Module: app)
Add to `android/app/build.gradle`:
```gradle
dependencies {
    implementation 'com.google.firebase:firebase-auth:21.1.0'
    implementation 'com.google.android.gms:play-services-auth:20.4.1'
}

apply plugin: 'com.google.gms.google-services'
```

### 6.3 Update build.gradle (Project)
Add to `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

---

## Step 7: Test Authentication

### 7.1 Sync Capacitor
Run these commands:
```bash
npx cap sync android
npx cap open android
```

### 7.2 Test in Browser
1. Serve your frontend: `python -m http.server 8000`
2. Open browser: `http://localhost:8000/frontend`
3. Click "Sign In with Google"
4. Complete sign-in flow

### 7.3 Test on Android
1. Build and install APK
2. Test sign-in functionality
3. Check console logs for debugging

---

## Step 8: Backend Integration (Optional)

### 8.1 Verify ID Tokens
Add Firebase Admin SDK to your Python backend:
```bash
pip install firebase-admin
```

### 8.2 Backend Authentication
```python
import firebase_admin
from firebase_admin import auth

# Initialize Firebase Admin
firebase_admin.initialize_app()

def verify_token(id_token):
    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        return decoded_token
    except Exception as e:
        return None
```

---

## Troubleshooting

### Common Issues

#### Authentication Error
- **Problem**: "Firebase Auth not initialized"
- **Solution**: Ensure `google-services.json` is in correct location

#### Google Sign-In Fails
- **Problem**: Sign-in popup appears but fails
- **Solution**: Check SHA-1 fingerprint is correct

#### Web Client ID Error
- **Problem**: "Invalid client ID"  
- **Solution**: Verify Web Client ID in Google Cloud Console

#### CORS Issues
- **Problem**: Authentication works in app but not browser
- **Solution**: Add your domain to Firebase authorized domains

### Debug Mode
Enable debug logging in your app:
```javascript
// Add to main.js init()
console.log('🔐 Auth Debug Mode Enabled');
```

---

## Security Best Practices

### 1. Environment Variables
Store sensitive config in environment variables:
```javascript
// Don't commit API keys to Git
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  // ... other config
};
```

### 2. Domain Restrictions
In Firebase console → Authentication → Settings:
- Add only your production domains
- Remove localhost before production

### 3. Token Expiration
ID tokens expire after 1 hour. Your app handles refresh automatically.

---

## Production Deployment

### 1. Update Authorized Domains
Add your production domain to Firebase:
1. Authentication → Settings → Authorized domains
2. Add: `chronicompanion.app`

### 2. Update Android Release SHA-1
1. Generate release keystore
2. Get release SHA-1 fingerprint
3. Add to Firebase project

### 3. Web Configuration
Ensure production Firebase config is used.

---

## Testing Checklist

- [ ] Firebase project created
- [ ] Android app registered with correct SHA-1
- [ ] Web app registered 
- [ ] Google Sign-In enabled
- [ ] Configuration files in correct locations
- [ ] Authentication working in browser
- [ ] Authentication working on Android
- [ ] User data syncing correctly
- [ ] Sign-out working properly

---

## Next Steps

After authentication is working:

1. **User Data Sync**: Entries sync between devices
2. **Premium Features**: Authenticate premium status
3. **Offline Support**: Maintain auth state offline  
4. **Privacy**: Implement data deletion
5. **Analytics**: Track user engagement

---

## Support

If you encounter issues:

1. Check Firebase console for error logs
2. Review browser console for JavaScript errors
3. Check Android logcat for native errors
4. Verify all configuration files are correct

**Need help?** The authentication system is now integrated into your app and ready to test!