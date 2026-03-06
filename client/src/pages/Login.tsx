import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { LogIn, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useLogin } from "@/hooks/use-auth";

export default function Login() {
  const [, navigate] = useLocation();
  const { mutate: login, isPending, error } = useLogin();

  const [form, setForm] = useState({ mail: "", motDePasse: "" });
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(
      { mail: form.mail, motDePasse: form.motDePasse },
      { onSuccess: () => navigate("/") }
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft size={20} />
            <span>Retour</span>
          </Link>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 text-primary mb-2">
            <LogIn size={36} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Se <span className="text-gradient">connecter</span>
          </h1>
          <p className="text-muted-foreground">
            Accédez à votre compte et retrouvez vos scores
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-panel rounded-2xl p-8 space-y-5"
        >
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              {error.message}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="mail">
              Adresse email
            </label>
            <input
              id="mail"
              name="mail"
              type="email"
              required
              autoComplete="email"
              value={form.mail}
              onChange={handleChange}
              placeholder="vous@exemple.com"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="motDePasse">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="motDePasse"
                name="motDePasse"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={form.motDePasse}
                onChange={handleChange}
                placeholder="Votre mot de passe"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Connexion…
              </>
            ) : (
              <>
                <LogIn size={20} />
                Se connecter
              </>
            )}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-primary hover:text-accent transition-colors font-medium">
              Créer un compte
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
