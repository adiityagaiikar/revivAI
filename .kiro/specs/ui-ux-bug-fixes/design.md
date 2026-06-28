# Design Document: UI/UX Bug Fixes

## Overview

This document describes the technical design for four targeted bug fixes in the revivAl platform. Each fix is isolated to a specific component or file pair and does not require architectural changes. The fixes are:

1. **Voice Popup Widget Host Layout** — constrain the ElevenLabs widget host div so the audio visualizer cannot overflow into the chat input area.
2. **Dynamic Exercise Routing** — add a Next.js `[id]` catch-all route that renders a guided (non-AI) exercise page for exercises without dedicated hardcoded pages.
3. **BarChart Tooltip Cursor** — add the missing `cursor` prop to the Recharts `<Tooltip>` to replace the solid white hover block with a subtle transparent overlay.
4. **Weekly Activity Chart Dynamic Data** — replace the hardcoded `weeklyData` array with real data fetched from a new backend endpoint.

---

## Architecture

All four fixes operate within the existing monorepo structure:

```
revivAl/
├── apps/web/                          # Next.js 14 frontend
│   ├── app/(main)/
│   │   ├── fitness-assistant/page.tsx  # Bug 1: voice popup host page
│   │   ├── exercises/
│   │   │   ├── [id]/page.tsx           # Bug 2: NEW dynamic route (create)
│   │   │   └── components/ExerciseShell.tsx
│   │   └── overall-analysis/page.tsx   # Bug 3 & 4: chart fixes
│   ├── components/
│   │   └── elevenlabs-voice-chat.tsx   # Bug 1: widget host fix
│   └── lib/
│       └── activity-catalog.ts         # Bug 2: data source
└── backend/
    └── routes/dashboard.js             # Bug 4: new endpoint
```

No new packages are required. All fixes use existing dependencies: React, Next.js 14, Recharts, Framer Motion, Mongoose, and Express.

---

## Components and Interfaces

### Bug 1: Voice Popup Widget Host

**File:** `apps/web/components/elevenlabs-voice-chat.tsx`

The widget host `<div ref={hostRef}>` currently has only `minHeight: scriptReady ? 100 : 0`. The ElevenLabs ConvAI custom element renders an audio visualizer that can grow beyond this minimum, bleeding into the CTA button bar below.

**Changes:**
- Add `overflow: 'hidden'` to the widget host div's inline style.
- Change `minHeight` to a fixed `maxHeight: scriptReady ? 120 : 0` (and keep `minHeight: 0`) so the container is strictly bounded.
- Change the outer `motion.div` from `className="fixed bottom-6 right-6 z-[200] ..."` to `className="absolute bottom-16 right-4 w-80 z-50 ..."` with the glassmorphism inline styles updated to match the spec (`bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl`).

**Before (widget host):**
```tsx
<div
  ref={hostRef}
  className="w-full"
  style={{ minHeight: scriptReady ? 100 : 0 }}
/>
```

**After (widget host):**
```tsx
<div
  ref={hostRef}
  className="w-full"
  style={{
    minHeight: 0,
    maxHeight: scriptReady ? 120 : 0,
    overflow: 'hidden',
  }}
/>
```

**Before (outer container):**
```tsx
className="fixed bottom-6 right-6 z-[200] rounded-2xl overflow-hidden shadow-2xl"
style={{ width: 'min(100vw - 2rem, 400px)', border: '...', background: '...', ... }}
```

**After (outer container):**
```tsx
className="absolute bottom-16 right-4 w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50"
```

---

### Bug 2: Dynamic Exercise Route

**File to create:** `apps/web/app/(main)/exercises/[id]/page.tsx`

Next.js resolves routes from most-specific to least-specific. The existing hardcoded directories (`/exercises/squats`, `/exercises/push-ups`, etc.) will continue to take precedence over the `[id]` catch-all for their own slugs. The dynamic route only activates for slugs that have no dedicated directory.

**Page component interface:**

```tsx
// Next.js 14 App Router page props
interface PageProps {
  params: { id: string }
}

export default function ExercisePage({ params }: PageProps)
```

