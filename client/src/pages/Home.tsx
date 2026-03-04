import { Link } from "wouter";
import { motion } from "framer-motion";
import { Play, Trophy, Headphones } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-2xl text-center space-y-8"
      >
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 text-primary mb-4">
          <Headphones size={48} />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Algo<span className="text-gradient">Rhythm</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed">
          Listen carefully. Every sorting algorithm has a unique melody. Can you guess which one is playing?
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link 
            href="/quiz" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
          >
            <Play fill="currentColor" size={20} />
            Start Listening
          </Link>
          
          <Link 
            href="/leaderboard" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 glass-panel hover:bg-white/5 hover:-translate-y-1 transition-all duration-300"
          >
            <Trophy size={20} className="text-accent" />
            Leaderboard
          </Link>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 text-sm text-muted-foreground/60 flex gap-4"
      >
        <span>Headphones recommended</span>
      </motion.div>
    </div>
  );
}
