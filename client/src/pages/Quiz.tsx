import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { ALGORITHMS, generateRandomArray, getAlgorithmGenerator, AlgorithmName, getProgressiveAlgos, getNextUnlockRound, getTimerProgressiveAlgos, getTimerNextUnlockRound, getTimerUnlockGroupIndex, ALGO_PROGRESSION } from "@/lib/sorting";
import { audio } from "@/lib/audio";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { useCreateScore } from "@/hooks/use-scores";
import { useAuth, useUpdateStats } from "@/hooks/use-auth";
import { Volume2, VolumeX, ArrowLeft, ArrowRight, Loader2, Users, User, Play, CheckCircle2, Copy, Check, EyeOff, Crown, X, Unlock } from "lucide-react";
import type { VisualizerTheme } from "@/lib/shop";

type Message = {
  type: string;
  payload: any;
};

export default function Quiz() {
  const [, navigate] = useLocation();
  const [score, setScore] = useState(0);
  const scoreRef = useRef(score);
  const [round, setRound] = useState(0);
  const [currentAlgo, setCurrentAlgo] = useState<AlgorithmName | null>(null);
  const [array, setArray] = useState<number[]>([]);
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'guessing' | 'result' | 'gameover' | 'multiplayer'>('idle');
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmName | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [nextRoundRequested, setNextRoundRequested] = useState(false);
  const [newUnlock, setNewUnlock] = useState<AlgorithmName[] | null>(null);
  
  const [playerName, setPlayerName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");

  const [pendingMode, setPendingMode] = useState<'classic' | 'time-trial'>('classic');
  const [pendingHardcore, setPendingHardcore] = useState(false);
  const [pendingProgressive, setPendingProgressive] = useState(true);
  const [pendingMarathon, setPendingMarathon] = useState(false);
  const [pendingBaseGroup, setPendingBaseGroup] = useState(0);
  const [pendingPreset, setPendingPreset] = useState<'classic' | 'noob' | 'pro' | 'hacker'>('classic');

  const [gameMode, setGameMode] = useState<'normal' | 'hardcore' | 'timer' | 'timer-hardcore'>('normal');
  const [timeLeftMs, setTimeLeftMs] = useState(60_000);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timeLeftRef = useRef(60_000);
  const elapsedRef = useRef(0);
  const timerInterval = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const coinsAwardedRef = useRef(false);

  const hardcoreMode = gameMode === 'hardcore' || gameMode === 'timer-hardcore';
  const timerMode = gameMode === 'timer' || gameMode === 'timer-hardcore';

  const formatTime = (ms: number) => (ms > 0 ? (ms / 1000).toFixed(2) : '0.00');

  const startTimerInterval = (countdown: boolean) => {
    lastTickRef.current = Date.now();
    if (timerInterval.current) window.clearInterval(timerInterval.current);

    timerInterval.current = window.setInterval(() => {
      const now = Date.now();
      const last = lastTickRef.current ?? now;
      const delta = Math.max(0, now - last);
      lastTickRef.current = now;

      if (countdown) {
        const nextMs = Math.max(0, timeLeftRef.current - delta);
        timeLeftRef.current = nextMs;
        setTimeLeftMs(nextMs);

        if (nextMs <= 0) {
          if (timerInterval.current) window.clearInterval(timerInterval.current);
          playbackRef.current = false;
          setGameState('gameover');
        }
      } else {
        const nextMs = elapsedRef.current + delta;
        elapsedRef.current = nextMs;
        setElapsedMs(nextMs);
      }
    }, 50);
  };

  const stopTimerInterval = () => {
    if (timerInterval.current) {
      window.clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  const createScore = useCreateScore();
  const { data: user } = useAuth();
  const { mutate: updateStats } = useUpdateStats();

  // Progression: algorithms available for current round
  const progressiveAlgos = useMemo(() => {
    if (gameState === 'idle' || round === 0) return getProgressiveAlgos(0, false);
    if (timerMode) return getTimerProgressiveAlgos(score, hardcoreMode);
    return getProgressiveAlgos(round, hardcoreMode);
  }, [round, score, hardcoreMode, gameState, timerMode]);

  const nextUnlockRound = useMemo(() => {
    if (timerMode) return getTimerNextUnlockRound(score, hardcoreMode);
    return getNextUnlockRound(round, hardcoreMode);
  }, [round, score, hardcoreMode, timerMode]);

  // Equipped theme from user profile
  const equippedTheme = (user?.equippedTheme ?? 'default') as VisualizerTheme;

  const normalizeRoomId = (value: string) =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  
  const isComponentMounted = useRef(true);
  const playbackRef = useRef<boolean>(false);
  const nextRoundTimeout = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Multiplayer state
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [myId, setMyId] = useState<string>("");
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [globalWinner, setGlobalWinner] = useState<string | null>(null);
  const [isFinalRound, setIsFinalRound] = useState(false);
  const [showFinalRanking, setShowFinalRanking] = useState(false);
  const [showWinnerToast, setShowWinnerToast] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Host settings
  const [pendingMaxRounds, setPendingMaxRounds] = useState(5);
  const [pendingAlgos, setPendingAlgos] = useState<AlgorithmName[]>([...ALGORITHMS]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      playbackRef.current = false;
      if (socketRef.current) socketRef.current.close();
      if (nextRoundTimeout.current) {
        window.clearTimeout(nextRoundTimeout.current);
      }
      if (timerInterval.current) {
        window.clearInterval(timerInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (gameState === 'gameover') {
      stopTimerInterval();
      if (nextRoundTimeout.current) {
        window.clearTimeout(nextRoundTimeout.current);
      }
    }
  }, [gameState]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    timeLeftRef.current = timeLeftMs;
  }, [timeLeftMs]);

  useEffect(() => {
    elapsedRef.current = elapsedMs;
  }, [elapsedMs]);

  useEffect(() => {
    if (gameState !== 'gameover') return;
    if (!user) return;
    if (coinsAwardedRef.current) return;

    const coinsPerCorrect = hardcoreMode ? 15 : 10;
    const coinsToAdd = score * coinsPerCorrect;
    if (coinsToAdd > 0) {
      updateStats({ scoreToAdd: 0, coinsToAdd });
    }
    coinsAwardedRef.current = true;
  }, [gameState, user, score, hardcoreMode, updateStats]);


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

        setPendingMaxRounds(msg.payload.room.maxRounds ?? 5);
        setPendingAlgos(msg.payload.room.allowedAlgos ?? ALGORITHMS);
        setPendingMode(msg.payload.room.mode ?? 'classic');
        setPendingHardcore(msg.payload.room.hardcore ?? false);
        setPendingProgressive(msg.payload.room.progressive ?? true);
        setPendingMarathon(msg.payload.room.marathon ?? false);
        setPendingBaseGroup(msg.payload.room.baseGroup ?? 0);
        setPendingPreset(msg.payload.room.preset ?? 'classic');

        // Sync local game mode with room settings so UI matches when the round starts
        const roomMode = msg.payload.room.mode ?? 'classic';
        const roomHardcore = msg.payload.room.hardcore ?? false;
        const computedGameMode = roomMode === 'time-trial'
          ? (roomHardcore ? 'timer-hardcore' : 'timer')
          : (roomHardcore ? 'hardcore' : 'normal');
        setGameMode(computedGameMode);

        const meState = msg.payload.players.find((p: any) => p.id === msg.payload.me.id);
        setHasGuessed(meState?.hasGuessed ?? false);

        // Only go into lobby mode if we haven't started playing yet
        setGameState(prev => {
          if (prev === 'idle') return 'multiplayer';
          if (msg.payload.room.status === 'waiting' && prev !== 'playing' && prev !== 'result') return 'multiplayer';
          return prev;
        });
      }

      if (msg.type === "kicked") {
        setRoom(null);
        setPlayers([]);
        setMyId("");
        setGameState('idle');
        alert(msg.payload?.reason || "You were removed from the room.");
      }

      if (msg.type === "gameStart") {
        setLastWinner(null);
        setHasGuessed(false);
        setSelectedAlgo(null);
        setNextRoundRequested(false);
        setRoom((prev: any) => prev ? { ...prev, round: msg.payload.round, maxRounds: msg.payload.maxRounds } : prev);
        handleStartRound(msg.payload.algo, msg.payload.array);
      }

      if (msg.type === "roundResult") {
        playbackRef.current = false;
        setIsFinalRound(false);
        setShowFinalRanking(false);
        setLastWinner(msg.payload.winner || "No one");
        setCurrentAlgo(msg.payload.correctAlgo as AlgorithmName);
        setRoom((prev: any) => prev ? { ...prev, round: msg.payload.round, maxRounds: msg.payload.maxRounds } : prev);
        setPlayers(msg.payload.players ?? []);
        setGameState('result');
      }

      if (msg.type === "gameOver") {
        const finalPlayers = msg.payload.players as Array<{ id: string; name: string; score: number }>;
        setPlayers(finalPlayers);

        const me = finalPlayers.find(p => p.id === myId);
        if (me) setScore(me.score);

        const winner = finalPlayers.reduce((best, p) => (p.score > best.score ? p : best), finalPlayers[0]);
        setGlobalWinner(winner?.name || "No one");

        setIsFinalRound(true);
        setShowFinalRanking(false);
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

  const startRound = (
    mode: 'normal' | 'hardcore' | 'timer' | 'timer-hardcore' = 'normal',
    options?: { reset?: boolean }
  ) => {
    setGameMode(mode);
    setSelectedAlgo(null);
    setHasGuessed(false);
    setNewUnlock(null);

    const isTimerMode = mode === 'timer' || mode === 'timer-hardcore';
    const isHardcore = mode === 'hardcore' || mode === 'timer-hardcore';

    let nextRound: number;
    if (options?.reset) {
      setScore(0);
      scoreRef.current = 0;
      coinsAwardedRef.current = false;
      setRound(1);
      nextRound = 1;

      if (isTimerMode) {
        setTimeLeftMs(60_000);
        timeLeftRef.current = 60_000;
        startTimerInterval(true);
      } else {
        setElapsedMs(0);
        elapsedRef.current = 0;
        startTimerInterval(false);
      }
    } else {
      nextRound = round + 1;
      setRound(nextRound);

      if (isTimerMode) {
        startTimerInterval(true);
      } else {
        startTimerInterval(false);
      }
    }

    // Check if a new algorithm group unlocks at this round (non-timer modes)
    if (!options?.reset && !isTimerMode) {
      const interval = isHardcore ? 15 : 10;
      if (nextRound % interval === 0) {
        const groupIdx = Math.floor(nextRound / interval);
        if (groupIdx < ALGO_PROGRESSION.length) {
          setNewUnlock(ALGO_PROGRESSION[groupIdx]);
        }
      }
    }

    const currentProgAlgos = isTimerMode
      ? getTimerProgressiveAlgos(scoreRef.current, isHardcore)
      : getProgressiveAlgos(nextRound, isHardcore);

    handleStartRound(
      currentProgAlgos[Math.floor(Math.random() * currentProgAlgos.length)],
      generateRandomArray(40)
    );
  };

  const handleGuess = (algo: AlgorithmName) => {
    if (gameState !== 'playing' && gameState !== 'guessing') return;
    
    setSelectedAlgo(algo);
    setHasGuessed(true);

    if (socketRef.current && room) {
      socketRef.current.send(JSON.stringify({
        type: "guess",
        payload: { algo }
      }));
      return;
    }

    playbackRef.current = false;
    stopTimerInterval();

    if (algo === currentAlgo) {
      confetti({
        particleCount: 100, spread: 70, origin: { y: 0.6 },
        colors: ['#8B5CF6', '#D946EF', '#ffffff']
      });

      // Stop timer while feedback is displayed
      stopTimerInterval();

      const nextScore = scoreRef.current + 1;
      const prevGroup = timerMode ? getTimerUnlockGroupIndex(scoreRef.current, hardcoreMode) : -1;
      const nextGroup = timerMode ? getTimerUnlockGroupIndex(nextScore, hardcoreMode) : -1;

      setScore(nextScore);
      scoreRef.current = nextScore;
      if (timerMode && nextGroup > prevGroup && nextGroup < ALGO_PROGRESSION.length) {
        setNewUnlock(ALGO_PROGRESSION[nextGroup]);
      }

      // No pop-up after correct answers (Classic and Time Trial)
      playbackRef.current = false;

      if (nextRoundTimeout.current) {
        window.clearTimeout(nextRoundTimeout.current);
      }
      nextRoundTimeout.current = window.setTimeout(() => {
        if (!isComponentMounted.current) return;
        startRound(gameMode);
      }, 700);

      return;
    }

    // In timer mode, stop the timer while showing feedback, then resume
    if (timerMode) {
      if (timerInterval.current) {
        window.clearInterval(timerInterval.current);
        timerInterval.current = null;
      }

      if (nextRoundTimeout.current) {
        window.clearTimeout(nextRoundTimeout.current);
      }
      nextRoundTimeout.current = window.setTimeout(() => {
        if (!isComponentMounted.current) return;
        if (timeLeftRef.current <= 0) {
          setGameState('gameover');
        } else {
          startRound(gameMode);
        }
      }, 700);
      return;
    }

    setGameState('gameover');
  };

  const toggleReady = () => {
    if (socketRef.current) {
      if (myReady) {
        setNextRoundRequested(false);
      }
      socketRef.current.send(JSON.stringify({ type: "ready", payload: {} }));
    }
  };

  const sendStartRound = () => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "startRound", payload: {} }));
    }
  };

  const sendRoomOptions = () => {
    if (!socketRef.current) return;

    const isMultiplayer = room && room.players && room.players.length > 1;
    const modeToSend = isMultiplayer ? 'classic' : pendingMode;

    socketRef.current.send(JSON.stringify({
      type: "setRoomOptions",
      payload: {
        maxRounds: pendingMaxRounds,
        allowedAlgos: pendingAlgos,
        mode: modeToSend,
        hardcore: pendingHardcore,
        progressive: pendingProgressive,
        preset: pendingPreset,
        marathon: pendingMarathon,
        baseGroup: pendingBaseGroup,
      },
    }));
  };

  const kickPlayer = (playerId: string) => {
    if (!socketRef.current) return;
    socketRef.current.send(JSON.stringify({ type: "kickPlayer", payload: { playerId } }));
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

    const mode = timerMode
      ? hardcoreMode
        ? 'time-trial-hc'
        : 'time-trial'
      : hardcoreMode
        ? 'classic-hc'
        : 'classic';

    const timeMs = timerMode ? timeLeftMs : elapsedMs;

    await createScore.mutateAsync({ playerName, score, mode, timeMs });
    navigate('/leaderboard');
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const me = sortedPlayers.find(p => p.id === myId);
  const isHost = room?.ownerId === myId;
  const allReady = players.length > 0 && players.every(p => p.ready);
  const myReady = me?.ready ?? false;
  const readyCount = players.filter(p => p.ready).length;
  // In multiplayer use room's allowed algos; in solo use the progressive list
  const visibleAlgos = (room?.allowedAlgos && room.allowedAlgos.length ? room.allowedAlgos : progressiveAlgos) as AlgorithmName[];
  const isLobby = gameState === 'idle' || (gameState === 'multiplayer' && room?.status === 'waiting');
  const isMultiplayer = gameState === 'multiplayer' && room?.players?.length > 1;

  const headerTitle = isLobby
    ? gameState === 'idle'
      ? 'Choix du mode'
      : 'Lobby'
    : room
      ? `Room: ${room.id}${room.round ? ` · ${room.round}/${room.maxRounds}` : ""}`
      : `Score: ${score}${round ? ` · R${round}` : ""}${timerMode ? ` · ${formatTime(timeLeftMs)}` : ` · ${formatTime(elapsedMs)}`}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-3xl space-y-4 sm:space-y-6 md:space-y-8 relative">
        
        {/* Header */}
        <div className="flex justify-between items-center glass-panel px-3 sm:px-6 py-3 sm:py-4 rounded-2xl">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {isLobby ? (
              <button
                type="button"
                onClick={() => {
                  if (gameState === 'idle') {
                    navigate('/');
                  } else {
                    setGameState('idle');
                    setRoom(null);
                    setPlayers([]);
                    setMyId("");
                  }
                }}
                className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ArrowLeft size={18} />
                <span className="text-sm hidden sm:inline">Retour</span>
              </button>
            ) : (
              <Link
                href="/"
                className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ArrowLeft size={18} />
                <span className="text-sm hidden sm:inline">Retour</span>
              </Link>
            )}
            <div className="text-base sm:text-xl font-bold flex items-center gap-2 min-w-0">
              <span className="truncate">
                {headerTitle}
              </span>
              {hardcoreMode && (
                <span className="text-xs font-bold uppercase tracking-widest text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/30 shrink-0">
                  HC
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {room && (
              <div className="flex -space-x-2">
                {players.map(p => (
                  <div key={p.id} title={`${p.name}: ${p.score}`} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${p.id === myId ? 'border-primary bg-primary/20' : 'border-white/20 bg-white/10'}`}>
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

        {/* Lobby / Visualizer */}
        <div className="relative">
          {isLobby ? (
            <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-3 flex flex-col items-center">
              {gameState === 'idle' ? (
                <>
                  <button onClick={() => startRound('normal', { reset: true })} className="w-full max-w-xs px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-lg sm:text-xl bg-primary text-primary-foreground hover-elevate shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                    <Play size={22} /> Normal
                  </button>
                  <p className="text-xs text-muted-foreground text-center -mt-1">Commence avec 5 algos — +1 groupe toutes les 10 manches</p>
                  <button onClick={() => startRound('hardcore', { reset: true })} className="w-full max-w-xs px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-lg sm:text-xl bg-destructive/80 text-white hover-elevate shadow-lg shadow-destructive/20 flex items-center justify-center gap-2">
                    <EyeOff size={22} /> Hardcore
                  </button>
                  <p className="text-xs text-muted-foreground text-center -mt-1">Pas de visuel — +1 groupe toutes les 15 manches</p>
                  <button onClick={() => startRound('timer', { reset: true })} className="w-full max-w-xs px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-lg sm:text-xl bg-emerald-500 text-white hover-elevate flex items-center justify-center gap-2">
                    <Play size={22} /> Contre la montre
                  </button>
                  <p className="text-xs text-muted-foreground text-center -mt-1">60s — +1 groupe tous les 3 manches</p>
                  <button onClick={() => startRound('timer-hardcore', { reset: true })} className="w-full max-w-xs px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-lg sm:text-xl bg-red-600 text-white hover-elevate flex items-center justify-center gap-2">
                    <EyeOff size={22} /> Contre la montre HC
                  </button>
                  <p className="text-xs text-muted-foreground text-center -mt-1">60s — Pas de visuel — progression plus lente</p>
                  <div className="w-full max-w-xs space-y-2 pt-1">
                    <input 
                      type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} 
                      placeholder="Votre pseudo" className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 border-white/10 focus:border-primary focus:outline-none text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text" value={roomIdInput} onChange={e => setRoomIdInput(normalizeRoomId(e.target.value))}
                        placeholder="Room ID (optionnel)" maxLength={5} className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 border-white/10 focus:border-primary focus:outline-none text-sm"
                      />
                      <button
                        onClick={() => connectMultiplayer(playerName, roomIdInput.trim() || undefined)}
                        disabled={!playerName.trim() || (roomIdInput !== "" && roomIdInput.length !== 5)}
                        title={roomIdInput.trim() ? "Rejoindre la salle" : "Créer une salle"}
                        className="px-4 py-3 rounded-xl bg-accent text-accent-foreground hover-elevate disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Users size={22} />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Laissez le Room ID vide pour créer une salle</p>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-bold">Waiting for players...</h3>
                  <div className="flex flex-col items-center gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Room ID:</span>
                      <span className="font-mono font-bold text-primary">{room?.id}</span>
                      <button onClick={copyRoomId} title="Copy Room ID" className="p-1 rounded hover:bg-white/10 transition-colors">
                        {copied ? <Check size={16} className="text-success" /> : <Copy size={16} className="text-muted-foreground" />}
                      </button>
                    </div>
                    <div className="text-muted-foreground text-xs">Rounds: {room?.maxRounds}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {players.map(p => (
                      <div key={p.id} className={`flex items-center gap-2 glass-panel p-3 rounded-xl ${p.eliminated ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2 flex-1">
                          <User size={16} />
                          <span className="flex-1 text-left truncate">{p.name}</span>
                          {p.id === room?.ownerId && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                              <Crown size={14} /> Host
                            </span>
                          )}
                          {p.eliminated && (
                            <span className="text-xs font-semibold text-destructive">Éliminé</span>
                          )}
                        </div>
                        {isHost && p.id !== myId && !p.eliminated && (
                          <button onClick={() => kickPlayer(p.id)} className="p-1 rounded hover:bg-white/10">
                            <X size={16} />
                          </button>
                        )}
                        {p.eliminated ? (
                          <div className="text-xs font-semibold text-destructive">❌</div>
                        ) : p.ready ? (
                          <CheckCircle2 className="text-success" size={16} />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-white/20" />
                        )}
                      </div>
                    ))}
                  </div>

                  {isHost ? (
                    <div className="w-full max-w-md space-y-3">
                      <div className="glass-panel p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Room settings</span>
                          <button onClick={() => setSettingsOpen(open => !open)} className="text-xs text-muted-foreground">
                            {settingsOpen ? "Hide" : "Edit"}
                          </button>
                        </div>
                        {settingsOpen && (
                          <div className="mt-3 space-y-3">
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-muted-foreground">Preset</div>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { id: 'classic', label: 'Classic / easy', mode: 'classic', hardcore: false, progressive: false, marathon: false, baseGroup: 1, rounds: 10, algos: [...ALGO_PROGRESSION[0], ...ALGO_PROGRESSION[1]] },
                                  { id: 'noob', label: 'Noob', mode: 'classic', hardcore: false, progressive: false, marathon: false, baseGroup: 3, rounds: 15, algos: [...ALGO_PROGRESSION[0], ...ALGO_PROGRESSION[1], ...ALGO_PROGRESSION[2], ...ALGO_PROGRESSION[3]] },
                                  { id: 'pro', label: 'Pro', mode: 'classic', hardcore: false, progressive: true, marathon: false, baseGroup: 3, rounds: 20, algos: [...ALGO_PROGRESSION[0], ...ALGO_PROGRESSION[1], ...ALGO_PROGRESSION[2], ...ALGO_PROGRESSION[3]] },
                                  { id: 'hacker', label: 'Hacker', mode: 'classic', hardcore: false, progressive: false, marathon: false, baseGroup: 6, rounds: 20, algos: ALGORITHMS },
                                ].map(preset => (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => {
                                      setPendingPreset(preset.id as any);
                                      setPendingMode(preset.mode as any);
                                      setPendingHardcore(preset.hardcore);
                                      setPendingProgressive(preset.progressive);
                                      setPendingMarathon(preset.marathon);
                                      setPendingBaseGroup(preset.baseGroup);
                                      setPendingMaxRounds(preset.rounds);
                                      setPendingAlgos(preset.algos as AlgorithmName[]);
                                    }}
                                    className={`px-3 py-2 rounded-full text-xs font-semibold transition ${pendingPreset === preset.id ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <label className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Mode</span>
                                <select
                                  value={pendingMode}
                                  onChange={e => setPendingMode(e.target.value as any)}
                                  className="ml-2 px-2 py-1 rounded-lg bg-black/20 border border-white/10 text-sm"
                                >
                                  <option value="classic">Classic</option>
                                  <option value="time-trial" disabled={isMultiplayer}>Contre la montre</option>
                                </select>
                              </label>
                              {isMultiplayer ? (
                                <p className="text-[11px] text-muted-foreground mt-1">Le mode contre la montre est désactivé en multijoueur.</p>
                              ) : null}
                              <label className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Hardcore</span>
                                <input
                                  type="checkbox"
                                  checked={pendingHardcore}
                                  onChange={e => setPendingHardcore(e.target.checked)}
                                  className="w-5 h-5"
                                />
                              </label>
                              <label className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Progressif</span>
                                <input
                                  type="checkbox"
                                  checked={pendingProgressive}
                                  onChange={e => setPendingProgressive(e.target.checked)}
                                  className="w-5 h-5"
                                />
                              </label>
                            </div>

                            <label className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Rounds</span>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={pendingMaxRounds}
                                onChange={e => setPendingMaxRounds(Number(e.target.value))}
                                className="w-20 px-2 py-1 rounded-lg bg-black/20 border border-white/10 text-sm"
                              />
                            </label>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted-foreground">Choose algorithms</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPendingAlgos([...ALGORITHMS])}
                                    className="text-[10px] text-primary hover:underline"
                                  >
                                    Select all
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingAlgos([])}
                                    className="text-[10px] text-primary hover:underline"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                              <div className={`max-h-44 overflow-y-auto grid grid-cols-2 gap-2 p-2 rounded-xl ${pendingProgressive ? 'bg-white/5' : 'bg-black/10'}`}>
                                {ALGORITHMS.map(algo => (
                                  <label key={algo} className="flex items-center gap-2 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={pendingAlgos.includes(algo)}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setPendingAlgos(prev => Array.from(new Set([...prev, algo])) as AlgorithmName[]);
                                        } else {
                                          setPendingAlgos(prev => prev.filter(a => a !== algo));
                                        }
                                      }}
                                      disabled={pendingProgressive}
                                      className="w-4 h-4"
                                    />
                                    <span className={`${pendingProgressive ? 'opacity-40' : ''} truncate`}>{algo}</span>
                                  </label>
                                ))}
                              </div>
                              {pendingProgressive && (
                                <p className="text-xs text-muted-foreground mt-1">Progressif activé : les algorithmes se débloquent au fil des rounds.</p>
                              )}
                            </div>
                            <button
                              onClick={sendRoomOptions}
                              className="w-full px-4 py-2 rounded-xl bg-primary text-white font-bold hover:opacity-90"
                            >
                              Apply settings
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {!myReady ? (
                          <button
                            onClick={toggleReady}
                            className="w-full px-8 py-3 rounded-xl font-bold bg-primary text-white"
                          >
                            Click to Ready
                          </button>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <button
                              type="button"
                              onClick={toggleReady}
                              className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/20 text-success hover:bg-success/30 focus:outline-none focus:ring-2 focus:ring-success/50"
                              aria-label="Unready"
                            >
                              <Check size={18} />
                            </button>
                            <div className="flex-1">
                              <button
                                onClick={() => {
                                  if (allReady) {
                                    sendRoomOptions();
                                    sendStartRound();
                                  }
                                }}
                                disabled={!allReady}
                                className="w-full px-8 py-3 rounded-xl font-bold bg-primary text-white hover:opacity-90 disabled:opacity-50"
                              >
                                {allReady ? 'Start game' : `Waiting for players (${readyCount}/${players.length})`}
                              </button>
                            </div>
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground italic">
                          {myReady
                            ? !allReady
                              ? 'Waiting for other players to ready up.'
                              : 'All players are ready — press Start to begin.'
                            : 'Click ready to unlock Start when everyone is ready.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={toggleReady} 
                        className={`px-8 py-3 rounded-xl font-bold transition-all ${me?.ready ? 'bg-success text-white' : 'bg-primary text-white'}`}
                      >
                        {me?.ready ? "Ready!" : "Click to Ready"}
                      </button>
                      <p className="text-sm text-muted-foreground italic">Game starts when the host starts the round once everyone is ready.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : hardcoreMode && (gameState === 'playing' || gameState === 'guessing' || gameState === 'result') ? (
            <div className="flex items-center justify-center h-40 sm:h-64 w-full rounded-2xl glass-panel bg-black/95 border border-destructive/30">
              <div className="text-center space-y-3">
                <div className="text-4xl sm:text-5xl">🎧</div>
                <p className="text-muted-foreground text-sm font-medium">No visuals — trust your ears</p>
                {gameState === 'playing' && (
                  <span className="text-xs font-bold uppercase tracking-widest text-destructive animate-pulse">● Sorting…</span>
                )}
              </div>
            </div>
          ) : (
            <AudioVisualizer array={array.length ? array : generateRandomArray(40)} activeIndices={activeIndices} theme={equippedTheme} />
          )}
        </div>

        {/* Progression indicator (solo mode) */}
        {!room && (gameState === 'playing' || gameState === 'guessing') && nextUnlockRound !== null && (
          <div className="flex items-center gap-2 px-3 py-1.5 glass-panel rounded-xl text-xs text-muted-foreground border border-white/5">
            <Unlock size={12} className="text-primary shrink-0" />
            <span>
              {timerMode ? (hardcoreMode ? 'TMR HC' : 'TMR') : (hardcoreMode ? 'HC' : 'Normal')}:
              {` ${visibleAlgos.length} algos débloqués • `}
              <span className="text-primary font-semibold">{timerMode ? 'Score' : 'Round'} {nextUnlockRound}</span>{" "}
              : +{(() => {
                if (timerMode) {
                  const thresholds = hardcoreMode ? [0, 4, 8, 11, 14, 17, 20] : [0, 3, 6, 9, 12, 15, 18];
                  const nextGroupIdx = thresholds.findIndex(th => th === nextUnlockRound);
                  return ALGO_PROGRESSION[nextGroupIdx]?.length ?? 0;
                }
                const interval = hardcoreMode ? 15 : 10;
                const nextGroupIdx = Math.floor(nextUnlockRound / interval);
                return ALGO_PROGRESSION[nextGroupIdx]?.length ?? 0;
              })()} nouveaux
            </span>
          </div>
        )}

        {/* Choices */}
        {!isLobby && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {visibleAlgos.map((algo: AlgorithmName) => {
            const isSelected = selectedAlgo === algo;
            const isCorrect = algo === currentAlgo;
            const canGuess = (gameState === 'playing' || gameState === 'guessing') && !hasGuessed;
            
            let btnClass = "glass-panel py-2.5 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 ";

            if (timerMode && hasGuessed) {
              if (isCorrect) {
                btnClass += "bg-success/20 border-success text-success shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-[1.02] z-10";
              } else if (isSelected) {
                btnClass += "bg-destructive/20 border-destructive text-destructive";
              } else {
                btnClass += "opacity-40";
              }
            } else if (hasGuessed) {
              if (isSelected) {
                if (isCorrect) {
                  btnClass += "bg-success/20 border-success text-success shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-[1.02] z-10";
                } else {
                  btnClass += "bg-destructive/20 border-destructive text-destructive";
                }
              } else {
                btnClass += "opacity-40";
              }
            } else if (canGuess) {
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
        )}

        {/* Round Result Overlay */}
        <AnimatePresence>
          {/* New algorithm unlock notification */}
          {newUnlock && (gameState === 'playing' || gameState === 'guessing') && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
            >
              <div className="bg-primary/90 backdrop-blur-sm text-white rounded-2xl p-4 shadow-lg shadow-primary/30 border border-primary/50 text-center space-y-1">
                <div className="flex items-center justify-center gap-2 font-bold">
                  <Unlock size={16} />
                  Nouveaux algorithmes débloqués !
                </div>
                <p className="text-sm opacity-90">{newUnlock.join(', ')}</p>
              </div>
            </motion.div>
          )}

          {gameState === 'result' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
            >
              <div className="w-full max-w-md text-left space-y-4 bg-black/70 border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-widest text-muted-foreground">
                      Round {room ? room.round : round}{room ? `/${room.maxRounds}` : ""}
                    </p>
                    <p className="text-3xl sm:text-4xl font-black text-primary">
                      {room
                        ? lastWinner || "No one"
                        : selectedAlgo && currentAlgo
                        ? selectedAlgo === currentAlgo
                          ? "Correct!"
                          : "Wrong!"
                        : "No one"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {room
                        ? lastWinner
                          ? "is the winner"
                          : "No one guessed correctly"
                        : selectedAlgo && currentAlgo
                        ? selectedAlgo === currentAlgo
                          ? `Great job! +${hardcoreMode ? 15 : 10} 🪙`
                          : "Better luck next time"
                        : ""
                      }
                    </p>
                    {currentAlgo && (
                      <p className="text-sm text-muted-foreground">Algorithm: <span className="text-foreground font-semibold">{currentAlgo}</span></p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">Round ended</div>
                </div>

                <div className="grid gap-3">
                  {isFinalRound ? (
                    <button
                      onClick={() => setShowFinalRanking(true)}
                      className="w-full px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90"
                    >
                      Voir le classement
                    </button>
                  ) : room && socketRef.current ? (
                    isHost ? (
                      <button
                        onClick={sendStartRound}
                        className="w-full px-6 py-3 rounded-xl font-bold bg-primary text-white hover:opacity-90"
                      >
                        Next round
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full px-6 py-3 rounded-xl bg-white/10 text-muted-foreground font-bold cursor-not-allowed"
                      >
                        Waiting for host...
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        setGameState('playing');
                        setSelectedAlgo(null);
                        setHasGuessed(false);
                        startRound(gameMode);
                      }}
                      className="w-full px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90"
                    >
                      Next round
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {showFinalRanking && room && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
            >
              <div className="w-full max-w-md text-left space-y-4 bg-black/70 border border-white/10 rounded-3xl p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-widest text-muted-foreground">Classement final</p>
                    <p className="text-4xl font-black text-primary">{globalWinner || "No one"}</p>
                    <p className="text-sm text-muted-foreground">
                      {globalWinner ? "is the winner" : "No one guessed correctly"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">Game over</div>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Classement</span>
                    <span className="text-xs text-muted-foreground">{sortedPlayers.length} players</span>
                  </div>
                  <div className="space-y-2">
                    {sortedPlayers.map((p, idx) => (
                      <div key={p.id} className={`flex items-center justify-between text-sm ${p.id === myId ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                        <span className="truncate">{idx + 1}. {p.name}</span>
                        <span className="font-semibold">{p.score}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      if (socketRef.current) {
                        socketRef.current.send(JSON.stringify({ type: "resetRoom", payload: {} }));
                      }
                      setShowFinalRanking(false);
                      setGameState('multiplayer');
                      setLastWinner(null);
                      setHasGuessed(false);
                    }}
                    className="w-full px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold hover:opacity-90"
                  >
                    Back to lobby
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90"
                  >
                    Back to menu
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Leaderboard (during a round only) */}
      {room && (gameState === 'playing' || gameState === 'guessing') && sortedPlayers.length > 0 && (
        <div className="fixed top-4 left-4 right-4 sm:right-auto sm:left-8 z-40">
          <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-white/10 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Leaderboard</span>
              <span className="text-xs font-semibold text-muted-foreground">Round {room.round}/{room.maxRounds}</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {sortedPlayers.slice(0, 6).map((p, idx) => (
                <div key={p.id} className={`flex items-center justify-between text-sm ${p.id === myId ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                  <span className="truncate">{idx + 1}. {p.name}</span>
                  <span className="font-semibold ml-2">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal (Solo) */}
      <AnimatePresence>
        {gameState === 'gameover' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-panel p-6 sm:p-8 rounded-3xl w-full max-w-md border-primary/20 text-center space-y-4 my-4">
              <h2 className="text-3xl font-bold text-destructive">{timerMode ? "Time's up!" : "Game Over"}</h2>
              <div className="space-y-1">
                <p className="text-muted-foreground">Score final</p>
                <p className="text-5xl font-black text-primary">{score}</p>
                {!timerMode && currentAlgo && (
                  <p className="text-sm text-muted-foreground">Dernier tri : <span className="text-foreground font-semibold">{currentAlgo}</span></p>
                )}
              </div>

              {/* Coins earned summary (not in timer modes) */}
              {user && score > 0 && !timerMode && (
                <div className="flex items-center justify-center gap-2 py-2 px-4 bg-yellow-500/10 text-yellow-400 rounded-xl border border-yellow-500/20 text-sm font-semibold">
                  <span>🪙</span>
                  <span>+{score * (hardcoreMode ? 15 : 10)} coins gagnés !</span>
                  {hardcoreMode && <span className="text-xs opacity-70">(×1.5 hardcore)</span>}
                </div>
              )}

              {/* Progression info */}
              {!room && (
                <div className="text-xs text-muted-foreground bg-white/5 rounded-xl px-3 py-2 text-left">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-1">
                    <Unlock size={12} /> Algorithmes débloqués ({visibleAlgos.length}/{ALGORITHMS.length})
                  </p>
                  <p>
                    Mode {timerMode ? (hardcoreMode ? 'Contre la montre HC' : 'Contre la montre') : (hardcoreMode ? 'Hardcore' : 'Normal')} —
                    nouveau groupe toutes les {timerMode ? (hardcoreMode ? 4 : 3) : (hardcoreMode ? 15 : 10)} manches
                  </p>
                </div>
              )}

              <form onSubmit={submitScore} className="space-y-3 pt-2">
                <input 
                  type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} 
                  placeholder="Votre nom pour le classement" className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 border-white/10 focus:border-primary focus:outline-none text-sm" required maxLength={20}
                />
                <button type="submit" disabled={createScore.isPending || !playerName.trim()} className="w-full px-6 py-3 rounded-xl font-bold bg-primary text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {createScore.isPending ? <Loader2 className="animate-spin" size={20} /> : <>Soumettre le score <ArrowRight size={20} /></>}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      startRound(gameMode, { reset: true });
                      setGameState('playing');
                    }}
                    className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Rejouer
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Menu principal
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
