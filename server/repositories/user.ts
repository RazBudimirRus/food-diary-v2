import { storage } from "../storage";
import type { User, UserProfile, InsertUser } from "@shared/schema";

export class UserRepository {
  getUserById(id: number) {
    return storage.getUserById(id);
  }
  getUserByUsername(username: string) {
    return storage.getUserByUsername(username);
  }
  getUserByEmail(email: string) {
    return storage.getUserByEmail(email);
  }
  searchUsers(q: string, limit?: number) {
    return storage.searchUsers(q, limit);
  }
  createUser(data: Parameters<typeof storage.createUser>[0]) {
    return storage.createUser(data);
  }
  updateUserPassword(userId: number, passwordHash: string) {
    return storage.updateUserPassword(userId, passwordHash);
  }
  updateUserProfile(userId: number, data: { displayName?: string }) {
    return storage.updateUserProfile(userId, data);
  }
  setLastLogin(userId: number) {
    return storage.setLastLogin(userId);
  }
  deleteUser(userId: number) {
    return storage.deleteUser(userId);
  }
  getUserAllData(userId: number) {
    return storage.getUserAllData(userId);
  }
  getUserProfile(userId: number) {
    return storage.getUserProfile(userId);
  }
  upsertUserProfile(userId: number, data: Parameters<typeof storage.upsertUserProfile>[1]) {
    return storage.upsertUserProfile(userId, data);
  }
  listUsers() {
    return storage.listUsers();
  }
  setUserRole(userId: number, role: "user" | "doctor" | "admin") {
    return storage.setUserRole(userId, role);
  }
  bootstrapAdminByUsername(username: string) {
    return storage.bootstrapAdminByUsername(username);
  }
  upsertDietaryRestrictions(userId: number, restrictions: string) {
    return storage.upsertDietaryRestrictions(userId, restrictions);
  }
  savePushSubscription(data: Parameters<typeof storage.savePushSubscription>[0]) {
    return storage.savePushSubscription(data);
  }
  getUserPushSubscriptions(userId: number) {
    return storage.getUserPushSubscriptions(userId);
  }
  deletePushSubscription(endpoint: string) {
    return storage.deletePushSubscription(endpoint);
  }
}

export const userRepository = new UserRepository();
