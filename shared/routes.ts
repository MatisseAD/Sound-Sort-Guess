import { z } from 'zod';
import { insertScoreSchema, scores } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export type PublicUser = {
  id: number;
  pseudo: string;
  mail: string;
  totalScore: number;
  pointsBoutiques: number;
  purchasedItems: string[];
  equippedTheme: string;
};

export const api = {
  scores: {
    list: {
      method: 'GET' as const,
      path: '/api/scores' as const,
      responses: {
        200: z.array(z.custom<typeof scores.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/scores' as const,
      input: insertScoreSchema,
      responses: {
        201: z.custom<typeof scores.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  auth: {
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: z.object({
        pseudo: z.string().min(3).max(50),
        mail: z.string().email(),
        motDePasse: z.string().min(8),
      }),
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({
        mail: z.string().email(),
        motDePasse: z.string(),
      }),
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
    },
  },
  user: {
    updateStats: {
      method: 'POST' as const,
      path: '/api/user/stats' as const,
      input: z.object({
        scoreToAdd: z.number().int().min(0),
        coinsToAdd: z.number().int().min(0),
      }),
    },
  },
  shop: {
    buy: {
      method: 'POST' as const,
      path: '/api/shop/buy' as const,
      input: z.object({ itemId: z.string() }),
    },
    equip: {
      method: 'POST' as const,
      path: '/api/shop/equip' as const,
      input: z.object({ itemId: z.string() }),
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
