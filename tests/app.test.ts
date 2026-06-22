import { describe, it, expect, beforeEach, afterAll, beforeAll } from "bun:test";
import app from "../src/app";
import { resetStore, BALANCES } from "../src/store";
import { signup } from "../src/services/auth";
import { signToken } from "../src/middleware/auth";
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

async function request(method: string, path: string, body?: object, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const options: RequestInit = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${path}`, options);
  const data = await res.json();
  return { status: res.status, data };
}

async function createUserAndGetToken(
  username: string,
  password: string
): Promise<{ userId: string; token: string }> {
  const result = await signup(username, password);
  if (!result.success) throw new Error("Failed to create user");
  const token = signToken(result.user.id);
  return { userId: result.user.id, token };
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

    it("should sign in and return 200 with a JWT token", async () => {
      const { status, data } = await request("POST", "/signin", {
        username: "testuser",
        password: "password123",
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe("string");
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

  describe("POST /order (authenticated)", () => {
    let userId: string;
    let token: string;

    beforeEach(async () => {
      const auth = await createUserAndGetToken("trader", "password123");
      userId = auth.userId;
      token = auth.token;
      BALANCES[userId].USD.available = 100000;
      BALANCES[userId].SOL.available = 100;
    });

    it("should return 401 without token", async () => {
      const { status } = await request("POST", "/order", {
        symbol: "SOL",
        side: "buy",
        price: 100,
        quantity: 5,
      });
      expect(status).toBe(401);
    });

    it("should place an order and return 201 with valid token", async () => {
      const { status, data } = await request("POST", "/order", {
        symbol: "SOL",
        side: "buy",
        price: 100,
        quantity: 5,
      }, token);
      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.order.symbol).toBe("SOL");
    });

    it("should return 400 for invalid order", async () => {
      const { status, data } = await request("POST", "/order", {
        symbol: "INVALID",
        side: "buy",
        price: 100,
        quantity: 5,
      }, token);
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

  describe("GET /fills (authenticated)", () => {
    it("should return 401 without token", async () => {
      const { status } = await request("GET", "/fills");
      expect(status).toBe(401);
    });

    it("should return fills for an authenticated user", async () => {
      const auth = await createUserAndGetToken("user", "password123");
      const { status, data } = await request("GET", "/fills", undefined, auth.token);
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fills).toEqual([]);
    });
  });

  describe("GET /orders (authenticated)", () => {
    it("should return 401 without token", async () => {
      const { status } = await request("GET", "/orders");
      expect(status).toBe(401);
    });

    it("should return orders for an authenticated user", async () => {
      const auth = await createUserAndGetToken("user", "password123");
      const { status, data } = await request("GET", "/orders", undefined, auth.token);
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.orders).toEqual([]);
    });
  });

  describe("GET /order/:orderId (authenticated)", () => {
    it("should return 401 without token", async () => {
      const { status } = await request("GET", "/order/some-id");
      expect(status).toBe(401);
    });

    it("should return 404 for non-existent order", async () => {
      const auth = await createUserAndGetToken("user", "password123");
      const { status, data } = await request(
        "GET",
        "/order/fake-id",
        undefined,
        auth.token
      );
      expect(status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe("DELETE /order/:orderId (authenticated)", () => {
    it("should return 401 without token", async () => {
      const { status } = await request("DELETE", "/order/some-id");
      expect(status).toBe(401);
    });

    it("should return 400 for non-existent order", async () => {
      const auth = await createUserAndGetToken("user", "password123");
      const { status, data } = await request(
        "DELETE",
        "/order/fake-id",
        undefined,
        auth.token
      );
      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
