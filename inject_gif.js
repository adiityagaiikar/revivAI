const fs = require('fs');

let code = fs.readFileSync('apps/web/app/(main)/exercises/components/ExerciseShell.tsx', 'utf-8');

// 1. Add ALL_EXERCISES import
if (!code.includes("import { ALL_EXERCISES }")) {
  code = code.replace(
    "import { calculateFormScore, getScoreColor } from '@/lib/scoring'",
    "import { calculateFormScore, getScoreColor } from '@/lib/scoring'\nimport { ALL_EXERCISES } from '@/lib/activity-catalog'"
  );
}

// 2. Add useState and useEffect if missing
if (!code.includes("import { useRef, useCallback, useState, useEffect, type CSSProperties, type ReactNode }")) {
  code = code.replace(
    "import { useRef, useCallback, type CSSProperties, type ReactNode }",
    "import { useRef, useCallback, useState, useEffect, type CSSProperties, type ReactNode }"
  );
}

// 3. Resolve GIF from catalog
const targetLogic = `  // Form Score calculation
  const formScore = calculateFormScore(stats.angle, exerciseName);
  const scoreColor = getScoreColor(formScore);`;

const newLogic = `  // Form Score calculation
  const formScore = calculateFormScore(stats.angle, exerciseName);
  const scoreColor = getScoreColor(formScore);

  // Auto-resolve GIF from catalog
  const catalogMatch = ALL_EXERCISES.find(e => e.name === exerciseName)
  const resolvedDemoGif = demoGif || catalogMatch?.gifUrl`;

if (!code.includes("const catalogMatch = ALL_EXERCISES.find(e => e.name === exerciseName)")) {
  code = code.replace(targetLogic, newLogic);
}

// 4. Update the img src to use resolvedDemoGif
code = code.replace(
  `{demoGif && (`,
  `{resolvedDemoGif && (`
);

code = code.replace(
  `<img src={demoGif}`,
  `<img src={resolvedDemoGif}`
);

fs.writeFileSync('apps/web/app/(main)/exercises/components/ExerciseShell.tsx', code);
console.log('Injected GIF logic successfully.');