**Lookup logic:**
```tsx
import { ALL_EXERCISES } from '@/lib/activity-catalog'
import { notFound } from 'next/navigation'

const exercise = ALL_EXERCISES.find(e => e.slug === params.id)
if (!exercise) notFound()
```

**Guided Mode UI (for `hasAI: false` exercises):**

The page renders a self-contained guided session without any MediaPipe imports. It uses React `useState` and `useEffect` for a countdown timer and rep counter. The layout mirrors `ExerciseShell` visually but does not use the `ExerciseShell` component directly (which is tightly coupled to MediaPipe canvas/video slots).

Key UI elements:
- Page header with back link to `/exercises`
- Exercise name, description, difficulty badge, duration, calories
- Demo GIF from `exercise.gifUrl` in the instructions panel
- Muscle group chips
- Timer display (MM:SS) with Start/Stop/Reset controls
- Rep counter with +/- buttons
- Session summary card shown after stopping (elapsed time + rep count)

Styling follows Antigravity UI conventions:
- Background: `#0a0a0a` (inherited from layout)
- Cards: `bg-white/[0.02] border border-white/10 backdrop-blur-md rounded-2xl`
- Accent: cyan (`#06b6d4`) for timer/controls, violet for secondary elements
- Buttons: `bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all rounded-xl`

---

### Bug 3: BarChart Tooltip Cursor

**File:** `apps/web/app/(main)/overall-analysis/page.tsx`

A single prop addition to the existing `<Tooltip>` component inside the `<BarChart>`:

**Before:**
```tsx
<Tooltip contentStyle={tooltipStyle} />
```

**After:**
```tsx
<Tooltip
  contentStyle={tooltipStyle}
  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
/>
```

No other changes to this component.

---

### Bug 4: Weekly Activity Chart Dynamic Data

#### Backend: New Endpoint

**File:** `backend/routes/dashboard.js`

New route added after the existing `/patient` route:

```
GET /api/dashboard/weekly-activity
Auth: required (existing `auth` middleware)
Response: Array<{ day: string, workouts: number, games: number }>
```

**Algorithm:**
1. Compute `sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)`.
2. Query `Activity.find({ userId: req.user, date: { $gte: sevenDaysAgo } })`.
3. Build a map keyed by day abbreviation (`Mon`–`Sun`), initialised to `{ workouts: 0, games: 0 }` for all 7 days.
4. For each activity, compute `dayAbbr` from `activity.date` using `['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]`.
5. Increment `workouts` for `type === 'Fitness'`, `games` for `type === 'Cognitive'`.
6. Return the array ordered Mon → Sun.

**Day ordering:** The response always contains exactly 7 entries in Mon–Sun order regardless of which days have data.

#### Frontend: Fetch and Replace

**File:** `apps/web/app/(main)/overall-analysis/page.tsx`

**State additions:**
```tsx
const [weeklyData, setWeeklyData] = useState<{ day: string; workouts: number; games: number }[]>(
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => ({ day, workouts: 0, games: 0 }))
)
const [weeklyLoading, setWeeklyLoading] = useState(true)
```

**Fetch logic** (inside the existing `useEffect` or a separate one):
```tsx
const fetchWeekly = async () => {
  const token = localStorage.getItem('token')
  if (!token) { setWeeklyLoading(false); return }
  try {
    const res = await fetch(`${API}/dashboard/weekly-activity`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length === 7) {
        setWeeklyData(data)
      }
      // If malformed, weeklyData stays as zero-initialised fallback
    }
    // Non-OK response: weeklyData stays as zero-initialised fallback
  } catch {
    // Network error: weeklyData stays as zero-initialised fallback
  } finally {
    setWeeklyLoading(false)
  }
}
```

The `weeklyData` variable is converted from a `const` to a `useState` value. The `BarChart` renders `weeklyData` from state. A loading skeleton is shown while `weeklyLoading` is `true`.

---

## Data Models

### Activity (existing — no changes)

