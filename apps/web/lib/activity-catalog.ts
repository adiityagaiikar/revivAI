/** Canonical slugs — must match routes under /exercises/* and /cognitive-games/* */

export const ALLOWED_EXERCISE_SLUGS = [
  'push-ups',
  'squats',
  'warrior-pose',
  'lunges',
  'burpees',
  'jumping-jacks',
  'mountain-climbers',
  'yoga-flow',
  'hand-folding',
  'plank',
  'glute-bridges',
  'high-knees',
] as const

export const ALLOWED_COGNITIVE_GAME_SLUGS = [
  'corsi-block-tapping',
  'stroop-effect',
  '1-back-task',
  'pattern-matrix',
  'word-pairs',
] as const


export type ExerciseSlug = (typeof ALLOWED_EXERCISE_SLUGS)[number]
export type CognitiveGameSlug = (typeof ALLOWED_COGNITIVE_GAME_SLUGS)[number]

export type ExerciseItem = {
  slug: ExerciseSlug
  name: string
  category: string
  duration: string
  calories: number
  difficulty: string
  hasAI: boolean
  gifUrl: string
  thumbnailUrl: string
  description: string
  muscleGroups: string[]
}

export const ALL_EXERCISES: ExerciseItem[] = [
  {
    slug: 'push-ups',
    name: 'Push-ups',
    category: 'Strength',
    duration: '5 min',
    calories: 50,
    difficulty: 'Beginner',
    hasAI: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Push-up.gif',
    description: 'Build upper-body strength with AI elbow-angle tracking.',
    muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
  },
  {
    slug: 'squats',
    name: 'Squats',
    category: 'Strength',
    duration: '5 min',
    calories: 60,
    difficulty: 'Beginner',
    hasAI: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Squats.gif',
    description: 'Strengthen quads and glutes with real-time knee-angle feedback.',
    muscleGroups: ['Quads', 'Glutes', 'Hamstrings'],
  },
  {
    slug: 'warrior-pose',
    name: 'Warrior Pose',
    category: 'Core',
    duration: '3 min',
    calories: 30,
    difficulty: 'Intermediate',
    hasAI: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Warrior_II_pose.jpg/320px-Warrior_II_pose.jpg',
    description: 'Improve balance and stability with hold-time tracking.',
    muscleGroups: ['Hip Flexors', 'Core', 'Legs'],
  },
  {
    slug: 'lunges',
    name: 'Lunges',
    category: 'Strength',
    duration: '5 min',
    calories: 70,
    difficulty: 'Intermediate',
    hasAI: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1434596922112-19c563067271?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Lunges_2.gif',
    description: 'Target legs and glutes with depth-tracking AI feedback.',
    muscleGroups: ['Quads', 'Glutes', 'Calves'],
  },
  {
    slug: 'burpees',
    name: 'Burpees',
    category: 'Cardio',
    duration: '5 min',
    calories: 100,
    difficulty: 'Advanced',
    hasAI: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Burpee_exercise.gif',
    description: 'Full-body explosive movement for maximum calorie burn.',
    muscleGroups: ['Full Body', 'Core', 'Cardio'],
  },
  {
    slug: 'jumping-jacks',
    name: 'Jumping Jacks',
    category: 'Cardio',
    duration: '5 min',
    calories: 80,
    difficulty: 'Beginner',
    hasAI: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Jumping_Jack_2_-_Animated.gif',
    description: 'Classic warm-up cardio with rep counting via pose detection.',
    muscleGroups: ['Full Body', 'Cardio'],
  },
  {
    slug: 'mountain-climbers',
    name: 'Mountain Climbers',
    category: 'Cardio',
    duration: '3 min',
    calories: 60,
    difficulty: 'Intermediate',
    hasAI: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Mountain-climber-exercise.gif',
    description: 'High-intensity core and cardio drill tracked in real time.',
    muscleGroups: ['Core', 'Shoulders', 'Cardio'],
  },
  {
    slug: 'yoga-flow',
    name: 'Yoga Flow',
    category: 'Flexibility',
    duration: '15 min',
    calories: 90,
    difficulty: 'All Levels',
    hasAI: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Hatha_yoga_asanas.jpg/320px-Hatha_yoga_asanas.jpg',
    description: 'Guided flow sequence with joint-angle form coaching.',
    muscleGroups: ['Full Body', 'Flexibility'],
  },
  {
    slug: 'hand-folding',
    name: 'Hand Folding',
    category: 'Strength',
    duration: '5 min',
    calories: 30,
    difficulty: 'Beginner',
    hasAI: true,
    thumbnailUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="%230b1120"/><stop offset="1" stop-color="%23111f3a"/></linearGradient></defs><rect width="800" height="500" fill="url(%23g)"/><circle cx="400" cy="250" r="134" fill="none" stroke="%2322d3ee" stroke-width="14" opacity="0.8"/><path d="M350 304c20 28 60 40 96 28 28-9 49-32 56-58 5-19 2-39-5-57l-22-46c-7-15-24-22-39-16-14 5-22 20-18 34l15 52-34-72c-7-15-24-22-39-16-14 5-22 20-18 34l31 78-38-71c-8-14-26-19-40-10-14 9-18 28-10 42l25 42c-18 3-31 18-31 36 0 7 2 14 5 20 5 10 12 18 19 28z" fill="%23a78bfa" opacity="0.78"/></svg>',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Biceps_curl.gif',
    description: 'Elbow flexion rehab exercise with precise angle measurement.',
    muscleGroups: ['Biceps', 'Forearms'],
  },
  {
    slug: 'plank',
    name: 'Plank',
    category: 'Core',
    duration: '2 min',
    calories: 20,
    difficulty: 'Beginner',
    hasAI: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Biceps_curl.gif',
    description: 'Isometric core hold that builds deep abdominal and spinal stability.',
    muscleGroups: ['Core', 'Shoulders', 'Glutes'],
  },
  {
    slug: 'glute-bridges',
    name: 'Glute Bridges',
    category: 'Strength',
    duration: '4 min',
    calories: 40,
    difficulty: 'Beginner',
    hasAI: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Biceps_curl.gif',
    description: 'Posterior chain activation focusing on glutes and hip extension.',
    muscleGroups: ['Glutes', 'Hamstrings', 'Lower Back'],
  },
  {
    slug: 'high-knees',
    name: 'High Knees',
    category: 'Cardio',
    duration: '3 min',
    calories: 50,
    difficulty: 'Beginner',
    hasAI: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Jumping_Jack_2_-_Animated.gif',
    description: 'Fast-paced running in place that elevates heart rate and engages the core.',
    muscleGroups: ['Hip Flexors', 'Core', 'Cardio'],
  },
]

