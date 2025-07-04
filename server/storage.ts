import { users, challengeCompletions, type User, type InsertUser, type ChallengeCompletion, type InsertChallengeCompletion } from "@shared/schema";
import { db } from "./db";
import { eq, and, count, desc } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Challenge completion methods
  getUserChallengeCompletions(userName: string, deviceId: string): Promise<ChallengeCompletion[]>;
  toggleChallengeCompletion(challengeId: string, userName: string, deviceId: string): Promise<boolean>;
  getChallengeLeaderboard(): Promise<Array<{ userName: string; deviceId: string; completedCount: number }>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Challenge completion methods
  async getUserChallengeCompletions(userName: string, deviceId: string): Promise<ChallengeCompletion[]> {
    return await db
      .select()
      .from(challengeCompletions)
      .where(and(
        eq(challengeCompletions.userName, userName),
        eq(challengeCompletions.deviceId, deviceId)
      ));
  }

  async toggleChallengeCompletion(challengeId: string, userName: string, deviceId: string): Promise<boolean> {
    // Check if the challenge is already completed
    const existing = await db
      .select()
      .from(challengeCompletions)
      .where(and(
        eq(challengeCompletions.challengeId, challengeId),
        eq(challengeCompletions.userName, userName),
        eq(challengeCompletions.deviceId, deviceId)
      ));

    if (existing.length > 0) {
      // Remove completion (uncomplete the challenge)
      await db
        .delete(challengeCompletions)
        .where(and(
          eq(challengeCompletions.challengeId, challengeId),
          eq(challengeCompletions.userName, userName),
          eq(challengeCompletions.deviceId, deviceId)
        ));
      return false; // Challenge is now uncompleted
    } else {
      // Add completion (complete the challenge)
      await db
        .insert(challengeCompletions)
        .values({
          challengeId,
          userName,
          deviceId
        });
      return true; // Challenge is now completed
    }
  }

  async getChallengeLeaderboard(): Promise<Array<{ userName: string; deviceId: string; completedCount: number }>> {
    const results = await db
      .select({
        userName: challengeCompletions.userName,
        deviceId: challengeCompletions.deviceId,
        completedCount: count(challengeCompletions.id)
      })
      .from(challengeCompletions)
      .groupBy(challengeCompletions.userName, challengeCompletions.deviceId)
      .orderBy(desc(count(challengeCompletions.id)));

    return results.map(r => ({
      userName: r.userName,
      deviceId: r.deviceId,
      completedCount: Number(r.completedCount)
    }));
  }
}

export const storage = new DatabaseStorage();