```js
{
  userId:   ObjectId,   // ref: User
  name:     String,     // e.g. "Morning Yoga"
  type:     'Fitness' | 'Cognitive',
  duration: String,     // e.g. "30 min"
  score:    String,     // e.g. "85%"
  date:     Date,       // default: Date.now
  calories: Number,     // default: 0
}
```

### Weekly Activity Response (new shape)

```ts
type WeeklyActivityDay = {
  day:      'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  workouts: number   // count of Fitness activities on this day
  games:    number   // count of Cognitive activities on this day
}
// Response: WeeklyActivityDay[] — always 7 items, Mon first
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Weekly activity response always contains exactly 7 days

*For any* authenticated user and any state of the Activity collection, the `GET /api/dashboard/weekly-activity` endpoint SHALL return an array of exactly 7 objects, one for each day Mon–Sun, with no day omitted and no day duplicated.

**Validates: Requirements 4.4, 4.5**

### Property 2: Weekly activity counts are non-negative integers

*For any* authenticated user, every `workouts` and `games` value in the weekly activity response SHALL be a non-negative integer (≥ 0).

**Validates: Requirements 4.4, 4.5**

### Property 3: Weekly activity type partitioning

*For any* set of activities in the last 7 days, the sum of all `workouts` values across the 7-day response SHALL equal the total count of `Fitness` activities in that window, and the sum of all `games` values SHALL equal the total count of `Cognitive` activities in that window.

**Validates: Requirements 4.2, 4.4**

### Property 4: Exercise slug lookup is total

*For any* slug that exists in `ALL_EXERCISES`, the dynamic route SHALL resolve to a valid exercise page (not a 404). *For any* slug that does NOT exist in `ALL_EXERCISES`, the dynamic route SHALL invoke `notFound()`.

**Validates: Requirements 2.1, 2.2, 2.3**

---

## Error Handling

| Scenario | Handling |
|---|---|
| ElevenLabs SDK fails to load | Existing `widgetError` state shows retry UI — no change needed |
| Exercise slug not in catalog | `notFound()` → Next.js 404 page |
| `GET /api/dashboard/weekly-activity` DB error | HTTP 500 `{ error: 'Server error' }` |
| Frontend weekly fetch network error | `weeklyData` stays zero-initialised; chart renders with zeros |
| Frontend weekly fetch non-OK response | `weeklyData` stays zero-initialised; chart renders with zeros |
| Frontend weekly fetch returns malformed data | `weeklyData` stays zero-initialised (Array.isArray + length check) |

---

## Testing Strategy

Property-based testing is applicable to the backend weekly-activity endpoint (pure aggregation logic) and the exercise slug lookup (pure catalog lookup). The frontend chart fix and widget host fix are UI/style changes best covered by example-based tests.

### Unit Tests

- **Bug 1:** Verify the widget host div has `overflow: hidden` and `maxHeight: 120` when `scriptReady` is true, and `maxHeight: 0` when false.
- **Bug 2:** Verify `notFound()` is called for unknown slugs; verify the correct `ExerciseItem` is passed to the page for known slugs.
- **Bug 3:** Verify the `<Tooltip>` receives `cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}` as a prop.
- **Bug 4 (frontend):** Verify `weeklyData` state updates when fetch returns valid data; verify it stays zero-initialised on error.

### Property-Based Tests

Use a property-based testing library (e.g., `fast-check` for TypeScript/JavaScript) for the backend aggregation logic.

**Property 1 test:** Generate random arrays of Activity-like objects (random `type`, random `date` within last 7 days), run the grouping logic, assert the result has exactly 7 entries with the correct day keys.

**Property 2 test:** For any generated activity array, assert all `workouts` and `games` values are `>= 0`.

**Property 3 test:** For any generated activity array, assert `sum(workouts) === count(type === 'Fitness')` and `sum(games) === count(type === 'Cognitive')`.

**Property 4 test:** For any slug drawn from `ALL_EXERCISES`, assert the lookup returns a non-null `ExerciseItem`. For any string not in `ALL_EXERCISES`, assert the lookup returns `undefined`.

Each property test MUST run a minimum of 100 iterations.

Tag format: **Feature: ui-ux-bug-fixes, Property {N}: {property_text}**
