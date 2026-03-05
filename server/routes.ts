import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, ws as wsSchema } from "@shared/routes";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { ALGORITHMS, generateRandomArray } from "../client/src/lib/sorting";
import { nanoid } from "nanoid";

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
              player.score += 10;
              room.status = "waiting";
              // Reset ready states
              room.players.forEach(p => p.ready = false);
              
              broadcast(ws.roomId, "roundResult", { 
                winner: player.name, 
                correctAlgo: room.currentAlgo 
              });
              
              setTimeout(() => broadcastRoom(ws.roomId), 3000);
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
        p.socket.send(JSON.stringify({
          type: "roomUpdate",
          payload: {
            room: { id: room.id, status: room.status },
            players: playersList,
            me: { id: p.id }
          }
        }));
      });
    }
  }

  function startRoomGame(roomId: string) {
    const room = rooms.get(roomId);
    if (room) {
      const algo = ALGORITHMS[Math.floor(Math.random() * ALGORITHMS.length)];
      const array = generateRandomArray(40);
      room.status = "playing";
      room.currentAlgo = algo;
      room.array = array;
      
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

  // Seed database if empty
  const existingScores = await storage.getScores();
  if (existingScores.length === 0) {
    await storage.createScore({ playerName: "Ada", score: 15 });
    await storage.createScore({ playerName: "Alan", score: 10 });
    await storage.createScore({ playerName: "Grace", score: 5 });
  }

  return httpServer;
}
