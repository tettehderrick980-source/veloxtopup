/**
 * Service Worker Registration
 * Registers the Service Worker for PWA functionality
 */

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('[PWA] New Service Worker installing...');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('[PWA] New version available');
                showUpdateNotification(newWorker);
              }
            });
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      // Listen for messages from Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'UPDATE_AVAILABLE') {
          console.log('[PWA] Update available from message');
        }
      });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] New Service Worker activated, reloading...');
        window.location.reload();
      });
    });
  } else {
    console.log('[PWA] Service Worker not supported');
  }
}

/**
 * Show update notification to user
 */
function showUpdateNotification(worker) {
  // You can integrate this with your app's notification system
  console.log('[PWA] Showing update notification');
  
  // Optional: Create a custom event that the app can listen to
  const updateEvent = new CustomEvent('pwa-update-available', {
    detail: { worker }
  });
  window.dispatchEvent(updateEvent);
}

/**
 * Skip waiting and activate new Service Worker
 */
export function skipWaitingAndRefresh() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage('skipWaiting');
  }
}

/**
 * Clear all caches
 */
export async function clearCaches() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const messageChannel = new MessageChannel();
    
    return new Promise((resolve, reject) => {
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve();
        } else {
          reject(new Error('Failed to clear caches'));
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        'clearCache',
        [messageChannel.port2]
      );
    });
  }
}

/**
 * Check if app is installed (standalone mode)
 */
export function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone ||
         document.referrer.includes('android-app://');
}

/**
 * Check online/offline status
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function listenForConnectivityChanges(callback) {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
}

/**
 * Get PWA install prompt (if available)
 */
let deferredPrompt = null;

export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Store the event for later use
    deferredPrompt = e;
    console.log('[PWA] Install prompt available');
    
    // Dispatch custom event
    const installEvent = new CustomEvent('pwa-install-available', {
      detail: { prompt: e }
    });
    window.dispatchEvent(installEvent);
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed');
    deferredPrompt = null;
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

/**
 * Show PWA install prompt
 */
export async function showInstallPrompt() {
  if (!deferredPrompt) {
    console.log('[PWA] Install prompt not available');
    return false;
  }
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`[PWA] User ${outcome === 'accepted' ? 'installed' : 'dismissed'} the app`);
  deferredPrompt = null;
  
  return outcome === 'accepted';
}
