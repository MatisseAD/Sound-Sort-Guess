import { useScores } from "@/hooks/use-scores";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Medal, Loader2, AlertCircle } from "lucide-react";

export default function Leaderboard() {
  const { data: scores, isLoading, error } = useScores();

  // Sort scores descending and take top 50
  const sortedScores = scores 
    ? [...scores].sort((a, b) => b.score - a.score).slice(0, 50)
    : [];

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
            <p className="text-xl font-medium">No scores yet!</p>
            <p className="text-muted-foreground">Be the first to set a high score.</p>
            <Link 
              href="/quiz" 
              className="inline-block mt-4 px-6 py-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-semibold transition-colors"
            >
              Play Now
            </Link>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-3xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/10 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 w-24 text-center">Rank</th>
                    <th className="px-6 py-4">Player</th>
                    <th className="px-6 py-4 text-right">Score</th>
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
                        <td className="px-6 py-4 font-mono font-bold text-center flex justify-center">
                          {isTop3 ? (
                            <Medal size={24} className={colors[index]} />
                          ) : (
                            <span className="text-muted-foreground">{index + 1}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-lg flex items-center gap-3">
                          {score.playerName}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-xl text-primary group-hover:text-accent transition-colors">
                          {score.score}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
