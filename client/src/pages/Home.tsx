import { Link } from "wouter";
import { motion } from "framer-motion";
import { Play, Trophy, Headphones, Eye } from "lucide-react";

export default function Home() {
  const { data: user } = useAuth();
  const { mutate: logout } = useLogout();

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

        {user ? (
          <div className="glass-panel rounded-2xl px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <User size={20} />
              </div>
              <div>
                <p className="font-semibold">{user.pseudo}</p>
                <p className="text-sm text-muted-foreground">Score : {user.score ?? 0} pts</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
            >
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 hover:-translate-y-0.5 transition-all duration-300"
            >
              <UserPlus size={18} />
              Créer un compte
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 glass-panel hover:bg-white/5 hover:-translate-y-0.5 transition-all duration-300"
            >
              <LogIn size={18} />
              Se connecter
            </Link>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link 
            href="/quiz" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
          >
            <Play fill="currentColor" size={20} />
            Start Listening
          </Link>
          
          <Link 
            href="/zen" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 glass-panel hover:bg-white/5 hover:-translate-y-1 transition-all duration-300"
          >
            <Eye size={20} className="text-accent" />
            Zen Mode
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
