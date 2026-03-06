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
  const playbackRef = useRef<boolean>(false);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      playbackRef.current = false;
    };
  }, []);

  const startVisualization = async (algo: AlgorithmName) => {
    audio.init();
    const newArray = generateRandomArray();
    setSelectedAlgo(algo);
    setArray(newArray);
    setActiveIndices([]);
    setIsPlaying(true);
    playbackRef.current = true;

    await new Promise(r => setTimeout(r, 500));
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
    
    // CORRECTION 1 : Logique de vitesse corrigée (plus le slider est haut, plus le délai est court)
    const delayModifier = 50 / (speed || 1); 
    const adjustedSpeed = Math.max(10, baseSpeed * delayModifier);

    // CORRECTION 2 : Le timeout restrictif de 30 secondes a été retiré

    let steps = 0;
    let currentLocalArray = newArray;

    try {
      for (const state of generator) {
        if (!isComponentMounted.current || !playbackRef.current || steps++ > 10000) break;
        
        // Sécurité maximale : si l'étape renvoyée est totalement vide, on passe à la suivante
        if (!state) continue; 

        currentLocalArray = state.array ? [...state.array] : currentLocalArray;
        const currentActive = state.active ? [...state.active] : [];

        setArray(currentLocalArray);
        setActiveIndices(currentActive);
        
        if (!isMuted) {
          // On s'assure que audio existe bien avant d'essayer de jouer un son
          if (audio && typeof audio.playTone === 'function') {
             const valueToPlay = currentLocalArray[currentActive[0] || 0] || 0;
             audio.playTone(valueToPlay);
          }
        }
        
        await new Promise(r => setTimeout(r, adjustedSpeed));
      }
    } catch (error) {
      // C'est ICI que l'on va attraper le vrai coupable !
      console.error("💥 CRASH DANS L'ANIMATION :", error);
    } finally {
      // Quoi qu'il arrive (succès ou crash), on remet l'interface à zéro proprement
      setIsPlaying(false);
      playbackRef.current = false;
    }
  }; // <-- Fin de ta fonction startVisualization

  const stopVisualization = () => {
    playbackRef.current = false;
    setIsPlaying(false);
  };

  const resetVisualization = () => {
    stopVisualization();
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
            Back to Home
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
                    disabled={isPlaying}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      selectedAlgo === algo
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
                    } ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        onClick={isPlaying ? stopVisualization : () => selectedAlgo && startVisualization(selectedAlgo)}
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
                      algorithm={selectedAlgo}
                    />
                    <div className="text-center text-muted-foreground">
                      {isPlaying ? 'Playing...' : 'Paused'}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-muted-foreground"
                  >                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}