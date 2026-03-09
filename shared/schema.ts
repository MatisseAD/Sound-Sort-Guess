import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull(),
  mode: text("mode").notNull().default("classic"),
  timeMs: integer("time_ms").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScoreSchema = createInsertSchema(scores).omit({ id: true, createdAt: true });

export type Score = typeof scores.$inferSelect;
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type ScoreResponse = Score;
export type ScoresListResponse = Score[];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  pseudo: text("pseudo").notNull().unique(),
  mail: text("mail").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  totalScore: integer("total_score").notNull().default(0),
  pointsBoutiques: integer("points_boutiques").notNull().default(0),
  purchasedItems: text("purchased_items").array().notNull().default([]),
  equippedTheme: text("equipped_theme").notNull().default("default"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
