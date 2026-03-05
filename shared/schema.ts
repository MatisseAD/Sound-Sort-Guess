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

export const insertScoreSchema = createInsertSchema(scores).omit({ id: true, createdAt: true });

export type Score = typeof scores.$inferSelect;
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Room = typeof rooms.$inferSelect;
export type Player = typeof players.$inferSelect;
