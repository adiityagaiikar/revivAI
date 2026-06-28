# Implementation Plan: UI/UX Bug Fixes

## Overview

Four targeted bug fixes across the revivAl frontend and backend. Each task is self-contained and can be executed independently. Tasks are ordered from smallest to largest change surface.

## Tasks

- [ ] 1. Fix BarChart tooltip cursor (overall-analysis/page.tsx)
  - [ ] 1.1 Add `cursor` prop to the `<Tooltip>` component inside the `<BarChart>` in `apps/web/app/(main)/overall-analysis/page.tsx`
    - Change `<Tooltip contentStyle={tooltipStyle} />` to `<Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />`
    - This is the only change needed in this file for Bug 3
    - _Requirements: 3.1, 3.2_
  - [ ]* 1.2 Write unit test for Tooltip cursor prop
    - Assert the `<Tooltip>` component in the BarChart receives `cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}`
    - _Requirements: 3.1, 3.2_

- [ ] 2. Fix voice popup widget host layout (elevenlabs-voice-chat.tsx)
  - [ ] 2.1 Update the widget host `<div ref={hostRef}>` inline styles in `apps/web/components/elevenlabs-voice-chat.tsx`
    - Replace `style={{ minHeight: scriptReady ? 100 : 0 }}` with `style={{ minHeight: 0, maxHeight: scriptReady ? 120 : 0, overflow: 'hidden' }}`
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 2.2 Update the outer `motion.div` container positioning and styling
    - Remove `className="fixed bottom-6 right-6 z-[200] rounded-2xl overflow-hidden shadow-2xl"` and the `style` prop with `width`, `border`, `background`, `backdropFilter`, `WebkitBackdropFilter`
    - Replace with `className="absolute bottom-16 right-4 w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50"`
    - _Requirements: 1.4, 1.5_
  - [ ]* 2.3 Write unit tests for widget host layout
    - Test that widget host has `overflow: hidden` and `maxHeight: 120` when `scriptReady` is true
    - Test that widget host has `maxHeight: 0` when `scriptReady` is false
    - Test that outer container has `absolute` positioning classes
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 3. Add weekly activity backend endpoint (dashboard.js)
  - [ ] 3.1 Add the `GET /api/dashboard/weekly-activity` route to `backend/routes/dashboard.js`
    - Place it after the existing `/patient` route
    - Protect with the existing `auth` middleware
    - Compute `sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)`
    - Query `Activity.find({ userId: req.user, date: { $gte: sevenDaysAgo } })`
    - Initialise a map for all 7 days (Mon–Sun) with `{ workouts: 0, games: 0 }`
    - Iterate activities: increment `workouts` for `type === 'Fitness'`, `games` for `type === 'Cognitive'`
    - Map day index using `['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]`
    - Return array ordered Mon → Sun (always 7 entries)
    - Wrap in try/catch returning HTTP 500 `{ error: 'Server error' }` on failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [ ]* 3.2 Write property test for weekly activity aggregation logic — Property 1: response always has exactly 7 days
    - **Property 1: Weekly activity response always contains exactly 7 days**
    - **Validates: Requirements 4.4, 4.5**
    - Extract the grouping logic into a pure helper function `groupActivitiesByDay(activities)`
    - Use `fast-check` to generate random arrays of activity-like objects with random `type` and `date` values within the last 7 days
    - Assert the result always has exactly 7 entries with keys Mon–Sun
    - Minimum 100 iterations
    - Tag: **Feature: ui-ux-bug-fixes, Property 1: weekly activity response always contains exactly 7 days**
  - [ ]* 3.3 Write property test for weekly activity aggregation logic — Property 2: counts are non-negative integers
    - **Property 2: Weekly activity counts are non-negative integers**
    - **Validates: Requirements 4.4, 4.5**
    - For any generated activity array, assert all `workouts` and `games` values are `>= 0` and are integers
    - Minimum 100 iterations
    - Tag: **Feature: ui-ux-bug-fixes, Property 2: weekly activity counts are non-negative integers**
  - [ ]* 3.4 Write property test for weekly activity aggregation logic — Property 3: type partitioning
    - **Property 3: Weekly activity type partitioning**
    - **Validates: Requirements 4.2, 4.4**
    - For any generated activity array, assert `sum(workouts) === count(type === 'Fitness')` and `sum(games) === count(type === 'Cognitive')`
    - Minimum 100 iterations
    - Tag: **Feature: ui-ux-bug-fixes, Property 3: weekly activity type partitioning**
  - [ ]* 3.5 Write example-based unit test for HTTP 500 on DB error
    - Mock `Activity.find` to throw, assert the route returns HTTP 500 with `{ error: 'Server error' }`
    - _Requirements: 4.6_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Wire weekly activity data into the frontend (overall-analysis/page.tsx)
  - [ ] 5.1 Convert `weeklyData` from a `const` to a `useState` in `apps/web/app/(main)/overall-analysis/page.tsx`
    - Initial state: `['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => ({ day, workouts: 0, games: 0 }))`
    - Add `weeklyLoading` state initialised to `true`
    - _Requirements: 4.7, 4.9_
  - [ ] 5.2 Add a `useEffect` (or extend the existing one) to fetch `GET /api/dashboard/weekly-activity`
    - Use the `API` constant from `@/lib/api` and the JWT token from `localStorage`
    - On success with valid array of length 7: call `setWeeklyData(data)`
    - On success with malformed data: leave `weeklyData` as zero-initialised fallback
    - On non-OK response or network error: leave `weeklyData` as zero-initialised fallback
    - Always call `setWeeklyLoading(false)` in the `finally` block
    - _Requirements: 4.7, 4.8, 4.9, 4.10_
  - [ ] 5.3 Add a loading skeleton for the weekly chart section
    - While `weeklyLoading` is `true`, render a placeholder (e.g., `<div className="h-[260px] rounded-xl bg-white/5 animate-pulse" />`) in place of the `<ResponsiveContainer>` inside the Weekly Activity Profile card
    - _Requirements: 4.9_
  - [ ]* 5.4 Write unit tests for weekly data fetch behaviour
    - Test that `weeklyData` updates when fetch returns valid 7-item array
    - Test that `weeklyData` stays zero-initialised when fetch returns malformed data
    - Test that `weeklyData` stays zero-initialised when fetch throws a network error
    - Test that loading skeleton is shown while fetch is pending
    - _Requirements: 4.7, 4.8, 4.9, 4.10_

