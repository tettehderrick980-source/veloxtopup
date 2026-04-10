# In-App Notifications & PWA Configuration Guide

## 📱 In-App Notification System

### Overview
VeloxTopUp now features a comprehensive dual-layer notification system:

1. **Toast Notifications** - Temporary UI notifications for immediate feedback
2. **Database Notifications** - Persistent notifications stored in Supabase with real-time updates

### Architecture

#### 1. Toast Notifications (UI Layer)
- **Purpose**: Immediate user feedback for actions
- **Storage**: In-memory only (cleared on page refresh)
- **Duration**: Auto-dismiss after 5-8 seconds
- **Location**: Top-right corner of the screen

#### 2. Database Notifications (Persistent Layer)
- **Purpose**: Important updates that users should be able to review later
- **Storage**: Supabase `user_notifications` table
- **Features**: 
  - Real-time updates via Supabase subscriptions
  - Mark as read/unread
  - Delete individual notifications
  - Unread count badge
  - Persistent across sessions

### Usage

#### Using Toast Notifications

```javascript
import { useNotification } from '../contexts/NotificationContext';

function MyComponent() {
  const { success, error, warning, info } = useNotification();

  // Simple usage
  const handleAction = () => {
    success('Operation completed!');
    error('Something went wrong!');
    warning('Please check your input');
    info('Here is some information');
  };

  // Advanced usage with options
  const handleAdvanced = () => {
    success('Payment processed!', {
      title: 'Success',
      duration: 10000 // 10 seconds
    });
  };
}
```

#### Notification Types

| Type | Use Case | Duration | Color |
|------|----------|----------|-------|
| `success` | Successful operations | 5s | Green |
| `error` | Errors and failures | 8s | Red |
| `warning` | Warnings and alerts | 5s | Yellow |
| `info` | General information | 5s | Blue |

#### Database Notifications

The system automatically:
- Fetches notifications when user logs in
- Subscribes to real-time updates
- Shows toast notification for new database notifications
- Updates unread count badge in navbar

### Components

#### 1. NotificationBell Component
Located in navbar, provides:
- Unread count badge with animation
- Dropdown panel with notification list
- Mark as read/unread functionality
- Delete notifications
- Click to navigate to related content

#### 2. NotificationContainer Component
Displays toast notifications:
- Positioned at top-right
- Stacked vertically
- Auto-dismiss with progress bar
- Manual dismiss button
- "Clear all" button for multiple notifications

### Integration Points

Notifications are currently integrated in:
- ✅ **BuyForm** - Purchase success/failure/queued status
- ✅ **Navbar** - Notification bell with dropdown
- ✅ **ProfilePage** - Notification preferences
- ⏳ **AdminDashboard** - Refund/retry operations (to be added)
- ⏳ **WalletContext** - Low balance warnings (to be added)

### Database Schema

```sql
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_is_read ON user_notifications(is_read);
```

### Notification Types

Common notification types:
- `order_success` - Order completed successfully
- `order_failed` - Order processing failed
- `order_delivered` - Data bundle delivered
- `order_expired` - Order expired
- `low_balance` - Wallet balance low
- `refund_processed` - Refund completed
- `fulfillment_failed` - API fulfillment failed

---

## 🌐 PWA Configuration

### Overview
VeloxTopUp is configured as a Progressive Web App with full cross-device support.

### PWA Features Implemented

✅ **Service Worker** - Offline support and caching
✅ **Web App Manifest** - Installable on all devices
✅ **Push Notifications** - Ready for push notifications
✅ **Background Sync** - Queue operations when offline
✅ **Cache Strategies** - Multiple caching strategies
✅ **Responsive Design** - Works on all screen sizes
✅ **Standalone Mode** - Native app-like experience

### File Structure

```
public/
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── offline.html            # Offline fallback page
└── icons/                  # PWA icons
    ├── icon-72x72.png
    ├── icon-144x144.png
    ├── icon-192x192.png
    └── icon-512x512.png

src/
├── registerSW.js           # Service Worker registration
├── components/
│   ├── PWAInstall.jsx      # Install prompt component
│   └── PWADiagnostics.jsx  # PWA testing tool
└── main.jsx                # SW registration entry point
```

### Manifest Configuration

Key settings in `manifest.json`:

```json
{
  "name": "VeloxTopUp",
  "short_name": "VeloxTopUp",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#eab308",
  "background_color": "#0f172a",
  "icons": [
    // Multiple sizes for different devices
  ],
  "shortcuts": [
    // Quick actions for installed app
  ]
}
```

### Service Worker Caching Strategies

1. **Network First** - API requests
   - Try network first
   - Fallback to cache if offline
   - Returns offline message if neither available

2. **Cache First** - Images and static assets
   - Serve from cache immediately
   - Update cache in background
   - Fallback to network if not cached

3. **Stale While Revalidate** - HTML pages
   - Serve from cache immediately
   - Update cache in background
   - Ensures fast loading with eventual consistency

### Cross-Device Compatibility

