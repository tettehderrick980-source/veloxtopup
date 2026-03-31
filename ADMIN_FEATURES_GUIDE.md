# VeloxTopUp Admin Features - Testing & Feature Guide

## 🧪 Item 2: Testing Refund/Retry Functionality

### Test Refund Functionality

1. **Prerequisites:**
   - Backend server running (`npm start` in veloxtopup-api)
   - Frontend running (`npm run dev` in main folder)
   - Logged in as Admin or Super Admin
   - At least one successful or failed transaction in the database

2. **Test Steps:**
   ```
   a. Navigate to Admin Dashboard → Transactions tab
   b. Find a transaction with "success" or "failed" status
   c. Click the REFUND button (💰 icon)
   d. Confirm the refund in the dialog
   e. Verify:
      - Success message appears
      - Transaction status changes to "refunded"
      - Status badge updates to gray color
   ```

3. **Database Verification:**
   ```sql
   -- Check refunded transaction
   SELECT id, reference, status, refunded_at 
   FROM transactions 
   WHERE status = 'refunded' 
   ORDER BY refunded_at DESC 
   LIMIT 5;
   ```

4. **Expected Results:**
   - ✅ Status changes to "refunded"
   - ✅ refunded_at timestamp is set
   - ✅ Success message displayed
   - ✅ Transaction no longer shows refund button

### Test Retry Functionality

1. **Prerequisites:**
   - At least one "failed" or "pending" transaction
   - GhDataConnect API balance is sufficient

2. **Test Steps:**
   ```
   a. Navigate to Admin Dashboard → Transactions tab
   b. Find a transaction with "failed" or "pending" status
   c. Click the RETRY button (▶️ icon)
   d. Confirm the retry in the dialog
   e. Verify:
      - Success message appears
      - Transaction status changes to "processing"
      - Retry count increments
   ```

3. **Database Verification:**
   ```sql
   -- Check retried transaction
   SELECT id, reference, status, retry_count, last_retry_at 
   FROM transactions 
   WHERE retry_count > 0 
   ORDER BY last_retry_at DESC 
   LIMIT 5;
   ```

4. **Expected Results:**
   - ✅ Status changes to "processing"
   - ✅ retry_count increments by 1
   - ✅ last_retry_at timestamp is set
   - ✅ Success message displayed

---

## 🚀 Item 3: Additional Super Admin Features

### Feature 1: Export Transactions to CSV

Add to SuperAdminDashboardPage.jsx:

```javascript
const exportTransactions = () => {
  const csvContent = [
    ['Reference', 'Email', 'Phone', 'Type', 'Amount', 'Status', 'Date'].join(','),
    ...transactions.map(tx => [
      tx.reference,
      tx.users?.email || 'Guest',
      tx.phone,
      tx.type,
      tx.amount,
      tx.status,
      new Date(tx.created_at).toLocaleDateString()
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};
```

### Feature 2: Bulk Actions on Transactions

```javascript
const [selectedTransactions, setSelectedTransactions] = useState([]);

const handleBulkRefund = async () => {
  if (!confirm(`Refund ${selectedTransactions.length} transactions?`)) return;
  
  for (const txId of selectedTransactions) {
    await handleRefundTransaction(txId);
  }
  setSelectedTransactions([]);
};
```

### Feature 3: Transaction Analytics Chart

```javascript
const getDailyStats = () => {
  const dailyData = {};
  transactions.forEach(tx => {
    const date = new Date(tx.created_at).toLocaleDateString();
    if (!dailyData[date]) {
      dailyData[date] = { count: 0, revenue: 0 };
    }
    dailyData[date].count++;
    if (tx.status === 'success') {
      dailyData[date].revenue += tx.amount;
    }
  });
  return dailyData;
};
```

### Feature 4: User Activity Log

```javascript
// Add to database.js
async getUserActivity(userId) {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data;
}
```

### Feature 5: System Notifications

```javascript
const [notifications, setNotifications] = useState([]);

const checkSystemAlerts = () => {
  const alerts = [];
  
  // Low balance alert
  if (ghDataConnectBalance < 10) {
    alerts.push({
      type: 'warning',
      message: `Low API Balance: GH₵${ghDataConnectBalance}`,
      action: 'Top Up Now'
    });
  }
  
  // Failed transactions alert
  const failedCount = transactions.filter(t => t.status === 'failed').length;
  if (failedCount > 5) {
    alerts.push({
      type: 'error',
      message: `${failedCount} failed transactions require attention`,
      action: 'View Failed'
    });
  }
  
  setNotifications(alerts);
};
```

---

## 📊 Quick Test Commands

### Test Backend API Endpoints

```bash
# 1. Health Check
curl http://localhost:3002/health

# 2. Get Balance
curl http://localhost:3002/api/v1/purchases/balance

# 3. Get Transactions
curl http://localhost:3002/api/v1/transactions

# 4. Test Refund (replace TRANSACTION_ID)
curl -X POST http://localhost:3002/api/v1/transactions/TRANSACTION_ID/refund \
  -H "Content-Type: application/json" \
  -d '{"reason": "Customer request"}'
```

### Database Checks

```sql
-- View transaction counts by status
SELECT status, COUNT(*) as count 
FROM transactions 
GROUP BY status;

-- View recent failed transactions
SELECT reference, amount, status, created_at 
FROM transactions 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check users with most transactions
SELECT users.email, COUNT(transactions.id) as tx_count
FROM users
JOIN transactions ON users.id = transactions.user_id
GROUP BY users.email
ORDER BY tx_count DESC
LIMIT 10;
```

---

## ✅ Implementation Checklist

- [x] Item 1: Admin Dashboard enhanced with transaction features
- [x] Item 2: Test guide created for refund/retry
- [x] Item 3: Additional Super Admin features documented

## 🎯 Next Steps

1. **Test the refund/retry in browser:**
   - Login as admin
   - Go to Transactions tab
   - Try refund on a successful transaction
   - Try retry on a failed transaction

2. **Implement additional features:**
   - Export to CSV
   - Bulk actions
   - Analytics charts
   - System notifications

3. **Monitor and verify:**
   - Check backend logs
   - Verify database updates
   - Test error handling
