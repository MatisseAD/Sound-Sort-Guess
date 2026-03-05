import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { ALGORITHMS, generateRandomArray, getAlgorithmGenerator, AlgorithmName } from "@/lib/sorting";
import { audio } from "@/lib/audio";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { useCreateScore } from "@/hooks/use-scores";
import { Volume2, VolumeX, ArrowRight, Loader2, Users, User, Play, CheckCircle2, Copy, Check, EyeOff } from "lucide-react";

type Message = {
  type: string;
  payload: any;
};

export default function Quiz() {
  const [, navigate] = useLocation();
  const [score, setScore] = useState(0);
  const [currentAlgo, setCurrentAlgo] = useState<AlgorithmName | null>(null);
  const [array, setArray] = useState<number[]>([]);
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'guessing' | 'result' | 'gameover' | 'multiplayer'>('idle');
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmName | null>(null);
  
  const [playerName, setPlayerName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [hardcoreMode, setHardcoreMode] = useState(false);
  const createScore = useCreateScore();
  
  const isComponentMounted = useRef(true);
  const playbackRef = useRef<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);

  // Multiplayer state
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [myId, setMyId] = useState<string>("");
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      playbackRef.current = false;
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  const connectMultiplayer = (name: string, roomId?: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: "joinRoom",
        payload: { playerName: name, roomId }
      }));
    };

    socket.onmessage = (event) => {
      const msg: Message = JSON.parse(event.data);
      
      if (msg.type === "roomUpdate") {
        setRoom(msg.payload.room);
        setPlayers(msg.payload.players);
        setMyId(msg.payload.me.id);
        setGameState('multiplayer');
      }

      if (msg.type === "gameStart") {
        setLastWinner(null);
        handleStartRound(msg.payload.algo, msg.payload.array);
      }

      if (msg.type === "roundResult") {
        playbackRef.current = false;
        setLastWinner(msg.payload.winner || "No one");
        setCurrentAlgo(msg.payload.correctAlgo as AlgorithmName);
        setGameState('result');
      }
    };
  };

  const handleStartRound = async (algo: AlgorithmName, newArray: number[]) => {
    audio.init();
    setCurrentAlgo(algo);
    setArray(newArray);
    setActiveIndices([]);
    setGameState('playing');
    setSelectedAlgo(null);
    playbackRef.current = true;
    
    await new Promise(r => setTimeout(r, 500));
    const generator = getAlgorithmGenerator(algo, newArray);
    
    const speedMap: Record<string, number> = {
      'Bubble Sort': 10, 'Quick Sort': 30, 'Merge Sort': 30,
      'Insertion Sort': 15, 'Selection Sort': 15, 'Cocktail Sort': 10,
      'Heap Sort': 30, 'Shell Sort': 25,
      'Gnome Sort': 15, 'Comb Sort': 15, 'Counting Sort': 20,
      'Radix Sort': 20, 'Odd-Even Sort': 10, 'Pancake Sort': 20,
      // Stooge Sort generates ~10k steps for n=40; 3ms keeps the round length comparable
      'Cycle Sort': 15, 'Tim Sort': 20, 'Bitonic Sort': 20, 'Stooge Sort': 3,
    };
    const speed = speedMap[algo] || 20;

    for (const state of generator) {
      if (!isComponentMounted.current || !playbackRef.current) break;
      setArray(state.array);
      setActiveIndices(state.active);
      state.active.forEach(idx => audio.playTone(state.array[idx], 100));
      await new Promise(r => setTimeout(r, speed));
    }
    
    if (isComponentMounted.current && playbackRef.current) {
      setGameState('guessing');
      setActiveIndices([]);
    }
  };

  const startRound = (hardcore = false) => {
    setHardcoreMode(hardcore);
    handleStartRound(
      ALGORITHMS[Math.floor(Math.random() * ALGORITHMS.length)],
      generateRandomArray(40)
    );
  };

  const handleGuess = (algo: AlgorithmName) => {
    if (gameState !== 'playing' && gameState !== 'guessing') return;
    
    setSelectedAlgo(algo);
    
    if (socketRef.current && room) {
      socketRef.current.send(JSON.stringify({
        type: "guess",
        payload: { algo }
      }));
      return;
    }

    setGameState('result');
    playbackRef.current = false;
    
    if (algo === currentAlgo) {
      confetti({
        particleCount: 100, spread: 70, origin: { y: 0.6 },
        colors: ['#8B5CF6', '#D946EF', '#ffffff']
      });
      setScore(s => s + 1);
      setTimeout(() => isComponentMounted.current && startRound(hardcoreMode), 2000);
    } else {
      setTimeout(() => isComponentMounted.current && setGameState('gameover'), 2000);
    }
  };

  const toggleReady = () => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "ready", payload: {} }));
    }
  };

  const copyRoomId = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const submitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || createScore.isPending) return;
    await createScore.mutateAsync({ playerName, score });
    navigate('/leaderboard');
  };

  const me = players.find(p => p.id === myId);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl space-y-8 relative">
        
        {/* Header */}
        <div className="flex justify-between items-center glass-panel px-6 py-4 rounded-2xl">
          <div className="text-xl font-bold flex items-center gap-2">
            {room ? `Room: ${room.id}` : `Score: ${score}`}
            {hardcoreMode && (
              <span className="text-xs font-bold uppercase tracking-widest text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/30">
                Hardcore
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {room && (
              <div className="flex -space-x-2">
                {players.map(p => (
                  <div key={p.id} title={`${p.name}: ${p.score}`} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${p.id === myId ? 'border-primary bg-primary/20' : 'border-white/20 bg-white/10'}`}>
                    {p.name[0].toUpperCase()}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              {gameState === 'playing' ? (
                <span className="flex items-center gap-2 text-primary animate-pulse">
                  <Volume2 size={20} />
                  <span className="text-sm font-medium italic">Sorting...</span>
                </span>
              ) : (
                <VolumeX size={20} className="opacity-50" />
              )}
            </div>
          </div>
        </div>

        {/* Visualizer */}
        <div className="relative">
          {(gameState === 'idle' || (gameState === 'multiplayer' && room?.status === 'waiting')) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl p-6 space-y-4">
              {gameState === 'idle' ? (
                <>
                  <button onClick={() => startRound(false)} className="w-full max-w-xs px-8 py-4 rounded-xl font-bold text-xl bg-primary text-primary-foreground hover-elevate shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                    <Play size={24} /> Solo Mode
                  </button>
                  <button onClick={() => startRound(true)} className="w-full max-w-xs px-8 py-4 rounded-xl font-bold text-xl bg-destructive/80 text-white hover-elevate shadow-lg shadow-destructive/20 flex items-center justify-center gap-2">
                    <EyeOff size={24} /> Hardcore Mode
                  </button>
                  <div className="w-full max-w-xs space-y-2">
                    <input 
                      type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} 
                      placeholder="Your Name" className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 border-white/10 focus:border-primary focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text" value={roomIdInput} onChange={e => setRoomIdInput(e.target.value)}
                        placeholder="Room ID (optional)" className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 border-white/10 focus:border-primary focus:outline-none text-sm"
                      />
                      <button
                        onClick={() => connectMultiplayer(playerName, roomIdInput.trim() || undefined)}
                        disabled={!playerName.trim()}
                        title={roomIdInput.trim() ? "Join Room" : "Create Room"}
                        className="px-4 py-3 rounded-xl bg-accent text-accent-foreground hover-elevate disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Users size={24} />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Leave Room ID empty to create a new room</p>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-bold">Waiting for players...</h3>
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="text-muted-foreground">Room ID:</span>
                    <span className="font-mono font-bold text-primary">{room?.id}</span>
                    <button onClick={copyRoomId} title="Copy Room ID" className="p-1 rounded hover:bg-white/10 transition-colors">
                      {copied ? <Check size={16} className="text-success" /> : <Copy size={16} className="text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {players.map(p => (
                      <div key={p.id} className="flex items-center gap-2 glass-panel p-3 rounded-xl">
                        <User size={16} />
                        <span className="flex-1 text-left truncate">{p.name}</span>
                        {p.ready ? <CheckCircle2 className="text-success" size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-white/20" />}
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={toggleReady} 
                    className={`px-8 py-3 rounded-xl font-bold transition-all ${me?.ready ? 'bg-success text-white' : 'bg-primary text-white'}`}
                  >
                    {me?.ready ? "Ready!" : "Click to Ready"}
                  </button>
                  <p className="text-sm text-muted-foreground italic">Game starts when everyone is ready (min 2 players)</p>
                </div>
              )}
            </div>
          )}
          {hardcoreMode && (gameState === 'playing' || gameState === 'guessing' || gameState === 'result') ? (
            <div className="flex items-center justify-center h-48 sm:h-64 w-full rounded-2xl glass-panel bg-black/95 border border-destructive/30">
              <div className="text-center space-y-3">
                <div className="text-5xl">🎧</div>
                <p className="text-muted-foreground text-sm font-medium">No visuals — trust your ears</p>
                {gameState === 'playing' && (
                  <span className="text-xs font-bold uppercase tracking-widest text-destructive animate-pulse">● Sorting…</span>
                )}
              </div>
            </div>
          ) : (
            <AudioVisualizer array={array.length ? array : generateRandomArray(40)} activeIndices={activeIndices} />
          )}
        </div>

        {/* Choices */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ALGORITHMS.map(algo => {
            const isSelected = selectedAlgo === algo;
            const isCorrect = algo === currentAlgo;
            const canGuess = gameState === 'playing' || gameState === 'guessing';
            
            let btnClass = "glass-panel py-3 px-4 text-sm font-medium rounded-xl transition-all duration-300 ";
            
            if (canGuess) {
              btnClass += "hover:bg-white/5 hover:-translate-y-0.5 cursor-pointer hover:border-primary/50";
            } else if (gameState === 'result' || gameState === 'gameover') {
              if (isCorrect) {
                btnClass += "bg-success/20 border-success text-success shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-[1.02] z-10";
              } else if (isSelected && !isCorrect) {
                btnClass += "bg-destructive/20 border-destructive text-destructive";
              } else {
                btnClass += "opacity-40";
              }
            } else {
              btnClass += "opacity-50 cursor-not-allowed";
            }

            return (
              <button key={algo} disabled={!canGuess} onClick={() => handleGuess(algo)} className={btnClass}>
                {algo}
              </button>
            );
          })}
        </div>

        {/* Round Result Overlay */}
        <AnimatePresence>
          {gameState === 'result' && room && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center p-4 glass-panel border-success/30 rounded-2xl bg-success/5">
              <p className="text-success font-bold text-lg mb-1">Round Over!</p>
              <p className="text-muted-foreground">Winner: <span className="text-foreground font-bold">{lastWinner}</span></p>
              <p className="text-xs text-muted-foreground mt-2 italic">Next round starting soon...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Game Over Modal (Solo) */}
      <AnimatePresence>
        {gameState === 'gameover' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-panel p-8 rounded-3xl w-full max-w-md border-primary/20 text-center space-y-6">
              <h2 className="text-3xl font-bold text-destructive">Game Over</h2>
              <div className="space-y-1">
                <p className="text-muted-foreground">Final Score</p>
                <p className="text-5xl font-black text-primary">{score}</p>
              </div>
              <form onSubmit={submitScore} className="space-y-4 pt-4">
                <input 
                  type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} 
                  placeholder="Enter name for leaderboard" className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 border-white/10 focus:border-primary focus:outline-none" required maxLength={20}
                />
                <button type="submit" disabled={createScore.isPending || !playerName.trim()} className="w-full px-6 py-4 rounded-xl font-bold bg-primary text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {createScore.isPending ? <Loader2 className="animate-spin" size={20} /> : <>Submit Score <ArrowRight size={20} /></>}
                </button>
                <button type="button" onClick={() => { setScore(0); setHardcoreMode(false); setGameState('idle'); }} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">
                  Play Again
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