export type CognitiveGameItem = {
  slug: CognitiveGameSlug
  name: string
  description: string
  category: string
  difficulty: string
  iconName: 'Brain' | 'Zap' | 'Target' | 'Gamepad2'
}

export const ALL_COGNITIVE_GAMES: CognitiveGameItem[] = [
  { slug: 'corsi-block-tapping', name: 'Corsi Block-Tapping', description: 'Test your spatial memory by reproducing increasingly complex block sequences.', category: 'Memory', difficulty: 'Medium', iconName: 'Brain' },
  { slug: 'stroop-effect', name: 'Stroop Effect', description: 'Measure cognitive flexibility by identifying text colors while ignoring the written word.', category: 'Speed', difficulty: 'Medium', iconName: 'Zap' },
  { slug: '1-back-task', name: '1-Back Task', description: 'Continuously update your working memory to determine if current items match previous ones.', category: 'Logic', difficulty: 'Hard', iconName: 'Target' },
  { slug: 'pattern-matrix', name: 'Pattern Matrix', description: 'Enhance visual memory through complex pattern recognition and immediate reproduction.', category: 'Visual Memory', difficulty: 'Medium', iconName: 'Gamepad2' },
  { slug: 'word-pairs', name: 'Word Pairs', description: 'Strengthen associative memory by memorizing pairs of words and recalling them under pressure.', category: 'Language', difficulty: 'Medium', iconName: 'Gamepad2' },
]


export type PatientPlan = {
  enabled: boolean
  exerciseSlugs: string[]
  gameSlugs: string[]
}

export function filterExercisesByPlan(exercises: ExerciseItem[], plan: PatientPlan | null): ExerciseItem[] {
  if (!plan?.enabled) return exercises
  const allowed = new Set(plan.exerciseSlugs)
  return exercises.filter((e) => allowed.has(e.slug))
}

export function filterGamesByPlan(games: CognitiveGameItem[], plan: PatientPlan | null): CognitiveGameItem[] {
  if (!plan?.enabled) return games
  const allowed = new Set(plan.gameSlugs)
  return games.filter((g) => allowed.has(g.slug))
}
