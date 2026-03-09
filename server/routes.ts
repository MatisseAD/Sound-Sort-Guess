import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import type { PublicUser } from "@shared/routes";
import { hashPassword, verifyPassword } from "./auth";
import { SHOP_ITEMS } from "../client/src/lib/shop";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives, veuillez réessayer plus tard." },
});

function toPublicUser(user: { id: number; pseudo: string; mail: string; totalScore: number; pointsBoutiques: number; purchasedItems: string[]; equippedTheme: string }): PublicUser {
  return {
    id: user.id,
    pseudo: user.pseudo,
    mail: user.mail,
    totalScore: user.totalScore,
    pointsBoutiques: user.pointsBoutiques,
    purchasedItems: user.purchasedItems,
    equippedTheme: user.equippedTheme,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ─── Scores ───────────────────────────────────────────────────────────────
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

  // ─── Auth ─────────────────────────────────────────────────────────────────
  app.get(api.auth.me.path, async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié." });
    const user = await storage.getUserById(userId);
    if (!user) return res.status(401).json({ message: "Utilisateur introuvable." });
    res.json(toPublicUser(user));
  });

  app.post(api.auth.register.path, authLimiter, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existingMail = await storage.getUserByMail(input.mail);
      if (existingMail) {
        return res.status(409).json({ message: "Cette adresse email est déjà utilisée." });
      }
      const existingPseudo = await storage.getUserByPseudo(input.pseudo);
      if (existingPseudo) {
        return res.status(409).json({ message: "Ce pseudo est déjà pris." });
      }
      const passwordHash = await hashPassword(input.motDePasse);
      const user = await storage.createUser({
        pseudo: input.pseudo,
        mail: input.mail,
        passwordHash,
        totalScore: 0,
        pointsBoutiques: 0,
        purchasedItems: [],
        equippedTheme: "default",
      });
      req.session.userId = user.id;
      res.status(201).json(toPublicUser(user));
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

  app.post(api.auth.login.path, authLimiter, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByMail(input.mail);
      if (!user) {
        return res.status(401).json({ message: "Identifiants incorrects." });
      }
      const valid = await verifyPassword(input.motDePasse, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Identifiants incorrects." });
      }
      req.session.userId = user.id;
      res.json(toPublicUser(user));
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

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erreur lors de la déconnexion." });
      }
      res.json({ message: "Déconnecté." });
    });
  });

  // ─── User ─────────────────────────────────────────────────────────────────
  app.post(api.user.updateStats.path, async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié." });
    try {
      const input = api.user.updateStats.input.parse(req.body);
      const current = await storage.getUserById(userId);
      if (!current) return res.status(401).json({ message: "Utilisateur introuvable." });
      const updated = await storage.updateUser(userId, {
        totalScore: current.totalScore + input.scoreToAdd,
        pointsBoutiques: current.pointsBoutiques + input.coinsToAdd,
      });
      res.json(toPublicUser(updated));
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

  // ─── Shop ─────────────────────────────────────────────────────────────────
  app.post(api.shop.buy.path, async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié." });
    try {
      const input = api.shop.buy.input.parse(req.body);
      const item = SHOP_ITEMS.find((i) => i.id === input.itemId);
      if (!item) return res.status(404).json({ message: "Article introuvable." });
      const user = await storage.getUserById(userId);
      if (!user) return res.status(401).json({ message: "Utilisateur introuvable." });
      if (user.purchasedItems.includes(input.itemId)) {
        return res.status(409).json({ message: "Vous possédez déjà cet article." });
      }
      if (user.pointsBoutiques < item.price) {
        return res.status(400).json({ message: "Coins insuffisants." });
      }
      const updated = await storage.updateUser(userId, {
        pointsBoutiques: user.pointsBoutiques - item.price,
        purchasedItems: [...user.purchasedItems, input.itemId],
      });
      res.json(toPublicUser(updated));
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

  app.post(api.shop.equip.path, async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: "Non authentifié." });
    try {
      const input = api.shop.equip.input.parse(req.body);
      const user = await storage.getUserById(userId);
      if (!user) return res.status(401).json({ message: "Utilisateur introuvable." });
      // "default" is always available; other items require ownership
      if (input.itemId !== "default" && !user.purchasedItems.includes(input.itemId)) {
        return res.status(403).json({ message: "Vous ne possédez pas cet article." });
      }
      const updated = await storage.updateUser(userId, { equippedTheme: input.itemId });
      res.json(toPublicUser(updated));
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
    await storage.createScore({ playerName: "Ada", score: 15, mode: "classic", timeMs: 0 });
    await storage.createScore({ playerName: "Alan", score: 10, mode: "classic", timeMs: 0 });
    await storage.createScore({ playerName: "Grace", score: 5, mode: "classic", timeMs: 0 });
  }

  return httpServer;
}
