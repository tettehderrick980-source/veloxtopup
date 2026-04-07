import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker, initInstallPrompt } from './registerSW.js'

// Force HTTPS in production only
if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  location.replace(`https://${location.host}${location.pathname}`);
}

// Suppress harmless Paystack SDK warnings
const originalWarn = console.warn
console.warn = (...args) => {
  const message = args[0]?.toString() || ''
  if (message.includes('allowpaymentrequest') || message.includes('Allow attribute')) {
    return
  }
  originalWarn.apply(console, args)
}

// Register PWA Service Worker
registerServiceWorker()

// Initialize install prompt handling
initInstallPrompt()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
