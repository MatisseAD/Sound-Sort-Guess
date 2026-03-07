import { useState } from "react";
import { useScores } from "@/hooks/use-scores";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Medal, Loader2, AlertCircle } from "lucide-react";

const TABS = [
  { key: 'classic', label: 'Classic' },
  { key: 'classic-hc', label: 'Classic HC' },
  { key: 'time-trial', label: 'Time Trial' },
  { key: 'time-trial-hc', label: 'Time Trial HC' },
] as const;

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}

export default function Leaderboard() {
  const { data: scores, isLoading, error } = useScores();
  const [selectedTab, setSelectedTab] = useState<typeof TABS[number]['key']>('classic');

  const filteredScores = scores
    ? scores.filter(s => s.mode === selectedTab)
    : [];

  const isTimeTrial = selectedTab.startsWith('time-trial');

  const sortedScores = filteredScores
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (isTimeTrial) {
        // More remaining time is better
        return (b.timeMs ?? 0) - (a.timeMs ?? 0);
      }
      // Classic: less time (elapsed) is better
      return (a.timeMs ?? 0) - (b.timeMs ?? 0);
    })
    .slice(0, 50);

  return (
    <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        
        <div className="flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-accent/10 text-accent mb-2">
            <Trophy size={40} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Hall of <span className="text-gradient">Fame</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            The top algorithm whisperers
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-3xl overflow-hidden"
        >
          <div className="flex flex-wrap gap-2 p-4">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${selectedTab === tab.key ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
              <Loader2 className="animate-spin" size={40} />
              <p>Loading scores...</p>
            </div>
          ) : error ? (
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center space-y-4 border-destructive/20">
              <AlertCircle className="text-destructive" size={48} />
              <p className="text-lg text-destructive font-medium">Failed to load leaderboard</p>
              <p className="text-muted-foreground text-sm">Please try again later.</p>
            </div>
          ) : sortedScores.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center space-y-4 border-dashed">
              <Trophy className="mx-auto text-muted-foreground/30" size={64} />
              <p className="text-xl font-medium">No scores in this category yet!</p>
              <p className="text-muted-foreground">Be the first to set a high score.</p>
              <Link 
                href="/quiz" 
                className="inline-block mt-4 px-6 py-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-semibold transition-colors"
              >
                Play Now
              </Link>
            </div>
          ) : (
            <>
              <div className="sm:hidden space-y-3 p-4">
                {sortedScores.map((score, index) => {
                  const isTop3 = index < 3;
                  const colors = [
                    "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]",
                    "text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]",
                    "text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]",
                  ];

                  return (
                    <motion.div
                      key={score.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="glass-panel p-4 rounded-2xl border border-white/10"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-lg">
                            {isTop3 ? (
                              <Medal size={24} className={colors[index]} />
                            ) : (
                              <span className="text-muted-foreground">#{index + 1}</span>
                            )}
                          </span>
                          <span className="font-medium truncate">{score.playerName}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-xl text-primary">{score.score}</div>
                          {!isTimeTrial && (
                            <div className="text-xs text-muted-foreground">{formatTime(score.timeMs ?? 0)}</div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/10 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 w-24 text-center whitespace-nowrap">Rank</th>
                      <th className="px-6 py-4">Player</th>
                      <th className="px-6 py-4 text-right">Score</th>
                      {!isTimeTrial && (
                        <th className="px-6 py-4 text-right whitespace-nowrap">Time</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedScores.map((score, index) => {
                      const isTop3 = index < 3;
                      const colors = [
                        "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]", 
                        "text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]", 
                        "text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]"
                      ];

                      return (
                        <motion.tr 
                          key={score.id || index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-white/5 transition-colors group"
                        >
                          <td className="px-6 py-4 font-mono font-bold text-center whitespace-nowrap">
                            {isTop3 ? (
                              <Medal size={24} className={colors[index]} />
                            ) : (
                              <span className="text-muted-foreground">{index + 1}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-medium text-lg truncate max-w-[14rem]">
                            {score.playerName}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-xl text-primary group-hover:text-accent transition-colors whitespace-nowrap">
                            {score.score}
                          </td>
                          {!isTimeTrial && (
                            <td className="px-6 py-4 text-right font-mono text-sm text-muted-foreground whitespace-nowrap">
                              {formatTime(score.timeMs ?? 0)}
                            </td>
                          )}
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
