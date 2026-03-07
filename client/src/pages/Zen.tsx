import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ALGORITHMS, generateRandomArray, getAlgorithmGenerator, AlgorithmName } from "@/lib/sorting";
import { audio } from "@/lib/audio";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { Volume2, VolumeX, ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import { Link } from "wouter";

export default function Zen() {
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmName | null>(null);
  const [array, setArray] = useState<number[]>([]);
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(50);

  const isComponentMounted = useRef(true);
  const currentRunId = useRef(0); // Remplace le système de Promesse : gère les annulations instantanées
  const isPausedRef = useRef(false); // Gère la pause sans détruire le générateur
  const speedRef = useRef(speed);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      currentRunId.current += 1;
    };
  }, []);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const startVisualization = async (algo: AlgorithmName) => {
    // 1. On incrémente l'ID : cela tue instantanément l'ancienne boucle qui tournait
    currentRunId.current += 1;
    const runId = currentRunId.current;

    audio.init();
    const newArray = generateRandomArray();
    setSelectedAlgo(algo);
    setArray(newArray);
    setActiveIndices([]);
    setIsPlaying(true);
    isPausedRef.current = false;

    // Petit délai pour animer la transition UX
    await new Promise((r) => setTimeout(r, 250));
    // Si on a cliqué sur un autre tri pendant l'attente, on annule
    if (runId !== currentRunId.current) return;

    const generator = getAlgorithmGenerator(algo, newArray);

    const speedMap: Record<string, number> = {
      'Bubble Sort': 10, 'Quick Sort': 30, 'Merge Sort': 30,
      'Insertion Sort': 20, 'Selection Sort': 15, 'Cocktail Sort': 10,
      'Heap Sort': 25, 'Shell Sort': 20, 'Gnome Sort': 8,
      'Comb Sort': 15, 'Counting Sort': 40, 'Radix Sort': 35,
      'Odd-Even Sort': 12, 'Pancake Sort': 20, 'Cycle Sort': 18,
      'Tim Sort': 25, 'Bitonic Sort': 20, 'Stooge Sort': 5,
      'Bogo Sort': 1, 'Bozo Sort': 1, 'Stalin Sort': 20,
      'Sleep Sort': 50, 'Slow Sort': 5, 'Gravity Sort': 30,
      'Circle Sort': 15, 'Spaghetti Sort': 50, 'Double Selection Sort': 15,
      'Smooth Sort': 25, 'Intro Sort': 30, 'Tree Sort': 25,
      'Block Sort': 30, 'Odd-Even Merge Sort': 30, 'Strand Sort': 20,
      'Flash Sort': 35, 'Library Sort': 20, 'Binary Insertion Sort': 20,
      'Tournament Sort': 25, 'Bucket Sort': 35, 'Pigeonhole Sort': 40,
      'Exchange Sort': 10,
    };

    const baseSpeed = speedMap[algo] || 20;
    let steps = 0;
    let currentLocalArray = newArray;

    try {
      for (const state of generator) {
        // Sécurité de sortie (démontage, nouveau tri cliqué, ou boucle infinie)
        if (!isComponentMounted.current || runId !== currentRunId.current || steps++ > 1000000) break;

        // --- LA VRAIE PAUSE : On attend gentiment sans détruire le générateur ---
        while (isPausedRef.current) {
          await new Promise(r => setTimeout(r, 100));
          if (!isComponentMounted.current || runId !== currentRunId.current) return;
        }

        if (!state) continue;

        currentLocalArray = state.array ? [...state.array] : currentLocalArray;
        const currentActive = state.active ? [...state.active] : [];

        setArray(currentLocalArray);
        setActiveIndices(currentActive);

        if (!isMuted && currentActive.length > 0) {
          if (audio && typeof audio.playTone === 'function') {
            const valueToPlay = currentLocalArray[currentActive[0]] || 0;
            if (valueToPlay > 0) {
              audio.playTone(valueToPlay);
            }
          }
        }

        const delayModifier = 50 / (speedRef.current || 1);
        const adjustedSpeed = Math.max(10, baseSpeed * delayModifier);

        await new Promise(r => setTimeout(r, adjustedSpeed));
      }
      
      // Assure le rendu final parfait
      if (runId === currentRunId.current) {
        setArray(currentLocalArray);
        setActiveIndices([]);
      }
    } catch (error) {
      console.error("💥 CRASH DANS L'ANIMATION :", error);
    } finally {
      // On remet le bouton sur Play uniquement si c'est ce tri-là qui vient de finir
      if (runId === currentRunId.current) {
        setIsPlaying(false);
        isPausedRef.current = false;
      }
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      // En cours de lecture -> on met en pause
      isPausedRef.current = true;
      setIsPlaying(false);
    } else {
      if (isPausedRef.current) {
        // Était en pause -> on reprend
        isPausedRef.current = false;
        setIsPlaying(true);
      } else {
        // N'était pas en pause (soit terminé, soit jamais lancé) -> on relance à zéro
        if (selectedAlgo) startVisualization(selectedAlgo);
      }
    }
  };

  const resetVisualization = () => {
    currentRunId.current += 1; // Tue l'animation instantanément
    isPausedRef.current = false;
    setIsPlaying(false);
    setArray([]);
    setActiveIndices([]);
    setSelectedAlgo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </Link>
          <h1 className="text-3xl font-bold">Zen Mode</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-lg glass-panel hover:bg-white/5 transition-colors"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm">Speed:</span>
              <input
                type="range"
                min="10"
                max="200"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Algorithm List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="glass-panel p-6 rounded-xl">
              <h2 className="text-xl font-semibold mb-4">Choose an Algorithm</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {ALGORITHMS.map((algo) => (
                  <button
                    key={algo}
                    onClick={() => startVisualization(algo)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      selectedAlgo === algo
                        ? 'bg-primary text-primary-foreground cursor-default'
                        : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {algo}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="glass-panel p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {selectedAlgo ? `${selectedAlgo} Visualization` : 'Select an algorithm to begin'}
                </h2>
                <div className="flex gap-2">
                  {selectedAlgo && (
                    <>
                      <button
                        onClick={handlePlayPause}
                        className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                      </button>
                      <button
                        onClick={resetVisualization}
                        className="p-2 rounded-lg glass-panel hover:bg-white/5 transition-colors"
                      >
                        <RotateCcw size={20} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {selectedAlgo ? (
                  <motion.div
                    key={selectedAlgo}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <AudioVisualizer
                      array={array}
                      activeIndices={activeIndices}
                    />
                    <div className="text-center text-muted-foreground">
                      {isPlaying ? 'Playing...' : (isPausedRef.current ? 'Paused' : 'Finished')}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Choose an algorithm from the list to see its visualization
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}