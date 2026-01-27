# 🔍 How Critical Moments Are Detected

## 🎯 Overview

The system analyzes your speech and calculates a **risk score (0-100%)** for every moment. The moment with the **highest risk score (>70%)** becomes the **Critical Moment**.

## 📊 Risk Calculation Process

### **Step 1: Analyze Every Time Point**

The system divides your speech into 20-60 time points (about every 5 seconds) and analyzes each one.

### **Step 2: Calculate Risk Score**

For each time point, it starts with a **base risk of 20%** and adds risk based on 6 factors:

## 🔢 The 6 Risk Factors

### **1. Speech Rate (Speed)** ⚡

**Too Fast:**
- **>220 words/minute**: +35% risk
  - "You're speaking at 235 words per minute. This is too fast - your audience can't keep up"
- **>190 words/minute**: +20% risk
  - "You're speaking at 195 words per minute. Slow down a bit"

**Too Slow:**
- **<90 words/minute**: +30% risk
  - "You're speaking at only 85 words per minute. This is too slow - people will get bored"
- **<110 words/minute**: +15% risk
  - "You're speaking at 105 words per minute. Speed up a little"

**Optimal**: 140-160 words/minute (no risk added)

---

### **2. Filler Words** 🗣️

Counts "um", "uh", "like", "you know", "so", "actually", "basically", "literally"

- **5+ fillers in one segment**: +30% risk
  - "You said 'um', 'uh', or 'like' 7 times in this short section"
- **3-4 fillers**: +15% risk
  - "You used 3 filler words here. Try to pause silently instead"

**Optimal**: 0-2 fillers per segment

---

### **3. Sentence Length** 📝

- **50+ words without break**: +30% risk
  - "This section has 65 words without any break. People can't process this much at once"
- **40-50 words**: +15% risk
  - "This 45-word section is too long. Break it into smaller parts"

**Optimal**: 15-30 words per sentence

---

### **4. Language Complexity** 📚

Uses Flesch Reading Ease score (0-100, higher = easier)

- **Score <20 (college level)**: +30% risk
  - "The words you're using are too complicated. Use simpler language"
- **Score <30 (difficult)**: +15% risk
  - "This section uses complex words that might confuse your audience"

**Optimal**: Score >50 (conversational level)

---

### **5. Energy/Monotone** 🎤

Analyzes voice volume and variation using RMS (Root Mean Square)

- **Extremely low energy** (2.0 std below mean): +35% risk
  - "Your voice becomes very flat and monotone here. You sound bored"
- **Low energy** (1.5 std below mean): +20% risk
  - "Your energy drops noticeably here. Try to sound more enthusiastic"

**Optimal**: Consistent energy with natural variation

---

### **6. Silence/Pauses** 🔇

Detects gaps where no speech is happening

- **6+ seconds of silence**: +45% risk
  - "⚠️ No speech detected from 1:23 - 1:35 (12 seconds). Way too long"
- **4-6 seconds**: +30% risk
  - "🔇 No speech detected from 0:45 - 0:50 (5 seconds). Too long"
- **3-4 seconds**: +20% risk
  - "⏸️ Silence detected from 2:10 - 2:13 (3.5 seconds). Getting awkward"

**Optimal**: Pauses under 3 seconds

---

## 🎯 Example Calculation

Let's say at **1:23** in your speech:

```
Base Risk: 20%

+ Speaking too fast (235 wpm): +35%
+ 5 filler words: +30%
+ Low energy: +20%
+ 3-second pause: +20%

Total Risk: 20 + 35 + 30 + 20 + 20 = 125%
Capped at: 100%

Final Risk: 100%
```

This becomes a **Critical Moment** because risk > 70%!

---

## 🏆 Selecting THE Critical Moment

### **Step 1: Find All High-Risk Points**
```python
# Collect all moments with risk > 70%
high_risk_moments = [
    {"time": "0:45", "risk": 75%},
    {"time": "1:23", "risk": 100%},  # ← Highest!
    {"time": "2:10", "risk": 80%}
]
```

### **Step 2: Pick the Highest**
```python
# Find the single worst moment
critical_moment = max(high_risk_moments, key=lambda x: x["risk"])
# Result: 1:23 with 100% risk
```

