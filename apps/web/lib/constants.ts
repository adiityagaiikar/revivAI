export const COMMON_ISSUES = [
  'Post-Op Recovery',
  'Joint Pain',
  'Sports Injury',
  'Cognitive Fog',
  'Memory Issues',
  'Stroke Rehab',
  'Chronic Back Pain',
  'Mobility Loss',
] as const

export type CommonIssue = (typeof COMMON_ISSUES)[number]
