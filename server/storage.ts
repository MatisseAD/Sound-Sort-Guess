import { db } from "./db";
import {
  scores,
  utilisateurs,
  type InsertScore,
  type Score,
  type InsertUtilisateur,
  type Utilisateur,
} from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  getScores(): Promise<Score[]>;
  createScore(score: InsertScore): Promise<Score>;
  createUtilisateur(data: InsertUtilisateur): Promise<Utilisateur>;
  getUtilisateurByMail(mail: string): Promise<Utilisateur | undefined>;
  getUtilisateurByPseudo(pseudo: string): Promise<Utilisateur | undefined>;
  getUtilisateurById(id: number): Promise<Utilisateur | undefined>;
  updateLastLogin(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getScores(): Promise<Score[]> {
    return await db.select().from(scores).orderBy(desc(scores.score)).limit(100);
  }

  async createScore(insertScore: InsertScore): Promise<Score> {
    const [score] = await db.insert(scores).values(insertScore).returning();
    return score;
  }

  async createUtilisateur(data: InsertUtilisateur): Promise<Utilisateur> {
    const [user] = await db.insert(utilisateurs).values(data).returning();
    return user;
  }

  async getUtilisateurByMail(mail: string): Promise<Utilisateur | undefined> {
    const [user] = await db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.mail, mail));
    return user;
  }

  async getUtilisateurByPseudo(pseudo: string): Promise<Utilisateur | undefined> {
    const [user] = await db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.pseudo, pseudo));
    return user;
  }

  async getUtilisateurById(id: number): Promise<Utilisateur | undefined> {
    const [user] = await db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, id));
    return user;
  }

  async updateLastLogin(id: number): Promise<void> {
    await db
      .update(utilisateurs)
      .set({ lastLogin: new Date() })
      .where(eq(utilisateurs.id, id));
  }
}

export const storage = new DatabaseStorage();