### **Step 3: Show Only That One**
Only the **highest risk moment** is shown as "Critical Moment" in the UI.

---

## 📋 Real Example

### **Input Audio:**
```
0:00 - 0:15: "So, um, today I want to, like, talk about..."
             (Many fillers, slow pace)
             
0:15 - 0:30: "The implementation of our infrastructure 
              optimization paradigm necessitates..."
             (Very complex language, fast pace)
             
0:30 - 0:45: [8 seconds of silence]
             (No speech)
             
0:45 - 1:00: "And that's basically what we're doing."
             (Normal - no issues)
```

### **Risk Scores:**
```
0:07 (middle of first section):
  - Filler words (5+): +30%
  - Speaking slow (95 wpm): +30%
  - Total: 20 + 30 + 30 = 80%

0:22 (middle of second section):
  - Speaking fast (225 wpm): +35%
  - Complex language: +30%
  - Total: 20 + 35 + 30 = 85%

0:37 (during silence):
  - Silence (8 seconds): +45%
  - Total: 20 + 45 = 65% (not critical)

0:52 (last section):
  - No issues
  - Total: 20%
```

### **Critical Moment Selected:**
```
Time: 0:22 (85% risk - highest!)
Problem: Speaking too fast + complex language
Message: "You're speaking at 225 words per minute 
         using very complicated words..."
```

---

## 🎨 How It Appears in UI

### **Dashboard:**
```
🚨 Critical Moment Detected

At 0:22 - 0:32
Your audience is 85% likely to completely lose attention.
This is the WORST moment in your speech.

What's Wrong:
You're speaking at 225 words per minute. This is too fast - 
your audience can't keep up. The words you're using are too 
complicated. Most people won't understand this.

What You Said:
"The implementation of our infrastructure optimization 
paradigm necessitates..."
```

### **Timeline:**
```
0:07 - Risk: 80% (High)
0:22 - Risk: 85% (CRITICAL) ← Marked in red
0:37 - Risk: 65% (Medium)
0:52 - Risk: 20% (Low)
```

---

## 💡 Key Points

### **Why Only One Critical Moment?**
- Focuses your attention on the **worst** problem
- Easier to fix one thing than many
- Most impactful improvement

### **What If Multiple Moments Have Same Risk?**
- The **first one** chronologically is chosen
- Encourages fixing problems early in speech

### **What If No Moment >70% Risk?**
- No critical moment is shown
- Shows "Great news! No critical moments detected"

---

## 🔧 Technical Implementation

### **Code Flow:**
```python
# 1. Analyze each time point
for time_point in timeline:
    risk = 20  # Base risk
    
    # Add risk from each factor
    if speech_rate > 220:
        risk += 35
    if filler_count >= 5:
        risk += 30
    if silence_duration > 6:
        risk += 45
    # ... etc
    
    # Cap at 100%
    risk = min(risk, 100)
    
    # Store if high risk
    if risk > 70:
        drop_risks.append({
            "time": time_str,
            "risk": risk,
            "problems": detailed_problems
        })

# 2. Find highest risk
if drop_risks:
    critical_moment = max(drop_risks, key=lambda x: x["risk"])
    
# 3. Return to frontend
return {
    "critical_moment": critical_moment,
    "timeline": timeline
}
```

---

## 📊 Summary Table

| Factor | Threshold | Risk Added | Example |
|--------|-----------|------------|---------|
| **Too Fast** | >220 wpm | +35% | 235 wpm |
| **Too Slow** | <90 wpm | +30% | 85 wpm |
| **Many Fillers** | 5+ | +30% | 7 "um"s |
| **Long Sentence** | 50+ words | +30% | 65 words |
| **Complex Words** | Score <20 | +30% | College level |
| **Low Energy** | -2.0 std | +35% | Monotone |
| **Long Silence** | 6+ sec | +45% | 12 seconds |

**Base Risk**: 20%
**Maximum Risk**: 100%
**Critical Threshold**: >70%

---

## 🎉 Result

The system finds the **single worst moment** in your speech where your audience is most likely to lose attention, and tells you **exactly what's wrong** and **how to fix it**!
