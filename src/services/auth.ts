import { USERS, BALANCES } from "../store";
import type { User } from "../types";
import { randomUUID } from "crypto";

export function signup(
  username: string,
  password: string
): { success: true; user: Omit<User, "password"> } | { success: false; error: string } {
  if (!username || !password) {
    return { success: false, error: "Username and password are required" };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  const existingUser = USERS.find((u) => u.username === username);
  if (existingUser) {
    return { success: false, error: "Username already exists" };
  }

  const user: User = {
    id: randomUUID(),
    username,
    password,
  };

  USERS.push(user);

  BALANCES[user.id] = {
    USD: { available: 0, locked: 0 },
    SOL: { available: 0, locked: 0 },
    BTC: { available: 0, locked: 0 },
  };

  return { success: true, user: { id: user.id, username: user.username } };
}

export function signin(
  username: string,
  password: string
): { success: true; user: Omit<User, "password"> } | { success: false; error: string } {
  if (!username || !password) {
    return { success: false, error: "Username and password are required" };
  }

  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  return { success: true, user: { id: user.id, username: user.username } };
}