#### iOS (Safari)
- ✅ Add to Home Screen support
- ✅ Standalone mode
- ✅ Apple touch icons configured
- ✅ Status bar styling
- ⚠️ Limited service worker features
- ⚠️ No push notifications (iOS limitation)

#### Android (Chrome)
- ✅ Full PWA support
- ✅ Install prompt
- ✅ Push notifications
- ✅ Background sync
- ✅ All service worker features

#### Desktop (Chrome/Edge/Firefox)
- ✅ Install as app
- ✅ Offline support
- ✅ Service worker caching
- ⚠️ Push notifications (varies by browser)

### Testing PWA

#### 1. Use PWA Diagnostics Tool
Navigate to **Settings → PWA Status** in the app to:
- Check PWA compatibility score
- Verify service worker status
- Test PWA features
- View device information
- Get recommendations

#### 2. Manual Testing Checklist

**Installation:**
- [ ] Chrome: Look for install icon in address bar
- [ ] iOS Safari: Tap Share → Add to Home Screen
- [ ] Android Chrome: Tap menu → Install app

**Offline Mode:**
- [ ] Open app while online
- [ ] Go to airplane mode
- [ ] Navigate to cached pages
- [ ] Verify offline page appears for uncached routes

**Standalone Mode:**
- [ ] Install the app
- [ ] Open from home screen
- [ ] Verify no browser UI
- [ ] Check splash screen appears

**Updates:**
- [ ] Deploy new version
- [ ] Open app (should show update notification)
- [ ] Click "Update Now"
- [ ] Verify app reloads with new version

### Common Issues & Solutions

#### Issue: Install prompt not showing
**Solutions:**
1. Ensure site is served over HTTPS
2. Check manifest.json is valid and accessible
3. Verify service worker is registered
4. Must have visited site at least twice, 5 minutes apart
5. Check browser compatibility

#### Issue: Service worker not activating
**Solutions:**
```javascript
// Force activation in browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
// Then reload page
```

#### Issue: Offline mode not working
**Solutions:**
1. Check service worker is active in DevTools
2. Verify cache contains necessary files
3. Check network tab for failed requests
4. Ensure URLs match exactly (case-sensitive)

#### Issue: iOS not showing install prompt
**Solutions:**
1. iOS requires manual "Add to Home Screen"
2. Ensure all apple-touch-icon sizes are present
3. Add `apple-mobile-web-app-capable` meta tag
4. Test on actual device (not simulator)

### PWA Best Practices

1. **Icons**: Provide multiple sizes (72x72, 144x144, 192x192, 512x512)
2. **Theme Color**: Match your brand color consistently
3. **Splash Screen**: Automatically generated from manifest icons and colors
4. **Offline Page**: Provide meaningful offline experience
5. **Updates**: Notify users of new versions
6. **Performance**: Keep service worker lean and fast
7. **Testing**: Test on actual devices, not just emulators

### Deployment Checklist

Before deploying to production:

- [ ] All PWA icons present in `/public/icons/`
- [ ] `manifest.json` has correct URLs and names
- [ ] Service Worker version updated if making changes
- [ ] HTTPS enabled (required for PWA)
- [ ] Test installation on iOS and Android
- [ ] Verify offline functionality
- [ ] Check update notification flow
- [ ] Test on multiple browsers
- [ ] Verify meta tags in `index.html`

### Monitoring PWA Performance

Track these metrics in analytics:
- PWA install rate
- Standalone mode usage
- Offline page views
- Service worker registration rate
- Update adoption rate

### Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Manifest | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ❌ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |
| Add to Home Screen | ✅ | ✅ | ✅ | ✅ |

---

## 🔧 Troubleshooting

### Notifications Not Showing

1. **Check Context Provider**: Ensure `NotificationProvider` wraps your app
2. **Verify Supabase Connection**: Check browser console for errors
3. **Database Permissions**: Ensure RLS policies allow notification access
4. **Real-time Enabled**: Verify Supabase real-time is enabled for `user_notifications` table

### PWA Not Working

1. **HTTPS Required**: PWA only works on HTTPS (or localhost)
2. **Check Console**: Look for service worker errors
3. **Validate Manifest**: Use Chrome DevTools → Application → Manifest
4. **Clear Cache**: Old service workers may conflict
5. **Check Icons**: All required icon sizes must exist

### Cross-Device Issues

1. **iOS Limitations**: Some PWA features not supported on iOS
2. **Browser Differences**: Test on target browsers
3. **Screen Sizes**: Use responsive design principles
4. **Touch vs Mouse**: Support both input methods

---

## 📚 Additional Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

## 🚀 Future Enhancements

- [ ] Push notifications for order updates
- [ ] Email notification integration
- [ ] SMS notification support
- [ ] Notification sound customization
- [ ] Notification grouping
- [ ] Rich notifications with actions
- [ ] Background data sync
- [ ] Offline order queuing
- [ ] PWA share target
- [ ] Widget support (iOS/Android)

---

**Last Updated**: April 10, 2026
**Version**: 1.0.0
