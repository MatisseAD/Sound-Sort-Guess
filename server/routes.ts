import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, ws as wsSchema } from "@shared/routes";
import { registerSchema, loginSchema, type Utilisateur } from "@shared/schema";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { ALGORITHMS, generateRandomArray, getProgressiveAlgos, getTimerProgressiveAlgos } from "../client/src/lib/sorting";
import { nanoid, customAlphabet } from "nanoid";
import { hashPassword, verifyPassword } from "./auth";
import rateLimit from "express-rate-limit";
import { SHOP_ITEMS } from "../client/src/lib/shop";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives. Réessayez dans 15 minutes." },
});

const ROUND_TIMEOUT_MS = 90_000;

// 6 characters, uppercase letters + digits
const ROOM_CODE_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ROOM_CODE_LENGTH = 5;
const makeRoomId = customAlphabet(ROOM_CODE_ALPHA, ROOM_CODE_LENGTH);
const isValidRoomId = (id: string) => /^[A-Z0-9]{5}$/.test(id);
const MAX_ROUNDS = 10;

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
    status: "waiting" | "playing" | "ended";
    round: number;
    maxRounds: number;
    ownerId: string;
    allowedAlgos: string[];
    mode: "classic" | "time-trial";
    hardcore: boolean;
    progressive: boolean;
    preset?: string;
    marathon: boolean;
    baseGroup: number;
    currentAlgo?: string;
    array?: number[];
    roundTimeout?: ReturnType<typeof setTimeout>;
    players: Map<string, { id: string, name: string, score: number, ready: boolean, hasGuessed: boolean, eliminated: boolean, socket: Client }>;
  }>();

  wss.on("connection", (ws: Client) => {
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "joinRoom") {
          const { playerName, roomId: targetRoomId } = wsSchema.send.joinRoom.parse(message.payload);
          const normalizedRoomId = targetRoomId ? targetRoomId.toUpperCase() : undefined;
          const roomId = normalizedRoomId && isValidRoomId(normalizedRoomId) ? normalizedRoomId : makeRoomId();
          const playerId = nanoid(5);

          if (!rooms.has(roomId)) {
            rooms.set(roomId, {
              id: roomId,
              status: "waiting",
              round: 0,
              maxRounds: MAX_ROUNDS,
              ownerId: playerId,
              allowedAlgos: [...ALGORITHMS],
              mode: "classic",
              hardcore: false,
              progressive: true,
              preset: "classic",
              marathon: false,
              baseGroup: 0,
              players: new Map(),
            });
          }
          
          const room = rooms.get(roomId)!;
          
          ws.id = playerId;
          ws.roomId = roomId;
          ws.playerName = playerName;
          
          room.players.set(playerId, {
            id: playerId,
            name: playerName,
            score: 0,
            ready: false,
            hasGuessed: false,
            eliminated: false,
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
            }
            // Just broadcast updated ready state; the host can start once everyone is ready.
            broadcastRoom(ws.roomId);
          }
        }

        if (message.type === "startRound" && ws.roomId && ws.id) {
          const room = rooms.get(ws.roomId);
          if (room && room.ownerId === ws.id && room.status === "waiting" && room.round < room.maxRounds) {
            // For the first round, require all players to be ready.
            // For subsequent rounds, the host can start immediately.
            const allReady = Array.from(room.players.values()).every(p => p.ready);
            const soloPlayer = room.players.size === 1;
            const canStart = room.round === 0 ? (soloPlayer || allReady) : true;
            if (canStart) {
              startRoomGame(ws.roomId);
            }
          }
        }

        if (message.type === "setRoomOptions" && ws.roomId && ws.id) {
          const room = rooms.get(ws.roomId);
          if (room && room.ownerId === ws.id && room.status === "waiting") {
            const { maxRounds, allowedAlgos, mode, hardcore, progressive, preset, marathon, baseGroup } = wsSchema.send.setRoomOptions.parse(message.payload);
            if (typeof maxRounds === "number") {
              room.maxRounds = Math.max(1, Math.min(MAX_ROUNDS, maxRounds));
            }

            if (typeof mode === "string") {
              room.mode = mode;
            }
            if (typeof hardcore === "boolean") {
              room.hardcore = hardcore;
            }
            if (typeof progressive === "boolean") {
              room.progressive = progressive;
            }
            if (typeof preset === "string") {
              room.preset = preset;
            }
            if (typeof marathon === "boolean") {
              room.marathon = marathon;
            }
            if (typeof baseGroup === "number") {
              room.baseGroup = Math.max(0, Math.min(6, baseGroup));
            }

            if (Array.isArray(allowedAlgos) && allowedAlgos.length) {
              const validAlgos = new Set<string>(ALGORITHMS);
              const filtered = allowedAlgos.filter(a => validAlgos.has(a));
              if (filtered.length) {
                room.allowedAlgos = filtered;
              }
            }

            broadcastRoom(ws.roomId);
          }
        }

        if (message.type === "kickPlayer" && ws.roomId && ws.id) {
          const room = rooms.get(ws.roomId);
          if (room && room.ownerId === ws.id) {
            const { playerId } = wsSchema.send.kickPlayer.parse(message.payload);
            const target = room.players.get(playerId);
            if (target) {
              room.players.delete(playerId);
              if (target.socket.readyState === WebSocket.OPEN) {
                target.socket.send(JSON.stringify({ type: "kicked", payload: { reason: "You were kicked from the room." } }));
                target.socket.close();
              }
              broadcastRoom(ws.roomId);
            }
          }
        }

        if (message.type === "guess" && ws.roomId && ws.id) {
          const room = rooms.get(ws.roomId);
          if (room && room.status === "playing") {
            const { algo } = wsSchema.send.guess.parse(message.payload);
            const player = room.players.get(ws.id);
            if (!player || player.hasGuessed || player.eliminated) return;

            player.hasGuessed = true;

            // Correct guess ends the round immediately.
            if (algo === room.currentAlgo) {
              endRound(ws.roomId, player.name);
              return;
            }

            // Marathon: eliminate on wrong guess.
            if (room.marathon) {
              player.eliminated = true;
            }

            // End round if everyone has guessed (or is eliminated) 
            const everyoneDone = Array.from(room.players.values()).every(p => p.hasGuessed || p.eliminated);
            if (everyoneDone) {
              // In marathon mode, declare winner when one remains.
              if (room.marathon) {
                const alive = Array.from(room.players.values()).filter(p => !p.eliminated);
                if (alive.length === 1) {
                  endRound(ws.roomId, alive[0].name);
                  return;
                }
                if (alive.length === 0) {
                  endRound(ws.roomId, undefined);
                  return;
                }
              }

              endRound(ws.roomId, undefined);
              return;
            }

            broadcastRoom(ws.roomId);
          }
        }

        if (message.type === "resetRoom" && ws.roomId) {
          const room = rooms.get(ws.roomId);
          if (room) {
            room.status = "waiting";
            room.round = 0;
            room.currentAlgo = undefined;
            room.array = undefined;
            room.players.forEach(p => {
              p.score = 0;
              p.ready = false;
              p.hasGuessed = false;
            });
            broadcastRoom(ws.roomId);
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
          const wasOwner = room.ownerId === ws.id;
          room.players.delete(ws.id);

          // If the owner leaves, transfer ownership to another player.
          if (wasOwner && room.players.size > 0) {
            const nextOwner = Array.from(room.players.values())[0];
            room.ownerId = nextOwner.id;
          }

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
        ready: p.ready,
        hasGuessed: p.hasGuessed,
        eliminated: p.eliminated,
      }));
      
      room.players.forEach(p => {
        if (p.socket.readyState === WebSocket.OPEN) {
          p.socket.send(JSON.stringify({
            type: "roomUpdate",
            payload: {
              room: {
                id: room.id,
                status: room.status,
                round: room.round,
                maxRounds: room.maxRounds,
                ownerId: room.ownerId,
                allowedAlgos: room.allowedAlgos,
                mode: room.mode,
                hardcore: room.hardcore,
                progressive: room.progressive,
                preset: room.preset,
                marathon: room.marathon,
                baseGroup: room.baseGroup,
              },
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
        if (p.name === winnerName) p.score += 1;
      });
    }

    room.players.forEach(p => p.ready = false);

    const playersList = Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      ready: p.ready,
      hasGuessed: p.hasGuessed,
    }));

    broadcast(roomId, "roundResult", {
      winner: winnerName ?? null,
      correctAlgo: room.currentAlgo,
      round: room.round,
      maxRounds: room.maxRounds,
      players: playersList,
    });

    // Update scores to clients
    broadcastRoom(roomId);

    // If we've reached the max number of rounds, end the game
    if (room.round >= room.maxRounds) {
      room.status = "ended";
      const finalPlayers = Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, score: p.score }));
      broadcast(roomId, "gameOver", { players: finalPlayers });
      return;
    }

    // Mark room as waiting for next round (so ready button can start it)
    room.status = "waiting";
    room.roundTimeout = undefined;
  }

  function startRoomGame(roomId: string) {
    const room = rooms.get(roomId);
    if (!room || room.status === "ended" || room.round >= room.maxRounds) return;

    // Clear any pending timeouts so we can start cleanly.
    if (room.roundTimeout) {
      clearTimeout(room.roundTimeout);
      room.roundTimeout = undefined;
    }

    room.round += 1;
    const hardcore = room.hardcore || false;
    const mode = room.players.size > 1 ? "classic" : (room.mode || "classic");
    const progressive = room.progressive ?? true;

    const baseGroup = Math.max(0, Math.min(6, room.baseGroup ?? 0));
    const interval = hardcore ? 15 : 10;
    const effectiveRound = room.round + baseGroup * interval;

    const availableAlgos = room.progressive
      ? (mode === "time-trial"
          ? getTimerProgressiveAlgos(effectiveRound, hardcore)
          : getProgressiveAlgos(effectiveRound, hardcore))
      : (room.allowedAlgos && room.allowedAlgos.length ? room.allowedAlgos : ALGORITHMS);

    const algo = availableAlgos[Math.floor(Math.random() * availableAlgos.length)];
    const array = generateRandomArray(40);
    room.status = "playing";
    room.currentAlgo = algo;
    room.array = array;

    // Reset per-player round state
    room.players.forEach(p => {
      p.ready = false;
      p.hasGuessed = false;
      if (!room.marathon) {
        p.eliminated = false;
      }
    });

    // Timeout: end round automatically after 90 seconds if nobody guesses correctly
    room.roundTimeout = setTimeout(() => endRound(roomId, undefined), ROUND_TIMEOUT_MS);

    broadcast(roomId, "gameStart", { algo, array, round: room.round, maxRounds: room.maxRounds });
  }

  function serializeUser(user: Utilisateur) {
    return {
      id: user.id,
      pseudo: user.pseudo,
      mail: user.mail,
      score: user.score,
      pointsBoutiques: user.pointsBoutiques,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
      purchasedItems: JSON.parse(user.purchasedItems ?? "[]") as string[],
      equippedTheme: user.equippedTheme ?? "default",
    };
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

      return res.status(201).json(serializeUser(user));
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
      if (!updatedUser) {
        return res.status(500).json({ message: "Erreur interne." });
      }

      return res.status(200).json(serializeUser(updatedUser));
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
    return res.status(200).json(serializeUser(user));
  });

  // User: Update stats after a game
  app.post(api.user.updateStats.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }
    try {
      const { scoreToAdd, coinsToAdd } = api.user.updateStats.input.parse(req.body);
      const user = await storage.updateUserStats(req.session.userId, scoreToAdd, coinsToAdd);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable." });
      }
      return res.status(200).json(serializeUser(user));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Shop: Buy an item
  app.post(api.shop.buy.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }
    try {
      const { itemId } = api.shop.buy.input.parse(req.body);
      const shopItem = SHOP_ITEMS.find(i => i.id === itemId);
      if (!shopItem) {
        return res.status(400).json({ message: "Article introuvable." });
      }
      const user = await storage.purchaseItem(req.session.userId, itemId, shopItem.price);
      if (!user) {
        return res.status(400).json({ message: "Coins insuffisants ou utilisateur introuvable." });
      }
      return res.status(200).json(serializeUser(user));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Shop: Equip a theme
  app.post(api.shop.equip.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }
    try {
      const { itemId } = api.shop.equip.input.parse(req.body);
      const user = await storage.equipTheme(req.session.userId, itemId);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable." });
      }
      return res.status(200).json(serializeUser(user));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
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
