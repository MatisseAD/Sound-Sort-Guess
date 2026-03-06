import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBuyShopItem, useEquipTheme } from "@/hooks/use-auth";
import { SHOP_ITEMS } from "@/lib/shop";
import type { VisualizerTheme } from "@/lib/shop";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { generateRandomArray } from "@/lib/sorting";
import { useMemo } from "react";

const DEMO_ARRAY = generateRandomArray(40);
const DEMO_ACTIVE = [5, 6, 20, 21];

export default function Shop() {
  const { data: user } = useAuth();
  const { mutate: buyItem, isPending: isBuying } = useBuyShopItem();
  const { mutate: equipTheme, isPending: isEquipping } = useEquipTheme();

  const purchasedItems: string[] = useMemo(() => user?.purchasedItems ?? [], [user]);
  const equippedTheme: string = user?.equippedTheme ?? "default";
  const coins = user?.pointsBoutiques ?? 0;

  return (
    <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft size={20} />
            <span>Retour</span>
          </Link>
          {user && (
            <div className="flex items-center gap-2 glass-panel px-4 py-2 rounded-xl">
              <span className="text-yellow-400">🪙</span>
              <span className="font-bold text-yellow-400">{coins}</span>
              <span className="text-muted-foreground text-sm">coins</span>
            </div>
          )}
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-yellow-500/10 text-yellow-400 mb-2">
            <ShoppingBag size={40} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Bou<span className="text-gradient">tique</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Dépensez vos coins pour personnaliser votre visualiseur
          </p>
        </motion.div>

        {!user && (
          <div className="glass-panel p-8 rounded-2xl text-center space-y-4">
            <p className="text-muted-foreground text-lg">Connectez-vous pour accéder à la boutique.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login" className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90">
                Se connecter
              </Link>
              <Link href="/register" className="px-6 py-3 rounded-xl glass-panel font-bold hover:bg-white/5">
                Créer un compte
              </Link>
            </div>
          </div>
        )}

        {user && (
          <>
            {/* How to earn coins */}
            <div className="glass-panel p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-semibold text-sm">Comment gagner des coins ?</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Jouez en mode Solo ou Hardcore — chaque bonne réponse vous rapporte des coins.
                    <br />
                    <span className="text-yellow-400">+10 coins</span> par bonne réponse en mode Normal •{" "}
                    <span className="text-yellow-400">+15 coins</span> par bonne réponse en mode Hardcore
                  </p>
                </div>
              </div>
            </div>

            {/* Default theme card */}
            <div>
              <h2 className="text-xl font-bold mb-4">Thèmes Visualiseur</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Default (always available) */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-panel rounded-2xl p-4 space-y-3 border ${equippedTheme === 'default' ? 'border-primary/60' : 'border-white/10'}`}
                >
                  <div className="text-2xl">🎨</div>
                  <div>
                    <p className="font-semibold">Default</p>
                    <p className="text-xs text-muted-foreground">Le thème violet classique</p>
                  </div>
                  <div className="h-16 overflow-hidden rounded-xl opacity-80 pointer-events-none scale-90 origin-top">
                    <AudioVisualizer array={DEMO_ARRAY} activeIndices={DEMO_ACTIVE} theme="default" />
                  </div>
                  <button
                    onClick={() => equipTheme({ itemId: "default" })}
                    disabled={equippedTheme === 'default' || isEquipping}
                    className={`w-full py-2 rounded-xl text-sm font-bold transition-all ${
                      equippedTheme === 'default'
                        ? 'bg-primary/20 text-primary cursor-default'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {equippedTheme === 'default' ? (
                      <span className="flex items-center justify-center gap-1"><Check size={14} /> Équipé</span>
                    ) : 'Équiper'}
                  </button>
                </motion.div>

                {/* Purchasable themes */}
                {SHOP_ITEMS.map((item, i) => {
                  const owned = purchasedItems.includes(item.id);
                  const equipped = equippedTheme === item.themeId;
                  const canAfford = coins >= item.price;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (i + 1) * 0.05 }}
                      className={`glass-panel rounded-2xl p-4 space-y-3 border ${equipped ? 'border-primary/60' : 'border-white/10'}`}
                    >
                      <div className="text-2xl">{item.emoji}</div>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        {!owned && (
                          <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm ml-2 shrink-0">
                            🪙 {item.price}
                          </div>
                        )}
                      </div>

                      {/* Preview */}
                      <div className="h-16 overflow-hidden rounded-xl opacity-80 pointer-events-none scale-90 origin-top">
                        <AudioVisualizer array={DEMO_ARRAY} activeIndices={DEMO_ACTIVE} theme={item.themeId as VisualizerTheme} />
                      </div>

                      {/* Action button */}
                      {owned ? (
                        <button
                          onClick={() => equipTheme({ itemId: item.themeId })}
                          disabled={equipped || isEquipping}
                          className={`w-full py-2 rounded-xl text-sm font-bold transition-all ${
                            equipped
                              ? 'bg-primary/20 text-primary cursor-default'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          {equipped ? (
                            <span className="flex items-center justify-center gap-1"><Check size={14} /> Équipé</span>
                          ) : 'Équiper'}
                        </button>
                      ) : (
                        <button
                          onClick={() => buyItem({ itemId: item.id })}
                          disabled={!canAfford || isBuying}
                          className={`w-full py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            canAfford
                              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30'
                              : 'bg-white/5 text-muted-foreground cursor-not-allowed opacity-50'
                          }`}
                        >
                          {isBuying ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : canAfford ? (
                            <>🪙 Acheter ({item.price} coins)</>
                          ) : (
                            <>🪙 Coins insuffisants</>
                          )}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
