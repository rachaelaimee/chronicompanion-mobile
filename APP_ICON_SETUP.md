# App Icon Setup Guide

## 🎨 Replace Android App Icons with Green Heart Design

Your app currently uses default Capacitor icons. To use your green heart with pulse design:

### 📱 **Icon Sizes Needed**

Create your green heart icon in these sizes:

| Density | Folder         | Size (pixels) |
| ------- | -------------- | ------------- |
| mdpi    | mipmap-mdpi    | 48x48         |
| hdpi    | mipmap-hdpi    | 72x72         |
| xhdpi   | mipmap-xhdpi   | 96x96         |
| xxhdpi  | mipmap-xxhdpi  | 144x144       |
| xxxhdpi | mipmap-xxxhdpi | 192x192       |

### 🔧 **How to Replace Icons**

**Option 1: Use Android Studio (Recommended)**

1. In Android Studio, right-click on `app` → New → Image Asset
2. Choose "Launcher Icons (Adaptive and Legacy)"
3. Select "Image" as Asset Type
4. Browse to your green heart icon image
5. Adjust padding/scaling as needed
6. Click "Next" → "Finish"
7. This automatically generates all sizes!

**Option 2: Manual Replacement**

1. Create your green heart icon in all the sizes above
2. Name them: `ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`
3. Replace files in these folders:
   - `android/app/src/main/res/mipmap-mdpi/`
   - `android/app/src/main/res/mipmap-hdpi/`
   - `android/app/src/main/res/mipmap-xhdpi/`
   - `android/app/src/main/res/mipmap-xxhdpi/`
   - `android/app/src/main/res/mipmap-xxxhdpi/`

### 🎯 **Icon Design Tips**

**For your green heart with pulse:**

- Use a clean, simple design
- Make sure it's readable at small sizes
- Keep important elements away from edges (Android may crop)
- Use your sage green color (#5a6e5a) as background
- White heart with pulse line for contrast

### ⚡ **Quick Fix Using Android Studio**

1. Open your project in Android Studio
2. Right-click `app` in project view
3. New → Image Asset
4. Upload your green heart image
5. Generate all icon sizes automatically
6. Build new APK

### 🧪 **After Replacing Icons**

1. Build new APK in Android Studio
2. Install on your phone
3. Check app drawer for new green heart icon
4. Test that it appears correctly

### 📁 **Current Icon Locations**

Your icons are currently in:

```
android/app/src/main/res/mipmap-[density]/
├── ic_launcher.png
├── ic_launcher_foreground.png
└── ic_launcher_round.png
```

### 🎉 **Result**

After replacement, your app will show the beautiful green heart with pulse design in the app drawer and throughout Android!
