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
};

export const ws = {
  // Client to Server
  send: {
    joinRoom: z.object({ playerName: z.string(), roomId: z.string().optional() }),
    ready: z.object({}),
    guess: z.object({ algo: z.string() }),
  },
  // Server to Client
  receive: {
    roomUpdate: z.object({ 
      room: z.any(),
      players: z.array(z.any()),
      me: z.any()
    }),
    gameStart: z.object({ algo: z.string(), array: z.array(z.number()) }),
    roundResult: z.object({ winner: z.string().optional(), correctAlgo: z.string() }),
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
