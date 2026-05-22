const fs = require('fs');
let code = fs.readFileSync('apps/web/app/(main)/exercises/components/ExerciseShell.tsx', 'utf-8');

// 1. Imports
code = code.replace(
  "import { motion, AnimatePresence } from 'framer-motion'",
  "import { calculateFormScore, getScoreColor } from '@/lib/scoring'\nimport { motion, AnimatePresence } from 'framer-motion'"
);

// 2. Logic inside ExerciseShell
const logicToInsert = `
  const isGoodFeedback = stats.feedback.startsWith('✓')

  // Form Score calculation
  const formScore = calculateFormScore(stats.angle, exerciseName);
  const scoreColor = getScoreColor(formScore);

  // Perfect Rep Flare logic
  const [perfectRepFlare, setPerfectRepFlare] = useState(false);
  const lastRepRef = useRef(stats.reps);
  const perfectTriggeredRef = useRef(false);

  useEffect(() => {
    if (stats.reps !== lastRepRef.current) {
      lastRepRef.current = stats.reps;
      perfectTriggeredRef.current = false;
    }

    if (running && formScore === 100 && !perfectTriggeredRef.current) {
      perfectTriggeredRef.current = true;
      setPerfectRepFlare(true);
      setTimeout(() => setPerfectRepFlare(false), 800);
    }
  }, [formScore, stats.reps, running]);
`;
code = code.replace("const isGoodFeedback = stats.feedback.startsWith('✓')", logicToInsert);

// 3. Flare styling on video container
code = code.replace(
  `className="relative aspect-video rounded-xl overflow-hidden bg-black border-2 border-transparent transition-colors"`,
  `animate={perfectRepFlare ? { boxShadow: '0 0 60px rgba(6, 182, 212, 0.5), inset 0 0 30px rgba(6, 182, 212, 0.3)', borderColor: 'rgba(6, 182, 212, 0.8)' } : { boxShadow: '0 0 0px rgba(6, 182, 212, 0)', borderColor: 'rgba(255, 255, 255, 0)' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative aspect-video rounded-xl overflow-hidden bg-black border-2 border-transparent transition-colors"`
);

// 4. Form Score UI Box
const formScoreUI = `
            {/* ── Form Score Bar (right side) ── */}
            <AnimatePresence>
              {running && (
                <motion.div
                  key="form-score"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="absolute top-4 right-4 bottom-4 w-12 z-30 flex flex-col items-center justify-end rounded-full border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden py-4"
                >
                  <span className="text-white/60 text-[8px] font-bold tracking-widest absolute top-4">SCORE</span>
                  <div className="w-2 bg-white/10 rounded-full flex-1 mx-auto my-6 relative overflow-hidden flex flex-col justify-end">
                    <motion.div 
                      className="w-full rounded-full transition-colors duration-300"
                      animate={{ height: \`\${formScore}%\`, backgroundColor: scoreColor }}
                      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                    />
                  </div>
                  <span className="text-white font-bold text-sm" style={{ color: scoreColor }}>{formScore}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Live badge (top-right, shifted left) ── */}
`;
code = code.replace("{/* ── Live badge (top-right) ── */}", formScoreUI);
code = code.replace("absolute top-4 right-4 z-30 flex items-center", "absolute top-4 right-20 z-30 flex items-center");

// 5. Demo GIF extraction
const instructionsPanelTarget = `{/* ══ Instructions panel ══ */}
        <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className={\`p-2.5 rounded-xl border \${ac.border} \${ac.bg}\`}>
              <Activity className={\`h-4 w-4 \${ac.icon}\`} />
            </div>
            <h2 className="text-base font-semibold text-white">Instructions</h2>
          </div>

          {/* Optional demo GIF */}
          {demoGif && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={demoGif} alt="Exercise demo" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/50 tracking-widest">
                DEMO
              </div>
            </div>
          )}`;

const replacedDemoCard = `{/* ══ Instructions and Demo Column ══ */}
        <div className="flex flex-col gap-6">
          
          {/* Optional demo GIF GlassCard */}
          {demoGif && (
            <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className={\`h-4 w-4 \${ac.icon}\`} />
                <h3 className="text-sm font-semibold text-white">Perfect Form Demo</h3>
              </div>
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={demoGif} alt="Exercise demo" className="w-full h-full object-cover" loop />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/15 backdrop-blur-md text-[10px] font-bold text-cyan-400 tracking-widest">
                  DEMO
                </div>
              </div>
            </div>
          )}

          {/* ══ Instructions panel ══ */}
          <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className={\`p-2.5 rounded-xl border \${ac.border} \${ac.bg}\`}>
                <Activity className={\`h-4 w-4 \${ac.icon}\`} />
              </div>
              <h2 className="text-base font-semibold text-white">Instructions</h2>
            </div>`;

code = code.replace(instructionsPanelTarget, replacedDemoCard);

// Finally, add the closing </div> for flex-col gap-6 column
// Right before the end of the file, there are 3 closing divs.
// We need 4 closing divs.
code = code.replace(
  `          )}
        </div>
      </div>
    </div>
  )
}`,
  `          )}
          </div>
        </div>
      </div>
    </div>
  )
}`
);

fs.writeFileSync('apps/web/app/(main)/exercises/components/ExerciseShell.tsx', code);
console.log('Fixed ExerciseShell.tsx');
