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
    gifUrl: 'https://media.giphy.com/media/xT8qBvH1pAhtfSUKc8/giphy.gif',
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
    gifUrl: 'https://media.giphy.com/media/11MjPqE1h5k98c/giphy.gif',
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
    gifUrl: 'https://media.giphy.com/media/3o7TKrEzvLbgqjSYez/giphy.gif',
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
    gifUrl: 'https://media.giphy.com/media/3o6Zt8Jb76z2pX40ve/giphy.gif',
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
    gifUrl: 'https://media.giphy.com/media/l41YgC9JyO4uLkJUI/giphy.gif',
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
    gifUrl: 'https://media.giphy.com/media/xT4uQqIOaQpI0Q1NPG/giphy.gif',
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
    gifUrl: 'https://media.giphy.com/media/3o7qDKdZweYqN8WnUQ/giphy.gif',
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
    gifUrl: 'https://media.giphy.com/media/l41lISj1vQe8Q1qWc/giphy.gif',
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
    thumbnailUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?q=80&w=800&auto=format&fit=crop',
    gifUrl: 'https://media.giphy.com/media/3o7TKM8bL6w7Yw9yZG/giphy.gif',
    description: 'Elbow flexion rehab exercise with precise angle measurement.',
    muscleGroups: ['Biceps', 'Forearms'],
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
  { slug: 'pattern-matrix', name: 'Pattern Matrix', description: 'Enhance visual memory through complex pattern recognition and immediate reproduction.', category: 'Language', difficulty: 'Medium', iconName: 'Gamepad2' },
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
