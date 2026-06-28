# Requirements Document

## Introduction

This document captures the requirements for fixing four UI/UX bugs in the revivAl platform — a Next.js 14 monorepo rehabilitation app with an "Antigravity UI" dark-mode design system. The bugs span the voice assistant popup, exercise routing, a chart hover artifact, and a hardcoded weekly activity chart. Each fix is self-contained and targets a specific file or pair of files.

## Glossary

- **Voice_Popup**: The `ElevenLabsVoiceChat` floating panel rendered in `elevenlabs-voice-chat.tsx`.
- **Widget_Host**: The `<div ref={hostRef}>` element inside `ElevenLabsVoiceChat` where the third-party ElevenLabs ConvAI custom element is mounted.
- **Exercise_Page**: A Next.js page under `apps/web/app/(main)/exercises/` that renders a single exercise.
- **Dynamic_Route**: The Next.js `[id]` catch-all route at `apps/web/app/(main)/exercises/[id]/page.tsx`.
- **Guided_Mode**: A timer/rep-counter UI for exercises where `hasAI: false` — no MediaPipe camera tracking.
- **ExerciseShell**: The shared Antigravity UI wrapper component at `apps/web/app/(main)/exercises/components/ExerciseShell.tsx`.
- **Activity_Catalog**: The `ALL_EXERCISES` array exported from `apps/web/lib/activity-catalog.ts`.
- **BarChart**: The Recharts `<BarChart>` component rendering the Weekly Activity Profile in `overall-analysis/page.tsx`.
- **Tooltip_Cursor**: The semi-transparent hover overlay rendered by Recharts `<Tooltip>` over bar columns.
- **Weekly_Activity_Endpoint**: The new backend route `GET /api/dashboard/weekly-activity` that returns per-day activity counts.
- **Dashboard_Route**: The Express router at `backend/routes/dashboard.js`.
- **Activity_Model**: The Mongoose model at `backend/models/Activity.js` with fields `userId`, `type`, and `date`.
- **Antigravity_UI**: The revivAl design system — `#0a0a0a` background, glassmorphism cards, cyan/violet neon accents.

---

## Requirements

### Requirement 1: Voice Popup Widget Host Layout Fix

**User Story:** As a user of the Fitness Assistant page, I want the voice chat popup to display correctly without the ElevenLabs audio visualizer bleeding into the text input area, so that I can use both the chat input and the voice assistant without visual overlap.

#### Acceptance Criteria

1. WHEN the `ElevenLabsVoiceChat` panel is open and the script is ready, THE `Widget_Host` div SHALL have `overflow: hidden` applied so the ElevenLabs widget cannot render outside its container bounds.
2. WHEN the `ElevenLabsVoiceChat` panel is open and the script is ready, THE `Widget_Host` div SHALL have a fixed maximum height of `120px` so the audio visualizer is constrained and does not overlap the CTA button bar below it.
3. WHEN the `ElevenLabsVoiceChat` panel is open and the script is not yet ready, THE `Widget_Host` div SHALL have a height of `0` so no empty space is reserved.
4. THE `Voice_Popup` outer motion container SHALL use `position: absolute` (not `fixed`) with classes `bottom-16 right-4 w-80` so it is positioned relative to the page layout rather than the viewport, matching the user-specified layout spec.
5. THE `Voice_Popup` outer motion container SHALL retain its glassmorphism styling: `bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50`.
6. WHEN the `ElevenLabsVoiceChat` panel is open, THE `Voice_Popup` SHALL remain fully visible and not overlap the chat input bar in `fitness-assistant/page.tsx`.

---

### Requirement 2: Dynamic Exercise Routing for Non-AI Exercises

**User Story:** As a patient, I want to open any exercise from the exercise library — including Plank, Glute Bridges, and High Knees — without hitting a 404 page, so that I can follow guided workouts for exercises that do not have AI tracking.

#### Acceptance Criteria

