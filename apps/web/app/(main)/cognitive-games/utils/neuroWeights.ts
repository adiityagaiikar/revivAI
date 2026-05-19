export function calculateProcessingSpeedWCI(correctAnswers: number, totalAnswers: number, totalTimeInSeconds: number) {
  // A simple placeholder logic for WCI (Work Capacity Index) score
  const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) : 0;
  const speed = totalAnswers / Math.max(1, totalTimeInSeconds);
  
  // Create an arbitrary score out of 100
  const score = Math.round((accuracy * 50) + (speed * 50));
  
  return {
    score: Math.min(100, Math.max(0, score)),
    accuracy: Math.round(accuracy * 100),
    speed: Number(speed.toFixed(2))
  };
}
