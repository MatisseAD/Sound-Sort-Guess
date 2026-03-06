import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { UserPlus, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRegister } from "@/hooks/use-auth";

export default function Register() {
  const [, navigate] = useLocation();
  const { mutate: register, isPending, error } = useRegister();

  const [form, setForm] = useState({ pseudo: "", mail: "", motDePasse: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFormError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.motDePasse !== form.confirm) {
      setFormError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (form.motDePasse.length < 8) {
      setFormError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    register(
      { pseudo: form.pseudo, mail: form.mail, motDePasse: form.motDePasse },
      { onSuccess: () => navigate("/") }
    );
  }

  const displayError = formError || (error?.message ?? null);

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
            <UserPlus size={36} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Créer un <span className="text-gradient">compte</span>
          </h1>
          <p className="text-muted-foreground">
            Sauvegardez vos scores et suivez votre progression
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-panel rounded-2xl p-8 space-y-5"
        >
          {displayError && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              {displayError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="pseudo">
              Pseudo
            </label>
            <input
              id="pseudo"
              name="pseudo"
              type="text"
              required
              minLength={3}
              maxLength={50}
              autoComplete="username"
              value={form.pseudo}
              onChange={handleChange}
              placeholder="VotreAlias42"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>

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
                minLength={8}
                autoComplete="new-password"
                value={form.motDePasse}
                onChange={handleChange}
                placeholder="Au moins 8 caractères"
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="confirm">
              Confirmer le mot de passe
            </label>
            <input
              id="confirm"
              name="confirm"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={form.confirm}
              onChange={handleChange}
              placeholder="Répétez le mot de passe"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Création en cours…
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Créer mon compte
              </>
            )}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-primary hover:text-accent transition-colors font-medium">
              Se connecter
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
