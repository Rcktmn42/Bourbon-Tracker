# CSRF Protection Fix - Comprehensive Action Plan

## Problem Summary

**Current State**: CSRF protection is implemented on the backend but frontend is missing required headers on most write operations (POST/PATCH/PUT/DELETE). This causes intermittent failures across the application.

**Symptom**: `CSRF protection: Missing required headers for write operation` error in production.

**Root Cause**: Backend `validateCSRFToken` middleware requires `X-Requested-With: XMLHttpRequest` header on all write operations in production, but frontend fetch calls don't consistently include this header.

## Affected Features (Confirmed & Suspected)

### Confirmed Broken in Production:
1. ✅ ~~Login~~ - Fixed manually
2. ✅ ~~Logout~~ - Fixed manually
3. ✅ ~~Delivery Analysis (3 POST requests)~~ - Fixed with utility
4. ❌ **Watchlist - Add items** - BROKEN (POST request)
5. ❌ **Watchlist - Edit items** - BROKEN (PATCH request)
6. ❌ **Watchlist - Delete items** - BROKEN (DELETE request)
7. ❌ **Watchlist - Toggle notifications** - BROKEN (PATCH request)

### Likely Broken (Not Yet Tested):
8. User Registration (POST)
9. Email Verification (POST)
10. Password Reset Request (POST)
11. Password Reset Confirmation (POST)
12. Profile Updates (PUT)
13. Admin User Management - Update Role (PATCH)
14. Admin User Management - Update Status (PATCH)
15. Report Generation (POST)

## Current Hack vs. Proper Solution

### What We Did (Hack):
- Created `apiFetch()` utility in `/frontend/src/utils/api.js`
- Manually updated 5 fetch calls across 2 files
- Playing whack-a-mole as users discover broken features

### What We Need (Proper Solution):
- Systematically replace ALL fetch calls with the utility
- OR implement global fetch interceptor/wrapper
- Ensure consistent CSRF header inclusion across entire app

---

## Action Plan - Option 1: Refactor to Use apiFetch Utility (Recommended)

### Phase 1: Audit & Inventory (Est. 15 minutes)
**Goal**: Find every write operation in the frontend

```bash
# Search for all POST/PATCH/PUT/DELETE fetch calls
cd /mnt/c/Users/JTLew/source/repos/Bourbon-Tracker/frontend/src
grep -rn "method:\s*['\"]POST['\"]" . --include="*.jsx" --include="*.js"
grep -rn "method:\s*['\"]PATCH['\"]" . --include="*.jsx" --include="*.js"
grep -rn "method:\s*['\"]PUT['\"]" . --include="*.jsx" --include="*.js"
grep -rn "method:\s*['\"]DELETE['\"]" . --include="*.jsx" --include="*.js"
```

**Deliverable**: Create inventory list with:
- File path
- Line number
- Endpoint being called
- Current status (fixed/broken)

### Phase 2: Systematic Refactoring (Est. 1-2 hours)
**Goal**: Replace all raw fetch calls with apiFetch utility

#### Files to Update (Based on Earlier Grep):
1. ✅ `/contexts/AuthContext.jsx` - Already fixed
2. ✅ `/pages/DeliveryAnalysis.jsx` - Already fixed
3. ❌ `/pages/Register.jsx` - Line 54 (POST)
4. ❌ `/pages/WatchlistPage.jsx` - Lines 214, 255, 285, 375, 407, 432 (POST/PATCH/DELETE)
5. ❌ `/pages/EmailVerification.jsx` - Lines 89, 139 (POST)
6. ❌ `/pages/Profile.jsx` - Lines 109, 155 (PUT/POST)
7. ❌ `/pages/ResetPassword.jsx` - Line 92 (POST)
8. ❌ `/pages/RequestPasswordReset.jsx` - Line 26 (POST)
9. ❌ `/pages/AdminUsers.jsx` - Lines 58, 90 (PATCH)
10. ❌ `/pages/Admin.jsx` - Lines 23, 39, 62 (PATCH/POST)

#### Refactoring Pattern:

