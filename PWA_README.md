# VeloxTopUp PWA Implementation

This document describes the Progressive Web App (PWA) implementation for VeloxTopUp.

## Features

- **Offline Support**: Service Worker caches essential assets for offline use
- **Installable**: Can be installed on mobile and desktop devices
- **Push Notifications**: Ready for push notification implementation
- **Background Sync**: Queue requests when offline and sync when back online
- **App Shortcuts**: Quick access to Buy Data, Wallet, and Orders

## File Structure

```
public/
├── manifest.json          # PWA manifest configuration
├── sw.js                  # Service Worker with caching strategies
├── icons/                 # PWA icons (multiple sizes)
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
└── screenshots/           # PWA screenshots for app stores

src/
├── registerSW.js          # Service Worker registration utilities
└── components/
    └── PWAInstall.jsx     # PWA UI components (install button, update notifications)
```

## Quick Start

### 1. Generate Icons

#### Option A: Using the HTML Generator (No dependencies)
1. Open `scripts/icon-generator.html` in a browser
2. Upload your logo
3. Download all generated icons
4. Extract to `public/icons/`

#### Option B: Using Node.js with Sharp
```bash
# Install sharp
npm install --save-dev sharp

# Run the generator
node scripts/generate-pwa-icons.js
```

### 2. Verify Setup

Check that all required files exist:
- [ ] `public/manifest.json`
- [ ] `public/sw.js`
- [ ] `public/icons/` with all icon sizes
- [ ] `src/registerSW.js`
- [ ] `index.html` with manifest link and PWA meta tags

### 3. Build and Test

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

### 4. Test PWA Features

1. Open Chrome DevTools (F12)
2. Go to Application tab
3. Check:
   - Manifest section
   - Service Workers section
   - Cache Storage
4. Run Lighthouse audit for PWA score

## Caching Strategies

The Service Worker implements three caching strategies:

1. **Cache First** (Static Assets)
   - CSS, JS, Fonts, Images
   - Fast loading from cache

2. **Network First** (API Requests)
   - API calls to `/api/`
   - Fresh data when online, cache fallback when offline

3. **Stale While Revalidate** (Dynamic Content)
   - Pages and dynamic content
   - Serve from cache immediately, update in background

## Components

### PWAInstallButton

Shows an install prompt for eligible devices:

```jsx
import { PWAInstallButton } from './components/PWAInstall';

function App() {
  return (
    <>
      {/* Your app content */}
      <PWAInstallButton />
    </>
  );
}
```

### PWAUpdateNotification

Notifies users when an update is available:

```jsx
import { PWAUpdateNotification } from './components/PWAInstall';

function App() {
  return (
    <>
      {/* Your app content */}
      <PWAUpdateNotification />
    </>
  );
}
```

### PWAStatusBadge

Shows online/offline status:

```jsx
import { PWAStatusBadge } from './components/PWAInstall';

function Header() {
  return (
    <header>
      <h1>VeloxTopUp</h1>
      <PWAStatusBadge />
    </header>
  );
}
```

## API Reference

### registerSW.js

#### `registerServiceWorker()`
Registers the Service Worker and handles updates.

#### `initInstallPrompt()`
Initializes the beforeinstallprompt event listener.

#### `showInstallPrompt()`
Shows the native install prompt (returns Promise<boolean>).

#### `isAppInstalled()`
Checks if the app is running in standalone mode.

#### `isOnline()`
Returns current online status.

#### `listenForConnectivityChanges(callback)`
Listen for online/offline events.

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Partial support (no push notifications)
- iOS Safari: Supported with limitations

## Troubleshooting

### Icons not showing
- Verify all icon sizes exist in `public/icons/`
- Check manifest.json has correct icon paths
- Ensure icons are square and have proper padding

### Service Worker not registering
- Check browser console for errors
- Verify `sw.js` is in the public folder
- Ensure HTTPS in production (required for PWA)

### App not installable
- Check Chrome DevTools > Application > Manifest
- Verify all required manifest fields
- Ensure icons meet size requirements

## Performance

- Code splitting enabled in Vite config
- Vendor chunks separated for better caching
- Images cached separately for efficient updates

## Future Enhancements

- [ ] Add push notification support
- [ ] Implement periodic background sync
- [ ] Add offline fallback page
- [ ] Enable background fetch for large assets
