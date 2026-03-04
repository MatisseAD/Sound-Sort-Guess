import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { ALGORITHMS, generateRandomArray, getAlgorithmGenerator, AlgorithmName } from "@/lib/sorting";
import { audio } from "@/lib/audio";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { useCreateScore } from "@/hooks/use-scores";
import { Volume2, VolumeX, ArrowRight, Loader2 } from "lucide-react";

export default function Quiz() {
  const [, navigate] = useLocation();
  const [score, setScore] = useState(0);
  const [currentAlgo, setCurrentAlgo] = useState<AlgorithmName | null>(null);
  const [array, setArray] = useState<number[]>([]);
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'guessing' | 'result' | 'gameover'>('idle');
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmName | null>(null);
  
  const [playerName, setPlayerName] = useState("");
  const createScore = useCreateScore();
  
  const isComponentMounted = useRef(true);
  const playbackRef = useRef<boolean>(false);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      playbackRef.current = false;
    };
  }, []);

  const startRound = async () => {
    audio.init();
    const algo = ALGORITHMS[Math.floor(Math.random() * ALGORITHMS.length)];
    const newArray = generateRandomArray(40); // 40 elements for good visual density
    
    setCurrentAlgo(algo);
    setArray(newArray);
    setActiveIndices([]);
    setGameState('playing');
    setSelectedAlgo(null);
    
    playbackRef.current = true;
    
    // Slight delay before playing
    await new Promise(r => setTimeout(r, 500));
    
    const generator = getAlgorithmGenerator(algo, newArray);
    
    // Speed depends on array size and algorithm to keep it under 5-10s
    const speedMap: Record<string, number> = {
      'Bubble Sort': 10,
      'Quick Sort': 30,
      'Merge Sort': 30,
      'Insertion Sort': 15,
      'Selection Sort': 15,
      'Cocktail Sort': 10,
      'Heap Sort': 30,
      'Shell Sort': 25
    };
    const speed = speedMap[algo] || 20;

    for (const state of generator) {
      if (!isComponentMounted.current || !playbackRef.current) break;
      
      setArray(state.array);
      setActiveIndices(state.active);
      
      state.active.forEach(idx => {
        audio.playTone(state.array[idx], 100);
      });
      
      await new Promise(r => setTimeout(r, speed));
    }
    
    if (isComponentMounted.current && playbackRef.current) {
      setGameState('guessing');
      setActiveIndices([]);
    }
  };

  const handleGuess = (algo: AlgorithmName) => {
    if (gameState !== 'guessing') return;
    
    setSelectedAlgo(algo);
    setGameState('result');
    
    if (algo === currentAlgo) {
      // Correct
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#D946EF', '#ffffff']
      });
      setScore(s => s + 1);
      setTimeout(() => {
        if (isComponentMounted.current) startRound();
      }, 2000);
    } else {
      // Wrong
      setTimeout(() => {
        if (isComponentMounted.current) setGameState('gameover');
      }, 2000);
    }
  };

  const submitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || createScore.isPending) return;
    
    await createScore.mutateAsync({ playerName, score });
    navigate('/leaderboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl space-y-8 relative">
        
        {/* Header */}
        <div className="flex justify-between items-center glass-panel px-6 py-4 rounded-2xl">
          <div className="text-xl font-bold">
            Score: <span className="text-primary">{score}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {gameState === 'playing' ? (
              <span className="flex items-center gap-2 text-primary animate-pulse">
                <Volume2 size={20} />
                <span className="text-sm font-medium">Playing...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <VolumeX size={20} />
                <span className="text-sm font-medium">Silent</span>
              </span>
            )}
          </div>
        </div>

        {/* Visualizer */}
        <div className="relative">
          {gameState === 'idle' && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
              <button 
                onClick={startRound}
                className="px-8 py-4 rounded-xl font-bold text-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/20"
              >
                Start Challenge
              </button>
            </div>
          )}
          <AudioVisualizer array={array.length ? array : generateRandomArray(40)} activeIndices={activeIndices} />
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ALGORITHMS.map(algo => {
            const isSelected = selectedAlgo === algo;
            const isCorrect = algo === currentAlgo;
            
            let btnClass = "glass-panel py-4 px-6 text-lg font-medium rounded-xl transition-all duration-300 ";
            
            if (gameState === 'guessing') {
              btnClass += "hover:bg-white/5 hover:-translate-y-1 cursor-pointer";
            } else if (gameState === 'result' || gameState === 'gameover') {
              btnClass += "cursor-not-allowed ";
              if (isCorrect) {
                btnClass += "bg-success/20 border-success text-success shadow-[0_0_15px_rgba(34,197,94,0.3)]";
              } else if (isSelected && !isCorrect) {
                btnClass += "bg-destructive/20 border-destructive text-destructive";
              } else {
                btnClass += "opacity-40";
              }
            } else {
              btnClass += "opacity-50 cursor-not-allowed";
            }

            return (
              <button
                key={algo}
                disabled={gameState !== 'guessing'}
                onClick={() => handleGuess(algo)}
                className={btnClass}
              >
                {algo}
              </button>
            );
          })}
        </div>
      </div>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState === 'gameover' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel p-8 rounded-3xl w-full max-w-md border-primary/20 shadow-2xl shadow-primary/10 text-center space-y-6"
            >
              <h2 className="text-3xl font-bold text-destructive">Game Over</h2>
              
              <div className="space-y-1">
                <p className="text-muted-foreground">Final Score</p>
                <p className="text-5xl font-black text-gradient">{score}</p>
              </div>

              <form onSubmit={submitScore} className="space-y-4 pt-4">
                <div className="space-y-2 text-left">
                  <label htmlFor="name" className="text-sm font-medium text-muted-foreground">Enter your name for the leaderboard</label>
                  <input 
                    id="name"
                    type="text" 
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    placeholder="E.g. AlgoMaster99"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
                    required
                    maxLength={20}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={createScore.isPending || !playerName.trim()}
                  className="w-full px-6 py-4 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                >
                  {createScore.isPending ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>Submit Score <ArrowRight size={20} /></>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setScore(0);
                    setGameState('idle');
                  }}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Play Again Without Saving
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
