import { pgTable, text, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: varchar("id", { length: 21 }).primaryKey(),
  status: text("status").notNull().default("waiting"), // waiting, playing, finished
  currentAlgo: text("current_algo"),
  array: integer("array").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  roomId: varchar("room_id", { length: 21 }).references(() => rooms.id),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull().default(0),
  isReady: integer("is_ready").notNull().default(0), // 0 or 1
  socketId: text("socket_id"),
});

export const utilisateurs = pgTable("utilisateurs", {
  id: serial("id").primaryKey(),
  pseudo: varchar("pseudo", { length: 50 }).unique().notNull(),
  pointsBoutiques: integer("points_boutiques").default(0),
  score: integer("score").default(0),
  mail: varchar("mail", { length: 255 }).unique().notNull(),
  motDePasse: varchar("mot_de_passe", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
  purchasedItems: text("purchased_items").notNull().default("[]"),
  equippedTheme: varchar("equipped_theme", { length: 50 }).default("default"),
});

export const insertScoreSchema = createInsertSchema(scores).omit({ id: true, createdAt: true });

export const insertUtilisateurSchema = createInsertSchema(utilisateurs).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
  pointsBoutiques: true,
  score: true,
  purchasedItems: true,
  equippedTheme: true,
});

export const registerSchema = insertUtilisateurSchema.extend({
  pseudo: z.string().min(3).max(50),
  mail: z.string().email(),
  motDePasse: z.string().min(8),
});

export const loginSchema = z.object({
  mail: z.string().email(),
  motDePasse: z.string().min(1),
});

export type Score = typeof scores.$inferSelect;
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Room = typeof rooms.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Utilisateur = typeof utilisateurs.$inferSelect;
export type InsertUtilisateur = z.infer<typeof insertUtilisateurSchema>;