1. WHEN a user navigates to `/exercises/plank`, `/exercises/glute-bridges`, or `/exercises/high-knees`, THE `Dynamic_Route` SHALL render a valid exercise detail page instead of a 404 error.
2. WHEN the `Dynamic_Route` receives a slug that exists in `Activity_Catalog`, THE `Dynamic_Route` SHALL look up the matching `ExerciseItem` from `ALL_EXERCISES` and render its `name`, `description`, `muscleGroups`, `duration`, `calories`, and `difficulty`.
3. WHEN the `Dynamic_Route` receives a slug that does NOT exist in `Activity_Catalog`, THE `Dynamic_Route` SHALL redirect the user to `/exercises` using Next.js `notFound()`.
4. WHEN a user navigates to an exercise page where the exercise has `hasAI: false`, THE `Dynamic_Route` SHALL render a `Guided_Mode` UI that includes a countdown timer and a rep counter, without initialising MediaPipe or requesting camera access.
5. WHEN a user navigates to an exercise page where the exercise has `hasAI: false`, THE `Dynamic_Route` SHALL display the exercise's `gifUrl` as a demo animation in the instructions panel.
6. THE `Dynamic_Route` page SHALL use `Antigravity_UI` styling consistent with `ExerciseShell` — `#0a0a0a` background, glassmorphism cards (`bg-white/[0.02] border border-white/10 backdrop-blur-md rounded-2xl`), and cyan/violet neon accents.
7. THE `Dynamic_Route` page SHALL include a "Back" link that navigates to `/exercises`.
8. WHEN a user completes a guided session (stops the timer), THE `Dynamic_Route` SHALL display a session summary showing elapsed time and rep count.
9. THE existing hardcoded exercise pages (squats, push-ups, etc.) SHALL remain unmodified and continue to function as before.

---

### Requirement 3: BarChart Tooltip Cursor Fix

**User Story:** As a user viewing the Overall Analysis page, I want the weekly activity bar chart to show a subtle transparent hover highlight instead of a solid white block, so that the chart remains readable when I hover over bars.

#### Acceptance Criteria

1. WHEN a user hovers over a bar in the Weekly Activity Profile `BarChart`, THE `Tooltip_Cursor` SHALL render as a semi-transparent overlay with `fill: 'rgba(255, 255, 255, 0.05)'` instead of the default solid white fill.
2. THE `<Tooltip>` component in the `BarChart` SHALL have the `cursor` prop set to `{{ fill: 'rgba(255, 255, 255, 0.05)' }}`.
3. WHEN a user hovers over a bar, THE chart bars and labels underneath the cursor overlay SHALL remain visible and legible, and THE `BarChart` SHALL NOT hide or obscure bars and labels during hover.

---

### Requirement 4: Weekly Activity Chart Dynamic Data

**User Story:** As a patient, I want the Weekly Activity Profile chart to show my real workout and cognitive game activity from the past 7 days, so that I can accurately track my weekly progress instead of seeing placeholder data.

#### Acceptance Criteria

1. THE `Dashboard_Route` SHALL expose a new endpoint `GET /api/dashboard/weekly-activity` protected by the existing `auth` middleware.
2. WHEN the `Weekly_Activity_Endpoint` is called by an authenticated user, THE `Dashboard_Route` SHALL query the `Activity_Model` for all activities belonging to that user with a `date` field within the last 7 days.
3. WHEN grouping activities by day, THE `Dashboard_Route` SHALL map each activity's `date` to its day-of-week abbreviation (`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`) using the local date of the activity.
4. THE `Weekly_Activity_Endpoint` SHALL return a JSON array of exactly 7 objects, one per day of the week starting from Monday, in the format `[{ day: 'Mon', workouts: N, games: N }, ...]` where `workouts` counts activities with `type: 'Fitness'` and `games` counts activities with `type: 'Cognitive'`.
5. WHEN a day has no recorded activities, THE `Weekly_Activity_Endpoint` SHALL return `{ day: '<Day>', workouts: 0, games: 0 }` for that day rather than omitting it.
6. IF the `Weekly_Activity_Endpoint` encounters a database error, THEN THE `Dashboard_Route` SHALL return HTTP 500 with `{ error: 'Server error' }`.
7. WHEN the `overall-analysis/page.tsx` component mounts, THE `OverallAnalysis_Page` SHALL fetch `GET /api/dashboard/weekly-activity` using the `API` constant and the stored JWT token from `localStorage`.
8. WHEN the fetch succeeds, THE `OverallAnalysis_Page` SHALL replace the hardcoded `weeklyData` array with the response data and re-render the `BarChart`.
9. WHEN the fetch is in progress, THE `OverallAnalysis_Page` SHALL display a loading state for the weekly chart section.
10. IF the fetch fails or returns a non-OK response, THEN THE `OverallAnalysis_Page` SHALL fall back to displaying the `BarChart` with all-zero data for each day so the chart remains visible without crashing.
