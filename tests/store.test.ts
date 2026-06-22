import { describe, it, expect, beforeEach } from "bun:test";
import { USERS, BALANCES, ORDERBOOKS, FILLS, ORDERS, resetStore } from "../src/store";

describe("Store", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("initial state", () => {
    it("should have empty USERS array", () => {
      expect(USERS).toEqual([]);
    });

    it("should have empty BALANCES object", () => {
      expect(Object.keys(BALANCES).length).toBe(0);
    });

    it("should have SOL and BTC orderbooks with empty bids and asks", () => {
      expect(ORDERBOOKS.SOL).toEqual({ bids: [], asks: [] });
      expect(ORDERBOOKS.BTC).toEqual({ bids: [], asks: [] });
    });

    it("should have empty FILLS array", () => {
      expect(FILLS).toEqual([]);
    });

    it("should have empty ORDERS array", () => {
      expect(ORDERS).toEqual([]);
    });
  });

  describe("resetStore", () => {
    it("should clear all data", () => {
      USERS.push({ id: "1", username: "test", password: "test" });
      BALANCES["1"] = { USD: { available: 100, locked: 0 } };
      ORDERBOOKS.SOL.bids.push({ price: 100, quantity: 5, userId: "1", orderId: "o1" });
      FILLS.push({
        id: "f1",
        orderId: "o1",
        symbol: "SOL",
        price: 100,
        quantity: 5,
        side: "buy",
        userId: "1",
        timestamp: Date.now(),
      });
      ORDERS.push({
        id: "o1",
        symbol: "SOL",
        price: 100,
        quantity: 5,
        side: "buy",
        userId: "1",
        filled: 0,
        status: "open",
      });

      resetStore();

      expect(USERS).toEqual([]);
      expect(Object.keys(BALANCES).length).toBe(0);
      expect(ORDERBOOKS.SOL).toEqual({ bids: [], asks: [] });
      expect(ORDERBOOKS.BTC).toEqual({ bids: [], asks: [] });
      expect(FILLS).toEqual([]);
      expect(ORDERS).toEqual([]);
    });

    it("should be idempotent", () => {
      resetStore();
      resetStore();
      expect(USERS).toEqual([]);
      expect(FILLS).toEqual([]);
    });
  });
});
