# 🔍 Structural Insights Debugging Guide

## ✅ What I've Done

### 1. Fixed Backend Data Access
- Changed `jobs[job_id].get("transcript")` → `result.get("transcript")`
- Changed `jobs[job_id].get("duration")` → `result.get("duration")`

### 2. Improved Frontend Display
- Added fallback message when structural_insights is empty
- Added console logging to debug what data is being returned

### 3. Added Debug Logging
- Console logs now show the full audience analysis result
- Console logs specifically show structural_insights data

## 🧪 How to Debug

### Step 1: Open Browser Console
1. Open your browser (where the app is running)
2. Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
3. Click on the "Console" tab

### Step 2: Upload Audio and Check Logs
1. Upload an audio file
2. Wait for analysis to complete
3. Click on a different audience (e.g., "Students")
4. Look in the console for these messages:
   ```
   Audience analysis result: {audience: "students", fit_score: 68, ...}
   Structural insights: {avg_response_length_sec: 15.3, directness: "high", ...}
   ```

### Step 3: Check What You See

#### ✅ If You See This in Console:
```javascript
Structural insights: {
  avg_response_length_sec: 15.3,
  directness: "high",
  explanation_ratio: "medium",
  speech_rate_wpm: 185.2,
  filler_density: 2.1
}
```
**Then the backend is working!** The data is being returned correctly.

#### ❌ If You See This:
```javascript
Structural insights: undefined
```
or
```javascript
Structural insights: {}
```
**Then the backend has an issue.** The data is not being generated.

## 🔧 Troubleshooting

### Issue 1: structural_insights is undefined

**Cause**: Backend didn't restart or the fix didn't apply

**Solution**:
1. Stop backend (`Ctrl+C`)
2. Run `python main.py` again
3. Upload a NEW audio file (don't use old job_id)

### Issue 2: structural_insights is empty {}

**Cause**: The calculation is failing

**Check**:
1. Is `transcript` being stored in the result?
2. Is `duration` being stored in the result?
3. Check backend logs for errors

### Issue 3: Card shows "Loading structural insights..."

**Cause**: The object exists but has no keys

**Solution**: This is the fallback message. Check console to see what data is actually there.

## 📊 Expected Data Flow

### 1. Backend Generates Data
```python
{
    "audience": "students",
    "fit_score": 68,
    "mismatches": [...],
    "suggestions": [...],
    "structural_insights": {
        "avg_response_length_sec": 15.3,
        "directness": "high",
        "explanation_ratio": "medium",
        "speech_rate_wpm": 185.2,
        "filler_density": 2.1
    }
}
```

### 2. Frontend Receives Data
```typescript
const result = await api.getAudienceAnalysis(jobId, selectedAudience);
console.log("Structural insights:", result.structural_insights);
```

### 3. Frontend Displays Data
```tsx
{Object.entries(audienceAnalysis.structural_insights).map(([key, value]) => (
  <div>
    <span>{key.replace(/_/g, " ")}</span>
    <span>{typeof value === "number" ? value.toFixed(1) : value}</span>
  </div>
))}
```

## ✅ What Should Display

### Structural Insights Card Should Show:
```
Structural Insights
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Avg response length sec    15.3
Directness                 high
Explanation ratio          medium
Speech rate wpm            185.2
Filler density             2.1
```

## 🎯 Testing Checklist

- [ ] Backend restarted after fix
- [ ] Browser refreshed (Ctrl+F5)
- [ ] New audio file uploaded (not old job_id)
- [ ] Console opened (F12)
- [ ] Clicked different audience chip
- [ ] Checked console for "Structural insights:" log
- [ ] Verified data is not undefined or empty
- [ ] Checked if card displays the data

## 🐛 Common Issues

### Issue: "Cannot read properties of undefined"
**Fix**: Already fixed with optional chaining (`?.`)

### Issue: Card is empty but no error
**Check**: Console logs - is data being returned?

### Issue: Data in console but not displaying
**Check**: Is `Object.keys(audienceAnalysis.structural_insights).length > 0`?

## 📝 What to Report

If it's still not working, please check:

1. **Console logs**: What does it show for "Structural insights:"?
2. **Backend logs**: Any errors when generating analysis?
3. **Network tab**: What is the actual API response?

To check Network tab:
1. F12 → Network tab
2. Click an audience chip
3. Look for request to `/api/result/{job_id}?audience=students`
4. Click on it → Response tab
5. Check if `structural_insights` is in the response

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Console shows structural_insights with 5 properties
- ✅ Card displays all 5 metrics
- ✅ Values change when you switch audiences
- ✅ No "Loading structural insights..." message

The debugging logs will help us see exactly what's happening! 🔍
