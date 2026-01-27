# 🎯 Audience-Based Analysis Feature - Implementation Guide

## ✅ What's Been Done

### 1. API Layer (COMPLETE)
**File**: `src/services/api.ts`

Added:
- `AudienceAnalysisResult` interface
- `getAudienceAnalysis()` method

```typescript
export interface AudienceAnalysisResult {
    audience: string;
    fit_score: number;
    mismatches: string[];
    suggestions: string[];
    structural_insights: {
        avg_response_length_sec?: number;
        directness?: string;
        explanation_ratio?: string;
        [key: string]: any;
    };
}

// New API method
getAudienceAnalysis: async (jobId: string, audience: string): Promise<AudienceAnalysisResult> => {
    const response = await fetch(`${API_BASE_URL}/result/${jobId}?audience=${audience}`);
    if (!response.ok) {
        throw new Error(`Audience analysis fetch failed: ${response.statusText}`);
    }
    return response.json();
}
```

### 2. Dashboard State (COMPLETE)
**File**: `src/pages/Dashboard.tsx`

Added state variables:
```typescript
// Line ~35: Import
import { api, AudienceAnalysisResult } from "../services/api";

// Line ~185: State
const [selectedAudience, setSelectedAudience] = useState<string>("general");
const [audienceAnalysis, setAudienceAnalysis] = useState<AudienceAnalysisResult | null>(null);
const [audienceLoading, setAudienceLoading] = useState(false);
```

## 🔧 Manual Steps Required

### Step 1: Add useEffect for Audience Analysis

**Location**: `src/pages/Dashboard.tsx` around line 480 (after the cleanup useEffect)

**Add this code**:
```typescript
// Fetch audience analysis when audience changes or analysis completes
useEffect(() => {
  const fetchAudienceAnalysis = async () => {
    if (!jobId || state !== "complete") return;
    
    setAudienceLoading(true);
    try {
      const result = await api.getAudienceAnalysis(jobId, selectedAudience);
      setAudienceAnalysis(result);
    } catch (err) {
      console.error("Failed to fetch audience analysis:", err);
      setAudienceAnalysis(null);
    } finally {
      setAudienceLoading(false);
    }
  };

  fetchAudienceAnalysis();
}, [selectedAudience, jobId, state]);
```

### Step 2: Add Audience Analysis Section JSX

**Location**: `src/pages/Dashboard.tsx` around line 657 (BEFORE the "Critical Moment Detected" section)

**Find this line**:
```typescript
{/* Critical Alert */}
<ContentCard variant="alert" className="p-6 mb-8 flex items-start gap-4">
```

**Insert BEFORE it**:
```typescript
{/* Audience-Based Analysis Section */}
{audienceAnalysis && !isProcessing && !error && (
  <div className="mb-8 space-y-6 animate-fade-in">
    {/* Audience Selection */}
    <div>
      <h3 className="text-lg font-semibold mb-3">Target Audience</h3>
      <div className="flex flex-wrap gap-2">
        {[
          { key: "students", label: "Students" },
          { key: "professionals", label: "Professionals" },
          { key: "interviews", label: "Interviews" },
          { key: "marketing", label: "Marketing / Sales" },
          { key: "general", label: "General Audience" },
        ].map((audience) => (
          <Button
            key={audience.key}
            variant={selectedAudience === audience.key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedAudience(audience.key)}
            disabled={audienceLoading}
            className={cn(
              "transition-all",
              selectedAudience === audience.key && "ring-2 ring-primary ring-offset-2"
            )}
          >
            {audience.label}
          </Button>
        ))}
      </div>
    </div>

    {/* Loading State */}
    {audienceLoading && (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Analyzing for {selectedAudience}...</span>
      </div>
    )}

    {/* Analysis Cards */}
    {!audienceLoading && audienceAnalysis && (
      <div className="grid md:grid-cols-2 gap-6">
        {/* Card 1: Audience Fit Score */}
        <ContentCard variant="default" className="p-6">
          <h4 className="font-bold text-lg mb-4">Audience Fit Score</h4>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Target Audience</p>
              <p className="font-semibold capitalize">{audienceAnalysis.audience}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Fit Score</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      audienceAnalysis.fit_score >= 70 ? "bg-green-500" :
                      audienceAnalysis.fit_score >= 50 ? "bg-yellow-500" :
                      "bg-red-500"
                    )}
                    style={{ width: `${audienceAnalysis.fit_score}%` }}
                  />
                </div>
                <span className="font-bold text-2xl">{audienceAnalysis.fit_score}</span>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* Card 2: Audience Mismatches */}
        <ContentCard variant="default" className="p-6">
          <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Audience Mismatches
          </h4>
          {audienceAnalysis.mismatches.length > 0 ? (
            <ul className="space-y-2">
              {audienceAnalysis.mismatches.map((mismatch, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span className="text-muted-foreground">{mismatch}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No significant mismatches detected.</p>
          )}
        </ContentCard>

        {/* Card 3: Improvement Suggestions */}
        <ContentCard variant="default" className="p-6">
          <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Improvement Suggestions
          </h4>
          {audienceAnalysis.suggestions.length > 0 ? (
            <ul className="space-y-2">
              {audienceAnalysis.suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{suggestion}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Great job! No specific suggestions at this time.</p>
          )}
        </ContentCard>

        {/* Card 4: Structural Insights */}
        <ContentCard variant="default" className="p-6">
          <h4 className="font-bold text-lg mb-4">Structural Insights</h4>
          <div className="space-y-3">
            {Object.entries(audienceAnalysis.structural_insights).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground capitalize">
                  {key.replace(/_/g, " ")}
                </span>
                <span className="font-semibold text-sm">
                  {typeof value === "number" ? value.toFixed(1) : value}
                </span>
              </div>
            ))}
          </div>
        </ContentCard>
      </div>
    )}
  </div>
)}
```

