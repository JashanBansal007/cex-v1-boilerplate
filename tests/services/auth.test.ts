import { describe, it, expect, beforeEach } from "bun:test";
import { signup, signin } from "../../src/services/auth";
import { resetStore, USERS, BALANCES } from "../../src/store";

describe("Auth Service", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("signup", () => {
    it("should create a new user with valid credentials", () => {
      const result = signup("testuser", "password123");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.username).toBe("testuser");
        expect(result.user.id).toBeDefined();
      }
    });

    it("should initialize balances for new user", () => {
      const result = signup("testuser", "password123");
      if (result.success) {
        const balance = BALANCES[result.user.id];
        expect(balance).toBeDefined();
        expect(balance.USD).toEqual({ available: 0, locked: 0 });
        expect(balance.SOL).toEqual({ available: 0, locked: 0 });
        expect(balance.BTC).toEqual({ available: 0, locked: 0 });
      }
    });

    it("should add the user to the USERS store", () => {
      signup("testuser", "password123");
      expect(USERS.length).toBe(1);
      expect(USERS[0].username).toBe("testuser");
    });

    it("should fail if username is empty", () => {
      const result = signup("", "password123");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Username and password are required");
      }
    });

    it("should fail if password is empty", () => {
      const result = signup("testuser", "");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Username and password are required");
      }
    });

    it("should fail if password is too short", () => {
      const result = signup("testuser", "12345");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Password must be at least 6 characters");
      }
    });

    it("should fail if username already exists", () => {
      signup("testuser", "password123");
      const result = signup("testuser", "differentpass");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Username already exists");
      }
    });

    it("should allow multiple different users to sign up", () => {
      const result1 = signup("user1", "password123");
      const result2 = signup("user2", "password456");
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(USERS.length).toBe(2);
    });
  });

  describe("signin", () => {
    beforeEach(() => {
      signup("testuser", "password123");
    });

    it("should sign in with valid credentials", () => {
      const result = signin("testuser", "password123");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.username).toBe("testuser");
      }
    });

    it("should fail with wrong password", () => {
      const result = signin("testuser", "wrongpassword");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid credentials");
      }
    });

    it("should fail with non-existent username", () => {
      const result = signin("nonexistent", "password123");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid credentials");
      }
    });

    it("should fail if username is empty", () => {
      const result = signin("", "password123");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Username and password are required");
      }
    });

    it("should fail if password is empty", () => {
      const result = signin("testuser", "");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Username and password are required");
      }
    });
  });
});
