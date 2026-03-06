import { db } from "./db";
import {
  scores,
  utilisateurs,
  type InsertScore,
  type Score,
  type InsertUtilisateur,
  type Utilisateur,
} from "@shared/schema";
import { desc, eq, sql } from "drizzle-orm";

export interface IStorage {
  getScores(): Promise<Score[]>;
  createScore(score: InsertScore): Promise<Score>;
  createUtilisateur(data: InsertUtilisateur): Promise<Utilisateur>;
  getUtilisateurByMail(mail: string): Promise<Utilisateur | undefined>;
  getUtilisateurByPseudo(pseudo: string): Promise<Utilisateur | undefined>;
  getUtilisateurById(id: number): Promise<Utilisateur | undefined>;
  updateLastLogin(id: number): Promise<void>;
  updateUserStats(id: number, scoreToAdd: number, coinsToAdd: number): Promise<Utilisateur | undefined>;
  purchaseItem(id: number, itemId: string, cost: number): Promise<Utilisateur | undefined>;
  equipTheme(id: number, themeId: string): Promise<Utilisateur | undefined>;
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

  async updateUserStats(id: number, scoreToAdd: number, coinsToAdd: number): Promise<Utilisateur | undefined> {
    await db
      .update(utilisateurs)
      .set({
        score: sql`COALESCE(${utilisateurs.score}, 0) + ${scoreToAdd}`,
        pointsBoutiques: sql`COALESCE(${utilisateurs.pointsBoutiques}, 0) + ${coinsToAdd}`,
      })
      .where(eq(utilisateurs.id, id));
    return this.getUtilisateurById(id);
  }

  async purchaseItem(id: number, itemId: string, cost: number): Promise<Utilisateur | undefined> {
    const user = await this.getUtilisateurById(id);
    if (!user) return undefined;
    const currentCoins = user.pointsBoutiques ?? 0;
    if (currentCoins < cost) return undefined;
    const purchased: string[] = JSON.parse(user.purchasedItems ?? "[]");
    if (purchased.includes(itemId)) return user;
    purchased.push(itemId);
    await db
      .update(utilisateurs)
      .set({
        pointsBoutiques: currentCoins - cost,
        purchasedItems: JSON.stringify(purchased),
      })
      .where(eq(utilisateurs.id, id));
    return this.getUtilisateurById(id);
  }

  async equipTheme(id: number, themeId: string): Promise<Utilisateur | undefined> {
    await db
      .update(utilisateurs)
      .set({ equippedTheme: themeId })
      .where(eq(utilisateurs.id, id));
    return this.getUtilisateurById(id);
  }
}

export const storage = new DatabaseStorage();
