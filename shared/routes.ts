import { z } from 'zod';
import { insertScoreSchema, scores, registerSchema, loginSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const publicUserSchema = z.object({
  id: z.number(),
  pseudo: z.string(),
  mail: z.string(),
  score: z.number().nullable(),
  pointsBoutiques: z.number().nullable(),
  createdAt: z.string(),
  lastLogin: z.string().nullable(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;

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
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: registerSchema,
      responses: {
        201: publicUserSchema,
        400: errorSchemas.validation,
        409: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: publicUserSchema,
        400: errorSchemas.validation,
        401: errorSchemas.validation,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: publicUserSchema,
        401: errorSchemas.validation,
      },
    },
  },
};

export const ws = {
  // Client to Server
  send: {
    joinRoom: z.object({ playerName: z.string(), roomId: z.string().optional() }),
    ready: z.object({}),
    startRound: z.object({}),
    setRoomOptions: z.object({
      maxRounds: z.number().int().min(1).max(20).optional(),
      allowedAlgos: z.array(z.string()).min(1).optional(),
    }),
    kickPlayer: z.object({ playerId: z.string() }),
    guess: z.object({ algo: z.string() }),
    resetRoom: z.object({}),
  },
  // Server to Client
  receive: {
    roomUpdate: z.object({ 
      room: z.object({
        id: z.string(),
        status: z.string(),
        round: z.number(),
        maxRounds: z.number(),
        ownerId: z.string(),
        allowedAlgos: z.array(z.string()),
      }),
      players: z.array(z.any()),
      me: z.any()
    }),
    gameStart: z.object({ algo: z.string(), array: z.array(z.number()), round: z.number().optional(), maxRounds: z.number().optional() }),
    roundResult: z.object({ winner: z.string().optional(), correctAlgo: z.string(), round: z.number().optional(), maxRounds: z.number().optional(), players: z.array(z.any()) }),
  }
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