**Before:**
```javascript
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(data)
});
```

**After:**
```javascript
import apiFetch from '../utils/api';

const response = await apiFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

**Note**: apiFetch already includes:
- `Content-Type: application/json`
- `X-Requested-With: XMLHttpRequest`
- `credentials: 'include'`

### Phase 3: Testing (Est. 30 minutes)
**Goal**: Verify all write operations work in production

#### Test Checklist:
- [ ] Login/Logout
- [ ] User Registration
- [ ] Email Verification
- [ ] Password Reset Flow
- [ ] Profile Updates
- [ ] Watchlist - Add Item
- [ ] Watchlist - Edit Item
- [ ] Watchlist - Delete Item
- [ ] Watchlist - Toggle Notifications
- [ ] Admin - Update User Role
- [ ] Admin - Update User Status
- [ ] Delivery Analysis Report
- [ ] Report Generation (if applicable)

### Phase 4: Deployment (Est. 10 minutes)

```bash
# On EC2
cd /opt/bourbon-tracker
sudo git pull origin production-readiness
cd frontend
sudo npm run build

# No backend restart needed - frontend only changes
```

---

## Action Plan - Option 2: Global Fetch Wrapper (Alternative)

### Implementation:
Create a global fetch interceptor that automatically adds CSRF headers to all write operations.

**File**: `/frontend/src/utils/fetchInterceptor.js`

```javascript
// Save original fetch
const originalFetch = window.fetch;

// Override global fetch
window.fetch = function(...args) {
  let [url, config] = args;

  // Add CSRF header to write operations
  if (config && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(config.method?.toUpperCase())) {
    config.headers = {
      'X-Requested-With': 'XMLHttpRequest',
      ...(config.headers || {})
    };
  }

  return originalFetch.apply(this, [url, config]);
};
```

**Import once in**: `/frontend/src/main.jsx` (before App component)

**Pros**:
- Zero code changes across entire app
- Automatic coverage for all future fetch calls
- Quick implementation

**Cons**:
- Global modification of fetch behavior
- Harder to debug/trace
- Less explicit than refactoring

---

## Action Plan - Option 3: Axios with Interceptors (Most Robust)

### Implementation:

```bash
# Install axios
npm install axios
```

**File**: `/frontend/src/utils/axiosInstance.js`

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_MISSING') {
      console.error('CSRF token missing - this should not happen with axios interceptor');
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Usage**:
```javascript
import api from '../utils/axiosInstance';

// POST request
const response = await api.post('/auth/login', { email, password });

// GET request
const response = await api.get('/inventory/summary');
```

**Pros**:
- Industry standard HTTP client
- Built-in interceptors
- Better error handling
- Request/response transformation
- Automatic JSON parsing

**Cons**:
- Requires refactoring all fetch calls
- Additional dependency
- Different API than native fetch

---

## Recommendation

**Use Option 1 (apiFetch utility refactoring)** because:

1. ✅ Utility already created and working
2. ✅ Minimal learning curve (similar to fetch)
3. ✅ No new dependencies
4. ✅ Explicit and easy to debug
5. ✅ Can be done incrementally (already started)
6. ✅ ~1-2 hours to complete systematically

**Avoid Option 2 (global wrapper)** because:
- Makes debugging harder
- "Magic" behavior that's not obvious

**Consider Option 3 (axios) for future enhancement** if:
- You want better error handling
- You need request cancellation
- You want progress tracking
- You plan to add more complex API interactions

---

## Estimated Total Time

- **Audit**: 15 minutes
- **Refactoring**: 1-2 hours
- **Testing**: 30 minutes
- **Deployment**: 10 minutes

**Total**: ~2-3 hours for complete fix

---

## Success Criteria

- [ ] Zero CSRF errors in production logs
- [ ] All user-facing write operations functional
- [ ] All test checklist items pass
- [ ] Code consistency across frontend
- [ ] Documentation updated (this file archived as "completed")

---

**Created**: 2025-01-30
**Priority**: High
**Affects**: All write operations in production
**Blocking**: Watchlist feature, potentially others
