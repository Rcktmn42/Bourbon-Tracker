# Watchlist Redesign - Quick Start Testing Guide

## 🚀 Quick Start (5 minutes)

### 1. Start Backend
```bash
cd /mnt/c/Users/JTLew/source/repos/Bourbon-Tracker/backend
npm start
```

**Expected output:**
```
🔧 Initializing database connections...
✅ Connected to User Database (SQLite)
✅ Connected to Inventory Database (SQLite)
🔕 Notification worker disabled in development
🚀 Server running on port 3000
```

**Ignore Redis warnings:** "Redis unavailable, running without cache" is fine!

### 2. Start Frontend (New Terminal)
```bash
cd /mnt/c/Users/JTLew/source/repos/Bourbon-Tracker/frontend
npm run dev
```

### 3. Test in Browser

Open http://localhost:5173 and log in, then:

1. **Navigate to Watchlist** (should be in the menu)
2. **Verify two tabs appear:**
   - "My List" (your active items)
   - "Browse Catalog" (all 200+ defaults)

3. **Test Tab 1 (My List):**
   - Should show ~200 default premium products initially
   - Search for "Eagle Rare" or "Blanton's"
   - Filter by category (Allocation, Limited, etc.)
   - Toggle a product OFF → it disappears from My List
   - Add a custom PLU (try: 12345, name: "Test Bourbon")

4. **Test Tab 2 (Browse Catalog):**
   - Should show ALL products
   - Find the item you toggled off → toggle switch should be OFF
   - Toggle it back ON
   - Return to My List → item reappears!

5. **Test Bulk Actions:**
   - In My List, click "Turn Off All Defaults"
   - My List becomes empty (or only shows customs)
   - Go to Browse Catalog → all items show toggle OFF
   - Toggle a few back ON → they reappear in My List

## ✅ Success Criteria

- [ ] Both tabs load without errors
- [ ] Toggling items works (disappear from My List, stay in Catalog)
- [ ] Can re-enable items from Catalog
- [ ] Can add custom PLU
- [ ] Bulk actions work
- [ ] No console errors in browser (F12)
- [ ] No server crashes

## 🐛 Common Issues

**Issue:** "Failed to load watchlist" error
**Fix:** Check backend is running on port 3000

**Issue:** Items not disappearing when toggled
**Fix:** Clear browser cache, refresh page

**Issue:** Redis warnings in logs
**Fix:** Ignore - Redis is optional, app works without it

## 📝 What to Look For

**Database Changes:**
```bash
# Check user_watchlist table
sqlite3 backend/data/database.sqlite3 "SELECT * FROM user_watchlist LIMIT 5;"

# Check audit log
sqlite3 backend/data/database.sqlite3 "SELECT * FROM watchlist_audit_log ORDER BY created_at DESC LIMIT 5;"

# Check custom_alcohol
sqlite3 BourbonDatabase/inventory.db "SELECT * FROM custom_alcohol;"
```

**Expected Behavior:**
- Toggling creates rows in `user_watchlist` with `interest_type='not_interested'`
- Adding custom PLU creates row with `interest_type='interested'`
- All actions logged in `watchlist_audit_log`

## 🎯 Next Steps

After successful testing:
1. Review `WATCHLIST_REDESIGN_COMPLETE.md` for full documentation
2. Test notification worker (set `ENABLE_NOTIFICATIONS=true` in .env)
3. Plan production deployment

---

**Time to test:** ~5-10 minutes
**Rollback available:** Yes (see WATCHLIST_REDESIGN_COMPLETE.md)
