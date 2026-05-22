export interface ExerciseConfig {
  targetAngle: number;
  minAcceptableAngle: number;
  isInverse: boolean;
}

export const EXERCISE_SCORING_CONFIG: Record<string, ExerciseConfig> = {
  'squats': { targetAngle: 90, minAcceptableAngle: 160, isInverse: true },
  'arm-stretch': { targetAngle: 180, minAcceptableAngle: 120, isInverse: false },
  'burpees': { targetAngle: 180, minAcceptableAngle: 120, isInverse: false }, // placeholder
  'lunges': { targetAngle: 90, minAcceptableAngle: 160, isInverse: true },
  'jumping-jacks': { targetAngle: 180, minAcceptableAngle: 120, isInverse: false },
  'push-ups': { targetAngle: 90, minAcceptableAngle: 160, isInverse: true }
};

export function calculateFormScore(currentAngle: number, exerciseId: string): number {
  const config = EXERCISE_SCORING_CONFIG[exerciseId.toLowerCase()];
  if (!config) return 0; // Default if no config found

  const { targetAngle, minAcceptableAngle, isInverse } = config;
  let rawScore = 0;

  if (currentAngle === 0) return 0; // Invalid/uninitialized angle

  if (isInverse) {
    // Lower angle is better. E.g., Squats: min 160, target 90.
    // Score increases as angle decreases from 160 to 90.
    if (currentAngle >= minAcceptableAngle) rawScore = 0;
    else if (currentAngle <= targetAngle) rawScore = 1;
    else {
      rawScore = (minAcceptableAngle - currentAngle) / (minAcceptableAngle - targetAngle);
    }
  } else {
    // Higher angle is better.
    if (currentAngle <= minAcceptableAngle) rawScore = 0;
    else if (currentAngle >= targetAngle) rawScore = 1;
    else {
      rawScore = (currentAngle - minAcceptableAngle) / (targetAngle - minAcceptableAngle);
    }
  }

  const finalScore = Math.max(0, Math.min(100, rawScore * 100));
  return Math.round(finalScore);
}

export function getScoreColor(score: number): string {
  if (score < 60) return '#ef4444'; // Red for poor form
  if (score < 90) return '#eab308'; // Yellow for ok form
  return '#06b6d4'; // Neon Cyan/Green for great form
}