- [ ] 6. Create dynamic exercise route (exercises/[id]/page.tsx)
  - [ ] 6.1 Create `apps/web/app/(main)/exercises/[id]/page.tsx` with slug lookup logic
    - Import `ALL_EXERCISES` from `@/lib/activity-catalog` and `notFound` from `next/navigation`
    - Look up `exercise = ALL_EXERCISES.find(e => e.slug === params.id)`
    - Call `notFound()` if no match is found
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 6.2 Implement the Guided Mode UI for `hasAI: false` exercises
    - Add `useState` for `running` (boolean), `elapsed` (seconds), `reps` (number), `showSummary` (boolean)
    - Add `useEffect` for the countdown timer: increment `elapsed` every second while `running` is true
    - Render a timer display (MM:SS format) and a rep counter with +/- buttons
    - Render Start/Stop/Reset controls using Antigravity UI button styles
    - On Stop: set `running = false`, set `showSummary = true`
    - Render a session summary card when `showSummary` is true, showing elapsed time and rep count
    - _Requirements: 2.4, 2.8_
  - [ ] 6.3 Implement the exercise detail layout with Antigravity UI styling
    - Page header with a "Back" link (`href="/exercises"`) using the same back-button pattern as `ExerciseShell`
    - Exercise name (`text-3xl font-bold text-white`), description (`text-white/40 text-sm`)
    - Difficulty badge, duration, calories in a stats row
    - Muscle group chips (`text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/35`)
    - Instructions panel (right column) with the exercise's `gifUrl` rendered as a demo `<img>`
    - Two-column grid layout matching the `ExerciseShell` structure: `grid grid-cols-1 lg:grid-cols-3 gap-6`
    - Cards: `bg-white/[0.02] border border-white/10 backdrop-blur-md rounded-2xl`
    - _Requirements: 2.5, 2.6, 2.7_
  - [ ]* 6.4 Write property test for exercise slug lookup — Property 4: slug lookup is total
    - **Property 4: Exercise slug lookup is total**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - Use `fast-check` to draw slugs from `ALL_EXERCISES` and assert the lookup returns a non-null `ExerciseItem`
    - Use `fast-check` to generate arbitrary strings not in `ALL_EXERCISES` and assert the lookup returns `undefined`
    - Minimum 100 iterations
    - Tag: **Feature: ui-ux-bug-fixes, Property 4: exercise slug lookup is total**
  - [ ]* 6.5 Write example-based unit tests for the dynamic route
    - Test that `notFound()` is called for an unknown slug
    - Test that the correct `ExerciseItem` fields are rendered for a known `hasAI: false` slug (e.g., `plank`)
    - Test that the guided mode timer and rep counter are present for `hasAI: false` exercises
    - Test that the Back link points to `/exercises`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

- [ ] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Task 1 (BarChart cursor) is the smallest change — a single prop addition
- Task 2 (voice popup) changes two style blocks in one file
- Tasks 3 and 5 are paired: the backend endpoint (Task 3) must be deployed before the frontend fetch (Task 5) works end-to-end, but both can be developed independently
- Task 6 creates a new file; existing hardcoded exercise pages are untouched
- Property tests (3.2–3.4, 6.4) require extracting pure helper functions from the route/page logic to enable unit-level testing without a running server

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2", "3", "6"] },
    { "wave": 2, "tasks": ["4", "5"] },
    { "wave": 3, "tasks": ["7"] }
  ]
}
```
