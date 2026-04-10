import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  WifiIcon, 
  WifiIcon as WifiOffIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function PWADiagnostics() {
  const [checks, setChecks] = useState({
    serviceWorker: false,
    serviceWorkerActive: false,
    pushManager: false,
    onlineStatus: navigator.onLine,
    standaloneMode: false,
    manifestLoaded: false,
    cacheStorage: false,
    indexedDB: false,
    localStorage: false,
    notificationAPI: false,
    backgroundSync: false
  });

  const [deviceInfo, setDeviceInfo] = useState({
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    touchSupport: 'ontouchstart' in window,
    maxTouchPoints: navigator.maxTouchPoints || 0
  });

  const runDiagnostics = async () => {
    const newChecks = {
      serviceWorker: 'serviceWorker' in navigator,
      serviceWorkerActive: false,
      pushManager: 'PushManager' in window,
      onlineStatus: navigator.onLine,
      standaloneMode: window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone || 
                     document.referrer.includes('android-app://'),
      manifestLoaded: false,
      cacheStorage: 'caches' in window,
      indexedDB: 'indexedDB' in window,
      localStorage: (() => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return true;
        } catch (e) {
          return false;
        }
      })(),
      notificationAPI: 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'SyncManager' in window.prototype
    };

    // Check if service worker is active
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      newChecks.serviceWorkerActive = true;
    }

    // Check if manifest is loaded
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      try {
        const response = await fetch(manifestLink.href);
        newChecks.manifestLoaded = response.ok;
      } catch (e) {
        newChecks.manifestLoaded = false;
      }
    }

    setChecks(newChecks);
  };

  useEffect(() => {
    runDiagnostics();

    // Listen for online/offline events
    const handleOnline = () => setChecks(prev => ({ ...prev, onlineStatus: true }));
    const handleOffline = () => setChecks(prev => ({ ...prev, onlineStatus: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const CheckItem = ({ label, status, description }) => (
    <div className="flex items-start justify-between p-3 bg-dark-700/50 rounded-lg">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && (
          <p className="text-xs text-dark-400 mt-1">{description}</p>
        )}
      </div>
      <div className="ml-3">
        {status ? (
          <CheckCircleIcon className="w-5 h-5 text-green-400" />
        ) : (
          <XCircleIcon className="w-5 h-5 text-red-400" />
        )}
      </div>
    </div>
  );

  const getCompatibilityScore = () => {
    const totalChecks = Object.values(checks).filter(v => typeof v === 'boolean').length;
    const passedChecks = Object.values(checks).filter(v => v === true).length;
    return Math.round((passedChecks / totalChecks) * 100);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">PWA Diagnostics</h2>
          <p className="text-sm text-dark-400 mt-1">
            Check Progressive Web App compatibility and features
          </p>
        </div>
        <button
          onClick={runDiagnostics}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Compatibility Score */}
      <div className="card bg-gradient-to-br from-primary-500/10 to-primary-600/10 border-primary-500/20">
        <div className="text-center">
          <p className="text-sm text-dark-300 mb-2">PWA Compatibility Score</p>
          <p className={`text-5xl font-bold ${getScoreColor(getCompatibilityScore())}`}>
            {getCompatibilityScore()}%
          </p>
          <p className="text-xs text-dark-400 mt-2">
            {getCompatibilityScore() >= 80 
              ? '✓ Excellent! Your app is PWA-ready' 
              : getCompatibilityScore() >= 60 
              ? '⚠ Good, but some features need attention' 
              : '✗ Several PWA features are missing'}
          </p>
        </div>
      </div>

      {/* Device Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Device Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-dark-700/50 rounded-lg">
            <p className="text-xs text-dark-400">Platform</p>
            <p className="text-sm text-white font-medium">{deviceInfo.platform}</p>
          </div>
          <div className="p-3 bg-dark-700/50 rounded-lg">
            <p className="text-xs text-dark-400">Screen Resolution</p>
            <p className="text-sm text-white font-medium">{deviceInfo.screenResolution}</p>
          </div>
          <div className="p-3 bg-dark-700/50 rounded-lg">
            <p className="text-xs text-dark-400">Touch Support</p>
            <p className="text-sm text-white font-medium">
              {deviceInfo.touchSupport ? `Yes (${deviceInfo.maxTouchPoints} points)` : 'No'}
            </p>
          </div>
          <div className="p-3 bg-dark-700/50 rounded-lg">
            <p className="text-xs text-dark-400">Language</p>
            <p className="text-sm text-white font-medium">{deviceInfo.language}</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-dark-700/50 rounded-lg">
          <p className="text-xs text-dark-400 mb-1">User Agent</p>
          <p className="text-xs text-dark-300 font-mono break-all">{deviceInfo.userAgent}</p>
        </div>
      </div>

      {/* PWA Features */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">PWA Features</h3>
        <div className="space-y-2">
          <CheckItem 
            label="Service Worker Support" 
            status={checks.serviceWorker}
            description="Required for offline functionality and caching"
          />
          <CheckItem 
            label="Service Worker Active" 
            status={checks.serviceWorkerActive}
            description="Service Worker is currently registered and active"
          />
          <CheckItem 
            label="Manifest Loaded" 
            status={checks.manifestLoaded}
            description="Web app manifest is accessible"
          />
          <CheckItem 
            label="Standalone Mode" 
            status={checks.standaloneMode}
            description="App is running in installed/standalone mode"
          />
          <CheckItem 
            label="Online Status" 
            status={checks.onlineStatus}
            description="Current network connectivity"
          />
          <CheckItem 
            label="Cache Storage" 
            status={checks.cacheStorage}
            description="Cache API available for storing assets"
          />
          <CheckItem 
            label="Push Notifications" 
            status={checks.pushManager}
            description="Push API supported for notifications"
          />
          <CheckItem 
            label="Notification API" 
            status={checks.notificationAPI}
            description="Browser notifications supported"
          />
          <CheckItem 
            label="Background Sync" 
            status={checks.backgroundSync}
            description="Background sync for offline operations"
          />
        </div>
      </div>

      {/* Storage APIs */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Storage APIs</h3>
        <div className="space-y-2">
          <CheckItem 
            label="Local Storage" 
            status={checks.localStorage}
            description="Persistent key-value storage"
          />
          <CheckItem 
            label="IndexedDB" 
            status={checks.indexedDB}
            description="Client-side database for larger data"
          />
        </div>
      </div>

      {/* Recommendations */}
      <div className="card bg-blue-900/20 border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
        <ul className="space-y-2 text-sm text-dark-300">
          {!checks.serviceWorkerActive && (
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">⚠</span>
              <span>Service Worker is not active. Check registration in main.jsx</span>
            </li>
          )}
          {!checks.manifestLoaded && (
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">✗</span>
              <span>Manifest file not found. Ensure manifest.json exists in public/</span>
            </li>
          )}
          {!checks.standaloneMode && (
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">ℹ</span>
              <span>App is running in browser mode. Use "Add to Home Screen" to install</span>
            </li>
          )}
          {!checks.backgroundSync && (
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">⚠</span>
              <span>Background Sync not supported. Offline operations may be limited</span>
            </li>
          )}
          {checks.standaloneMode && (
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>App is installed and running in standalone mode</span>
            </li>
          )}
          {checks.serviceWorkerActive && checks.manifestLoaded && (
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>Core PWA features are working correctly</span>
            </li>
          )}
        </ul>
      </div>

      {/* Test PWA Install */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Test PWA Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('pwa-update-available'))}
            className="p-3 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-white transition-colors"
          >
            Test Update Notification
          </button>
          <button
            onClick={async () => {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage('clearCache');
                alert('Cache cleared!');
              }
            }}
            className="p-3 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-white transition-colors"
          >
            Clear Service Worker Cache
          </button>
        </div>
      </div>
    </div>
  );
}
