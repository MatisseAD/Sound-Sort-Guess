import { Link } from "wouter";
import { motion } from "framer-motion";
import { Play, Trophy, Headphones, Eye, User, LogOut, UserPlus, LogIn, ShoppingBag } from "lucide-react";
import { useAuth, useLogout } from "@/hooks/use-auth";

export default function Home() {
  const { data: user } = useAuth();
  const { mutate: logout } = useLogout();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-2xl text-center space-y-6 sm:space-y-8"
      >
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 text-primary mb-2">
          <Headphones size={40} className="sm:hidden" />
          <Headphones size={48} className="hidden sm:block" />
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight">
          Algo<span className="text-gradient">Rhythm</span>
        </h1>
        
        <p className="text-base sm:text-xl md:text-2xl text-muted-foreground font-light leading-relaxed px-2">
          Écoutez attentivement. Chaque algorithme de tri a sa propre mélodie. Saurez-vous le reconnaître ?
        </p>

        {user ? (
          <div className="glass-panel rounded-2xl px-4 py-3 sm:px-6 sm:py-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-left min-w-0">
                <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{user.pseudo}</p>
                  <p className="text-xs text-muted-foreground">Score : {user.score ?? 0} pts</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 px-3 py-1.5 rounded-xl text-sm font-semibold border border-yellow-500/20">
                  🪙 {user.pointsBoutiques ?? 0}
                </div>
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="flex-1 min-w-0 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 hover:-translate-y-0.5 transition-all duration-300"
            >
              <UserPlus size={18} />
              Créer un compte
            </Link>
            <Link
              href="/login"
              className="flex-1 min-w-0 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 glass-panel hover:bg-white/5 hover:-translate-y-0.5 transition-all duration-300"
            >
              <LogIn size={18} />
              Se connecter
            </Link>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-1">
          <Link 
            href="/quiz" 
            className="w-full sm:w-auto px-6 sm:px-8 py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
          >
            <Play fill="currentColor" size={18} />
            Commencer
          </Link>
          
          <Link 
            href="/zen" 
            className="w-full sm:w-auto px-6 sm:px-8 py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 glass-panel hover:bg-white/5 hover:-translate-y-1 transition-all duration-300"
          >
            <Eye size={18} className="text-accent" />
            Mode Zen
          </Link>
          
          <Link 
            href="/leaderboard" 
            className="w-full sm:w-auto px-6 sm:px-8 py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 glass-panel hover:bg-white/5 hover:-translate-y-1 transition-all duration-300"
          >
            <Trophy size={18} className="text-accent" />
            Classement
          </Link>

          <Link 
            href="/shop" 
            className="w-full sm:w-auto px-6 sm:px-8 py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 glass-panel hover:bg-white/5 hover:-translate-y-1 transition-all duration-300"
          >
            <ShoppingBag size={18} className="text-yellow-400" />
            Boutique
          </Link>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-6 text-xs sm:text-sm text-muted-foreground/60 flex gap-4"
      >
        <span>Casque recommandé</span>
      </motion.div>
    </div>
  );
}
