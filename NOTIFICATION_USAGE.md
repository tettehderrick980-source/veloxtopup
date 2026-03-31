# In-App Notification System - Usage Guide

## Overview
Isolated notification system that can be used from anywhere in the app. Provides toast notifications that slide in from the top-right.

## Basic Usage

### 1. Using the Hook (Recommended)

```javascript
import { useNotification } from '../contexts/NotificationContext';

function MyComponent() {
  const { success, error, warning, info } = useNotification();

  const handleAction = async () => {
    try {
      // Do something
      success('Operation completed successfully!');
    } catch (err) {
      error('Something went wrong: ' + err.message);
    }
  };

  return (
    <button onClick={handleAction}>
      Do Something
    </button>
  );
}
```

### 2. Notification Types

```javascript
// Success notification
success('Payment processed successfully!');

// Error notification (longer duration)
error('Failed to process payment');

// Warning notification
warning('Low balance - please top up soon');

// Info notification
info('New update available');
```

### 3. Advanced Usage with Options

```javascript
const { addNotification } = useNotification();

// Custom notification
addNotification({
  type: 'success',
  title: 'Payment Successful',
  message: 'Your transaction #12345 has been confirmed',
  duration: 8000  // 8 seconds (default is 5s)
});
```

### 4. Programmatic Removal

```javascript
const { addNotification, removeNotification } = useNotification();

const id = addNotification({
  type: 'info',
  message: 'Processing...',
  duration: 0  // Won't auto-dismiss
});

// Later, remove it manually
removeNotification(id);
```

## Integration Examples

### In BuyForm.jsx
```javascript
const { success, error } = useNotification();

// After successful purchase
success('Data bundle delivered successfully!');

// On error
error('Purchase failed. Please try again.');
```

### In Admin Dashboard
```javascript
const { success, error, warning } = useNotification();

// After refund
success('Transaction refunded successfully');

// After retry
success('Transaction retry initiated');

// Low balance warning
warning('API balance is running low');
```

### In Super Admin
```javascript
const { info, success } = useNotification();

// After export
success('Transactions exported to CSV');

// System alert
info('System health check completed');
```

## Notification Types & Styles

| Type | Icon | Background | Use Case |
|------|------|------------|----------|
| success | ✅ CheckCircle | Green | Success messages |
| error | ❌ XCircle | Red | Errors, failures |
| warning | ⚠️ ExclamationTriangle | Yellow | Warnings, alerts |
| info | ℹ️ InformationCircle | Blue | General info |

## Features

- ✅ **Auto-dismiss**: Notifications disappear after duration (default 5s)
- ✅ **Manual close**: Click X to dismiss
- ✅ **Progress bar**: Visual indicator of remaining time
- ✅ **Stackable**: Multiple notifications shown together
- ✅ **Clear all**: Button to dismiss all notifications
- ✅ **Accessible**: ARIA labels and roles
- ✅ **Responsive**: Works on all screen sizes
- ✅ **Isolated**: Self-contained, doesn't interfere with app

## Files Structure

```
src/
├── contexts/
│   └── NotificationContext.jsx    # Provider & hook
├── components/
│   └── NotificationContainer.jsx  # UI component
└── index.css                      # Animation styles
```

## API Reference

### useNotification Hook

```typescript
{
  // Properties
  notifications: Notification[]
  
  // Methods
  addNotification: (notification: NotificationInput) => string
  removeNotification: (id: string) => void
  clearAll: () => void
  
  // Convenience methods
  success: (message: string, options?: Options) => string
  error: (message: string, options?: Options) => string
  warning: (message: string, options?: Options) => string
  info: (message: string, options?: Options) => string
}
```

### Notification Input

```typescript
{
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number  // milliseconds, 0 = no auto-dismiss
}
```

## Testing

```javascript
// Test all notification types
const TestNotifications = () => {
  const { success, error, warning, info } = useNotification();

  return (
    <div className="space-y-2">
      <button onClick={() => success('Success!')} className="btn-primary">
        Test Success
      </button>
      <button onClick={() => error('Error!')} className="btn-primary bg-red-600">
        Test Error
      </button>
      <button onClick={() => warning('Warning!')} className="btn-primary bg-yellow-600">
        Test Warning
      </button>
      <button onClick={() => info('Info!')} className="btn-primary bg-blue-600">
        Test Info
      </button>
    </div>
  );
};
```
