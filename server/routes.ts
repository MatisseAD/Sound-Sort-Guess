import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, ws as wsSchema } from "@shared/routes";
import { registerSchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { ALGORITHMS, generateRandomArray } from "../client/src/lib/sorting";
import { nanoid } from "nanoid";
import { hashPassword, verifyPassword } from "./auth";
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives. Réessayez dans 15 minutes." },
});

const ROUND_TIMEOUT_MS = 90_000;

interface Client extends WebSocket {
  id?: string;
  roomId?: string;
  playerName?: string;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const rooms = new Map<string, {
    id: string;
    status: "waiting" | "playing";
    currentAlgo?: string;
    array?: number[];
    roundTimeout?: ReturnType<typeof setTimeout>;
    players: Map<string, { id: string, name: string, score: number, ready: boolean, socket: Client }>;
  }>();

  wss.on("connection", (ws: Client) => {
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "joinRoom") {
          const { playerName, roomId: targetRoomId } = wsSchema.send.joinRoom.parse(message.payload);
          const roomId = targetRoomId || nanoid(10);
          
          if (!rooms.has(roomId)) {
            rooms.set(roomId, { id: roomId, status: "waiting", players: new Map() });
          }
          
          const room = rooms.get(roomId)!;
          const playerId = nanoid(5);
          
          ws.id = playerId;
          ws.roomId = roomId;
          ws.playerName = playerName;
          
          room.players.set(playerId, {
            id: playerId,
            name: playerName,
            score: 0,
            ready: false,
            socket: ws
          });
          
          broadcastRoom(roomId);
        }

        if (message.type === "ready" && ws.roomId && ws.id) {
          const room = rooms.get(ws.roomId);
          if (room) {
            const player = room.players.get(ws.id);
            if (player) {
              player.ready = !player.ready;
              
              // Check if all ready
              const allReady = Array.from(room.players.values()).every(p => p.ready);
              if (allReady && room.players.size >= 2 && room.status === "waiting") {
                startRoomGame(ws.roomId);
              } else {
                broadcastRoom(ws.roomId);
              }
            }
          }
        }

        if (message.type === "guess" && ws.roomId && ws.id) {
          const room = rooms.get(ws.roomId);
          if (room && room.status === "playing") {
            const { algo } = wsSchema.send.guess.parse(message.payload);
            const player = room.players.get(ws.id);
            if (player && algo === room.currentAlgo) {
              endRound(ws.roomId, player.name);
            }
          }
        }
      } catch (e) {
        console.error("WS error:", e);
      }
    });

    ws.on("close", () => {
      if (ws.roomId && ws.id) {
        const room = rooms.get(ws.roomId);
        if (room) {
          room.players.delete(ws.id);
          if (room.players.size === 0) {
            if (room.roundTimeout) clearTimeout(room.roundTimeout);
            rooms.delete(ws.roomId);
          } else {
            broadcastRoom(ws.roomId);
          }
        }
      }
    });
  });

  function broadcast(roomId: string, type: string, payload: any) {
    const room = rooms.get(roomId);
    if (room) {
      const msg = JSON.stringify({ type, payload });
      room.players.forEach(p => {
        if (p.socket.readyState === WebSocket.OPEN) {
          p.socket.send(msg);
        }
      });
    }
  }

  function broadcastRoom(roomId: string) {
    const room = rooms.get(roomId);
    if (room) {
      const playersList = Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        ready: p.ready
      }));
      
      room.players.forEach(p => {
        if (p.socket.readyState === WebSocket.OPEN) {
          p.socket.send(JSON.stringify({
            type: "roomUpdate",
            payload: {
              room: { id: room.id, status: room.status },
              players: playersList,
              me: { id: p.id }
            }
          }));
        }
      });
    }
  }

  function endRound(roomId: string, winnerName?: string) {
    const room = rooms.get(roomId);
    if (!room || room.status !== "playing") return;

    // Clear the round timeout if it's still pending
    if (room.roundTimeout) {
      clearTimeout(room.roundTimeout);
      room.roundTimeout = undefined;
    }

    // Award point to winner
    if (winnerName) {
      room.players.forEach(p => {
        if (p.name === winnerName) p.score += 10;
      });
    }

    room.status = "waiting";
    room.players.forEach(p => p.ready = false);

    broadcast(roomId, "roundResult", {
      winner: winnerName ?? null,
      correctAlgo: room.currentAlgo
    });

    setTimeout(() => broadcastRoom(roomId), 3000);
  }

  function startRoomGame(roomId: string) {
    const room = rooms.get(roomId);
    if (room) {
      const algo = ALGORITHMS[Math.floor(Math.random() * ALGORITHMS.length)];
      const array = generateRandomArray(40);
      room.status = "playing";
      room.currentAlgo = algo;
      room.array = array;

      // Timeout: end round automatically after 90 seconds if nobody guesses correctly
      room.roundTimeout = setTimeout(() => endRound(roomId, undefined), ROUND_TIMEOUT_MS);

      broadcast(roomId, "gameStart", { algo, array });
    }
  }
  app.get(api.scores.list.path, async (req, res) => {
    const scoresList = await storage.getScores();
    res.json(scoresList);
  });

  app.post(api.scores.create.path, async (req, res) => {
    try {
      const input = api.scores.create.input.parse(req.body);
      const score = await storage.createScore(input);
      res.status(201).json(score);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Auth: Register
  app.post(api.auth.register.path, authLimiter, async (req, res) => {
    try {
      const input = registerSchema.parse(req.body);

      const existingMail = await storage.getUtilisateurByMail(input.mail);
      if (existingMail) {
        return res.status(409).json({ message: "Cette adresse mail est déjà utilisée." });
      }

      const existingPseudo = await storage.getUtilisateurByPseudo(input.pseudo);
      if (existingPseudo) {
        return res.status(409).json({ message: "Ce pseudo est déjà utilisé." });
      }

      const hashedPassword = await hashPassword(input.motDePasse);
      const user = await storage.createUtilisateur({
        pseudo: input.pseudo,
        mail: input.mail,
        motDePasse: hashedPassword,
      });

      req.session.userId = user.id;

      return res.status(201).json({
        id: user.id,
        pseudo: user.pseudo,
        mail: user.mail,
        score: user.score,
        pointsBoutiques: user.pointsBoutiques,
        createdAt: user.createdAt.toISOString(),
        lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Auth: Login
  app.post(api.auth.login.path, authLimiter, async (req, res) => {
    try {
      const input = loginSchema.parse(req.body);

      const user = await storage.getUtilisateurByMail(input.mail);
      if (!user) {
        return res.status(401).json({ message: "Identifiants incorrects." });
      }

      const valid = await verifyPassword(input.motDePasse, user.motDePasse);
      if (!valid) {
        return res.status(401).json({ message: "Identifiants incorrects." });
      }

      await storage.updateLastLogin(user.id);
      req.session.userId = user.id;

      const updatedUser = await storage.getUtilisateurById(user.id);

      return res.status(200).json({
        id: user.id,
        pseudo: user.pseudo,
        mail: user.mail,
        score: user.score,
        pointsBoutiques: user.pointsBoutiques,
        createdAt: user.createdAt.toISOString(),
        lastLogin: updatedUser?.lastLogin ? updatedUser.lastLogin.toISOString() : null,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Auth: Logout
  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Déconnecté avec succès." });
    });
  });

  // Auth: Me
  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }
    const user = await storage.getUtilisateurById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable." });
    }
    return res.status(200).json({
      id: user.id,
      pseudo: user.pseudo,
      mail: user.mail,
      score: user.score,
      pointsBoutiques: user.pointsBoutiques,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    });
  });

  // Seed database if empty
  const existingScores = await storage.getScores();
  if (existingScores.length === 0) {
    await storage.createScore({ playerName: "Ada", score: 15 });
    await storage.createScore({ playerName: "Alan", score: 10 });
    await storage.createScore({ playerName: "Grace", score: 5 });
  }

  return httpServer;
}
