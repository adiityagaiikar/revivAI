/**
 * seedLocalStorage.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Paste the contents of this file into your browser DevTools console
 * while on any revivAl page (e.g. http://localhost:3000/cognitive-games).
 *
 * It seeds realistic, trending cognitive game scores into localStorage
 * so the Performance Trend chart and Recent Scores panel have data immediately.
 * ─────────────────────────────────────────────────────────────────────────────
 */

;(function seedRevivAlGameScores() {
  const GAMES = [
    'corsi-block-tapping',
    'stroop-effect',
    '1-back-task',
    'pattern-matrix',
    'word-pairs',
  ]

  const LABELS = {
    'corsi-block-tapping': (i) => `Level: ${3 + Math.floor(i / 3)}`,
    'stroop-effect':       (i) => `Score: ${8 + i}`,
    '1-back-task':         (i) => `Score: ${i + 2}`,
    'pattern-matrix':      (i) => `Level: ${1 + Math.floor(i / 2)}`,
    'word-pairs':          (i) => `Score: ${Math.min(4, 1 + Math.floor(i / 2))}/4`,
  }

  // Trending score: starts ~50, climbs to ~85 with noise
  const trendScore = (i, total) => {
    const base = 48 + Math.floor((i / total) * 35)
    const noise = Math.floor(Math.random() * 10) - 4
    return Math.min(100, Math.max(10, base + noise))
  }

  // Random date within last N days
  const daysAgo = (n) =>
    new Date(Date.now() - Math.floor(Math.random() * n) * 86400000 - Math.floor(Math.random() * 86400000)).toISOString()

  let total = 0

  GAMES.forEach((slug) => {
    const key = `cg_scores_${slug}`
    const sessions = 12 + Math.floor(Math.random() * 6) // 12–17 sessions per game
    const entries = []

    for (let i = 0; i < sessions; i++) {
      entries.push({
        score: trendScore(i, sessions),
        date:  daysAgo(28),
        label: LABELS[slug](i),
      })
    }

    // Sort chronologically
    entries.sort((a, b) => new Date(a.date) - new Date(b.date))

    localStorage.setItem(key, JSON.stringify(entries))
    total += entries.length
    console.log(`  ✓ ${slug}: ${entries.length} sessions seeded (${entries[0].score}% → ${entries[entries.length-1].score}%)`)
  })

  console.log(`\n✓ Seeded ${total} cognitive game score entries into localStorage.`)
  console.log('  Refresh /cognitive-games to see the Performance Trend chart populate.')
})()