## 📋 Backend Requirements

The backend must implement this endpoint:

```
GET /api/result/{job_id}?audience=<audience_key>
```

Where `audience_key` is one of:
- `students`
- `professionals`
- `interviews`
- `marketing`
- `general`

**Response format**:
```json
{
  "audience": "interviews",
  "fit_score": 68,
  "mismatches": [
    "Answers are too long for interview format",
    "Key points appear after explanations"
  ],
  "suggestions": [
    "Start answers with conclusions",
    "Reduce background context",
    "Use structured responses (STAR method)"
  ],
  "structural_insights": {
    "avg_response_length_sec": 42,
    "directness": "low",
    "explanation_ratio": "high"
  }
}
```

## ✅ How It Works

1. **User uploads audio** → Gets `job_id`
2. **Analysis completes** → `state` becomes `"complete"`
3. **useEffect triggers** → Fetches audience analysis for "general" (default)
4. **User selects different audience** → Re-fetches with new audience key
5. **Section appears ABOVE "Critical Moment"** → Shows 4 cards

## 🎨 UI Components

### Audience Selection (Chips)
- 5 chip-style buttons
- Single-select (only one active)
- Active chip has ring and filled style
- Disabled during loading

### 4 Cards (2x2 Grid)

1. **Audience Fit Score**
   - Shows target audience name
   - Progress bar (green/yellow/red based on score)
   - Large score number (0-100)

2. **Audience Mismatches**
   - Orange warning icon
   - Bulleted list of mismatches
   - Empty state if none

3. **Improvement Suggestions**
   - Lightbulb icon
   - Checkmark bullets
   - Encouraging tone
   - Empty state if none

4. **Structural Insights**
   - Key-value pairs
   - Formatted metrics
   - Dynamic based on backend response

## 🚫 What NOT to Change

- ❌ Don't modify "Critical Moment Detected" section
- ❌ Don't change existing tabs (Overview, Insights, Suggestions)
- ❌ Don't alter timeline or stats
- ❌ Don't change colors, spacing, or typography
- ❌ Don't add ML or analysis logic to frontend

## ✅ Testing

1. Upload an audio file
2. Wait for analysis to complete
3. Should see audience section appear
4. Default audience: "General Audience"
5. Click different audience chips
6. Should see loading spinner
7. Should see updated analysis
8. "Critical Moment Detected" should still be below

## 📊 Summary

| Component | Status | Location |
|-----------|--------|----------|
| API Types | ✅ Done | `src/services/api.ts` |
| API Method | ✅ Done | `src/services/api.ts` |
| State Variables | ✅ Done | `src/pages/Dashboard.tsx` ~line 185 |
| useEffect | ⚠️ Manual | `src/pages/Dashboard.tsx` ~line 480 |
| JSX Section | ⚠️ Manual | `src/pages/Dashboard.tsx` ~line 657 |

**Next Steps**: Add the useEffect and JSX section manually as described above.

The feature is ready to integrate! 🎉
