import { describe, it, expect, beforeEach, afterAll, beforeAll } from "bun:test";
import app from "../src/app";
import { resetStore, BALANCES } from "../src/store";
import { signup } from "../src/services/auth";
import type { Server } from "http";

let server: Server;
let baseUrl: string;

beforeAll((done) => {
  server = app.listen(0, () => {
    const address = server.address();
    if (address && typeof address !== "string") {
      baseUrl = `http://localhost:${address.port}`;
    }
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

async function request(method: string, path: string, body?: object) {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${path}`, options);
  const data = await res.json();
  return { status: res.status, data };
}

describe("API Routes", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("POST /signup", () => {
    it("should create a user and return 201", async () => {
      const { status, data } = await request("POST", "/signup", {
        username: "testuser",
        password: "password123",
      });
      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user.username).toBe("testuser");
    });

    it("should return 400 for duplicate username", async () => {
      await request("POST", "/signup", { username: "testuser", password: "password123" });
      const { status, data } = await request("POST", "/signup", {
        username: "testuser",
        password: "password456",
      });
      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should return 400 for missing fields", async () => {
      const { status, data } = await request("POST", "/signup", { username: "", password: "" });
      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("POST /signin", () => {
    beforeEach(async () => {
      await request("POST", "/signup", { username: "testuser", password: "password123" });
    });

    it("should sign in and return 200", async () => {
      const { status, data } = await request("POST", "/signin", {
        username: "testuser",
        password: "password123",
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 401 for invalid credentials", async () => {
      const { status, data } = await request("POST", "/signin", {
        username: "testuser",
        password: "wrongpass",
      });
      expect(status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe("POST /order", () => {
    let userId: string;

    beforeEach(() => {
      const result = signup("trader", "password123");
      if (!result.success) throw new Error("Failed to create user");
      userId = result.user.id;
      BALANCES[userId].USD.available = 100000;
      BALANCES[userId].SOL.available = 100;
    });

    it("should place an order and return 201", async () => {
      const { status, data } = await request("POST", "/order", {
        userId,
        symbol: "SOL",
        side: "buy",
        price: 100,
        quantity: 5,
      });
      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.order.symbol).toBe("SOL");
    });

    it("should return 400 for invalid order", async () => {
      const { status, data } = await request("POST", "/order", {
        userId,
        symbol: "INVALID",
        side: "buy",
        price: 100,
        quantity: 5,
      });
      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("GET /depth", () => {
    it("should return depth for a valid symbol", async () => {
      const { status, data } = await request("GET", "/depth?symbol=SOL");
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.bids).toEqual([]);
      expect(data.asks).toEqual([]);
    });

    it("should return 400 for invalid symbol", async () => {
      const { status, data } = await request("GET", "/depth?symbol=DOGE");
      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("GET /fills", () => {
    it("should return 400 if userId is missing", async () => {
      const { status, data } = await request("GET", "/fills");
      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should return fills for a user", async () => {
      const result = signup("user", "password123");
      if (!result.success) throw new Error("Failed");
      const { status, data } = await request("GET", `/fills?userId=${result.user.id}`);
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fills).toEqual([]);
    });
  });

  describe("GET /orders", () => {
    it("should return 400 if userId is missing", async () => {
      const { status, data } = await request("GET", "/orders");
      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should return orders for a user", async () => {
      const result = signup("user", "password123");
      if (!result.success) throw new Error("Failed");
      const { status, data } = await request("GET", `/orders?userId=${result.user.id}`);
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.orders).toEqual([]);
    });
  });

  describe("GET /order/:orderId", () => {
    it("should return 400 if userId is missing", async () => {
      const { status, data } = await request("GET", "/order/some-id");
      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should return 404 for non-existent order", async () => {
      const result = signup("user", "password123");
      if (!result.success) throw new Error("Failed");
      const { status, data } = await request(
        "GET",
        `/order/fake-id?userId=${result.user.id}`
      );
      expect(status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe("DELETE /order/:orderId", () => {
    it("should return 400 if userId is missing", async () => {
      const { status, data } = await request("DELETE", "/order/some-id");
      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should return 400 for non-existent order", async () => {
      const result = signup("user", "password123");
      if (!result.success) throw new Error("Failed");
      const { status, data } = await request(
        "DELETE",
        `/order/fake-id?userId=${result.user.id}`
      );
      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
