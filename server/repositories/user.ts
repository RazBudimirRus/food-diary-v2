import {
  apiUsage,
  days,
  meals,
  pushSubscriptions,
  secrets,
  userProfiles,
  users,
  type ApiUsage,
  type Day,
  type Meal,
  type PushSubscription,
  type User,
  type UserProfile,
} from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { db, sqlite } from "../db";

/**
 * UserRepository — real Drizzle/SQL access (Phase 29 finish / v2.27).
 * Do not import storage (avoids cycles). Storage facade delegates here.
 */
export class UserRepository {
  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  getUserByUsername(username: string): User | undefined {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email)).get();
  }

  searchUsers(q: string, limit = 10): User[] {
    const results = db.select().from(users).all();
    const ql = q.toLowerCase();
    return results
      .filter((u) => u.username.toLowerCase().includes(ql) || (u.displayName?.toLowerCase().includes(ql) ?? false))
      .slice(0, limit);
  }

  createUser(data: {
    username: string;
    email: string;
    passwordHash: string;
    displayName?: string;
    pdConsentAt?: string;
  }): User {
    return db
      .insert(users)
      .values({
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName ?? null,
        role: "user",
        pdConsentAt: data.pdConsentAt ?? null,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  deleteUser(userId: number): void {
    sqlite.prepare("DELETE FROM api_usage WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM refresh_tokens WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM secrets WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM user_profiles WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM meals WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM days WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM users WHERE id = ?").run(userId);
  }

  getUserAllData(userId: number): { user: User | undefined; days: Day[]; meals: Meal[]; apiUsage: ApiUsage[] } {
    return {
      user: this.getUserById(userId),
      days: db.select().from(days).where(eq(days.userId, userId)).all(),
      meals: db.select().from(meals).where(eq(meals.userId, userId)).all(),
      apiUsage: db.select().from(apiUsage).where(eq(apiUsage.userId, userId)).all(),
    };
  }

  getUserProfile(userId: number): UserProfile | undefined {
    return db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).get();
  }

  upsertUserProfile(userId: number, data: Partial<UserProfile>): UserProfile {
    const existing = this.getUserProfile(userId);
    if (existing) {
      const { id: _id, userId: _userId, ...rest } = data;
      return db
        .update(userProfiles)
        .set({ ...rest, updatedAt: new Date().toISOString() })
        .where(eq(userProfiles.userId, userId))
        .returning()
        .get();
    }
    const { id: _id, userId: _userId, ...rest } = data;
    return db
      .insert(userProfiles)
      .values({
        userId,
        ...rest,
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  bootstrapAdminByUsername(username: string): User | undefined {
    const user = this.getUserByUsername(username);
    if (!user) return undefined;
    if (user.role === "admin") return user;
    return db.update(users).set({ role: "admin" }).where(eq(users.id, user.id)).returning().get();
  }

  updateUserPassword(userId: number, passwordHash: string): User | undefined {
    return db.update(users).set({ passwordHash }).where(eq(users.id, userId)).returning().get();
  }

  updateUserProfile(userId: number, data: { displayName?: string }): User | undefined {
    const updates: Partial<typeof users.$inferInsert> = {};
    if (data.displayName !== undefined) updates.displayName = data.displayName;
    if (Object.keys(updates).length === 0) return this.getUserById(userId);
    return db.update(users).set(updates).where(eq(users.id, userId)).returning().get();
  }

  setLastLogin(userId: number): void {
    db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, userId)).run();
  }

  setMfaSecret(userId: number, packedSecret: string): void {
    db.update(users).set({ mfaSecret: packedSecret }).where(eq(users.id, userId)).run();
  }

  enableMfa(userId: number): void {
    db.update(users).set({ mfaEnabled: true }).where(eq(users.id, userId)).run();
  }

  disableMfa(userId: number): void {
    db.update(users).set({ mfaEnabled: false, mfaSecret: null }).where(eq(users.id, userId)).run();
  }

  listUsers(): User[] {
    return db
      .select()
      .from(users)
      .all()
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  setUserRole(userId: number, role: "user" | "doctor" | "admin"): User | undefined {
    return db.update(users).set({ role }).where(eq(users.id, userId)).returning().get();
  }

  upsertDietaryRestrictions(userId: number, restrictions: string): UserProfile {
    const now = new Date().toISOString();
    const existing = sqlite.prepare("SELECT id FROM user_profiles WHERE user_id = ?").get(userId);
    if (existing) {
      sqlite
        .prepare("UPDATE user_profiles SET dietary_restrictions = ?, updated_at = ? WHERE user_id = ?")
        .run(restrictions, now, userId);
    } else {
      sqlite
        .prepare("INSERT INTO user_profiles (user_id, dietary_restrictions, updated_at) VALUES (?, ?, ?)")
        .run(userId, restrictions, now);
    }
    return db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).get()!;
  }

  savePushSubscription(data: { userId: number; endpoint: string; p256dh: string; auth: string }): PushSubscription {
    const existing = db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, data.endpoint)).get();
    if (existing) {
      return db
        .update(pushSubscriptions)
        .set({ userId: data.userId, p256dh: data.p256dh, auth: data.auth })
        .where(eq(pushSubscriptions.endpoint, data.endpoint))
        .returning()
        .get();
    }
    return db
      .insert(pushSubscriptions)
      .values({
        ...data,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  getUserPushSubscriptions(userId: number): PushSubscription[] {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).all();
  }

  deletePushSubscription(endpoint: string): void {
    db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).run();
  }

  getSecret(userId: number, key: string) {
    return db
      .select()
      .from(secrets)
      .where(and(eq(secrets.userId, userId), eq(secrets.key, key)))
      .get();
  }

  setSecret(userId: number, key: string, encryptedValue: string, iv: string) {
    const existing = this.getSecret(userId, key);
    if (existing) {
      return db
        .update(secrets)
        .set({ encryptedValue, iv, updatedAt: new Date().toISOString() })
        .where(eq(secrets.id, existing.id))
        .returning()
        .get();
    }
    return db
      .insert(secrets)
      .values({
        userId,
        key,
        encryptedValue,
        iv,
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  listSecretKeys(userId: number): string[] {
    return db
      .select({ key: secrets.key })
      .from(secrets)
      .where(eq(secrets.userId, userId))
      .all()
      .map((r) => r.key);
  }
}

export const userRepository = new UserRepository();
