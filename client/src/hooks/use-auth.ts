import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { PublicUser } from "@shared/routes";

export function useAuth() {
  return useQuery<PublicUser | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json() as Promise<PublicUser>;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation<PublicUser, Error, { pseudo: string; mail: string; motDePasse: string }>({
    mutationFn: async (data) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur lors de l'inscription.");
      }
      return res.json() as Promise<PublicUser>;
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<PublicUser, Error, { mail: string; motDePasse: string }>({
    mutationFn: async (data) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Identifiants incorrects.");
      }
      return res.json() as Promise<PublicUser>;
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de la déconnexion.");
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
    },
  });
}

export function useUpdateStats() {
  const queryClient = useQueryClient();
  return useMutation<PublicUser, Error, { scoreToAdd: number; coinsToAdd: number }>({
    mutationFn: async (data) => {
      const res = await fetch(api.user.updateStats.path, {
        method: api.user.updateStats.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur lors de la mise à jour.");
      }
      return res.json() as Promise<PublicUser>;
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
  });
}

export function useBuyShopItem() {
  const queryClient = useQueryClient();
  return useMutation<PublicUser, Error, { itemId: string }>({
    mutationFn: async ({ itemId }) => {
      const res = await fetch(api.shop.buy.path, {
        method: api.shop.buy.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur lors de l'achat.");
      }
      return res.json() as Promise<PublicUser>;
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
  });
}

export function useEquipTheme() {
  const queryClient = useQueryClient();
  return useMutation<PublicUser, Error, { itemId: string }>({
    mutationFn: async ({ itemId }) => {
      const res = await fetch(api.shop.equip.path, {
        method: api.shop.equip.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur lors de l'équipement.");
      }
      return res.json() as Promise<PublicUser>;
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
  });
}
