import { db } from "./db";
import { scores, users, type InsertScore, type Score, type User, type InsertUser } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  getScores(): Promise<Score[]>;
  createScore(score: InsertScore): Promise<Score>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByMail(mail: string): Promise<User | undefined>;
  getUserByPseudo(pseudo: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<Pick<User, 'totalScore' | 'pointsBoutiques' | 'purchasedItems' | 'equippedTheme'>>): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getScores(): Promise<Score[]> {
    return await db.select().from(scores).orderBy(desc(scores.score)).limit(100);
  }

  async createScore(insertScore: InsertScore): Promise<Score> {
    const [score] = await db.insert(scores).values(insertScore).returning();
    return score;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByMail(mail: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.mail, mail));
    return user;
  }

  async getUserByPseudo(pseudo: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.pseudo, pseudo));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(
    id: number,
    updates: Partial<Pick<User, 'totalScore' | 'pointsBoutiques' | 'purchasedItems' | 'equippedTheme'>>
  ): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!user) throw new Error(`User with id ${id} not found`);
    return user;
  }
}

export const storage = new DatabaseStorage();
