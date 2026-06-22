import { describe, it, expect, beforeEach } from "bun:test";
import {
  placeOrder,
  cancelOrder,
  getDepth,
  getFills,
  getOrders,
  getOrderById,
} from "../../src/services/order";
import { resetStore, BALANCES, ORDERBOOKS, ORDERS } from "../../src/store";
import { signup } from "../../src/services/auth";

function createUserWithBalance(username: string, usdBalance: number, solBalance = 0, btcBalance = 0): string {
  const result = signup(username, "password123");
  if (!result.success) throw new Error("Failed to create user");
  const userId = result.user.id;
  BALANCES[userId].USD.available = usdBalance;
  BALANCES[userId].SOL.available = solBalance;
  BALANCES[userId].BTC.available = btcBalance;
  return userId;
}

describe("Order Service", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("placeOrder", () => {
    it("should place a buy order successfully", () => {
      const userId = createUserWithBalance("buyer", 10000);
      const result = placeOrder(userId, "SOL", "buy", 100, 5);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.order.symbol).toBe("SOL");
        expect(result.order.side).toBe("buy");
        expect(result.order.price).toBe(100);
        expect(result.order.quantity).toBe(5);
        expect(result.order.status).toBe("open");
      }
    });

    it("should place a sell order successfully", () => {
      const userId = createUserWithBalance("seller", 0, 10);
      const result = placeOrder(userId, "SOL", "sell", 100, 5);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.order.side).toBe("sell");
        expect(result.order.status).toBe("open");
      }
    });

    it("should lock USD when placing a buy order", () => {
      const userId = createUserWithBalance("buyer", 10000);
      placeOrder(userId, "SOL", "buy", 100, 5);
      expect(BALANCES[userId].USD.available).toBe(9500);
      expect(BALANCES[userId].USD.locked).toBe(500);
    });

    it("should lock assets when placing a sell order", () => {
      const userId = createUserWithBalance("seller", 0, 10);
      placeOrder(userId, "SOL", "sell", 100, 5);
      expect(BALANCES[userId].SOL.available).toBe(5);
      expect(BALANCES[userId].SOL.locked).toBe(5);
    });

    it("should fail with insufficient USD balance for buy", () => {
      const userId = createUserWithBalance("buyer", 100);
      const result = placeOrder(userId, "SOL", "buy", 100, 5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Insufficient USD balance");
      }
    });

    it("should fail with insufficient asset balance for sell", () => {
      const userId = createUserWithBalance("seller", 0, 2);
      const result = placeOrder(userId, "SOL", "sell", 100, 5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Insufficient SOL balance");
      }
    });

    it("should fail with unsupported symbol", () => {
      const userId = createUserWithBalance("user", 10000);
      const result = placeOrder(userId, "DOGE", "buy", 1, 100);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unsupported symbol: DOGE");
      }
    });

    it("should fail with negative price", () => {
      const userId = createUserWithBalance("user", 10000);
      const result = placeOrder(userId, "SOL", "buy", -100, 5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Price and quantity must be positive");
      }
    });

    it("should fail with zero quantity", () => {
      const userId = createUserWithBalance("user", 10000);
      const result = placeOrder(userId, "SOL", "buy", 100, 0);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("All fields are required");
      }
    });

    it("should fail with missing fields", () => {
      const result = placeOrder("", "SOL", "buy", 100, 5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("All fields are required");
      }
    });

    it("should fail for non-existent user", () => {
      const result = placeOrder("fake-user-id", "SOL", "buy", 100, 5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not found");
      }
    });

    it("should add buy order to orderbook bids sorted by price (highest first)", () => {
      const userId = createUserWithBalance("buyer", 100000);
      placeOrder(userId, "SOL", "buy", 100, 5);
      placeOrder(userId, "SOL", "buy", 110, 3);
      placeOrder(userId, "SOL", "buy", 95, 2);

      expect(ORDERBOOKS.SOL.bids.length).toBe(3);
      expect(ORDERBOOKS.SOL.bids[0].price).toBe(110);
      expect(ORDERBOOKS.SOL.bids[1].price).toBe(100);
      expect(ORDERBOOKS.SOL.bids[2].price).toBe(95);
    });

    it("should add sell order to orderbook asks sorted by price (lowest first)", () => {
      const userId = createUserWithBalance("seller", 0, 100);
      placeOrder(userId, "SOL", "sell", 100, 5);
      placeOrder(userId, "SOL", "sell", 95, 3);
      placeOrder(userId, "SOL", "sell", 110, 2);

      expect(ORDERBOOKS.SOL.asks.length).toBe(3);
      expect(ORDERBOOKS.SOL.asks[0].price).toBe(95);
      expect(ORDERBOOKS.SOL.asks[1].price).toBe(100);
      expect(ORDERBOOKS.SOL.asks[2].price).toBe(110);
    });
  });

  describe("order matching", () => {
    it("should match a buy order against existing sell orders", () => {
      const sellerId = createUserWithBalance("seller", 0, 10);
      const buyerId = createUserWithBalance("buyer", 10000);

      placeOrder(sellerId, "SOL", "sell", 100, 5);
      const result = placeOrder(buyerId, "SOL", "buy", 100, 3);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.order.status).toBe("filled");
        expect(result.order.filled).toBe(3);
        expect(result.fills.length).toBe(1);
        expect(result.fills[0].price).toBe(100);
        expect(result.fills[0].quantity).toBe(3);
      }
    });

    it("should match a sell order against existing buy orders", () => {
      const buyerId = createUserWithBalance("buyer", 10000);
      const sellerId = createUserWithBalance("seller", 0, 10);

      placeOrder(buyerId, "SOL", "buy", 100, 5);
      const result = placeOrder(sellerId, "SOL", "sell", 95, 3);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.order.status).toBe("filled");
        expect(result.order.filled).toBe(3);
        expect(result.fills.length).toBe(1);
        expect(result.fills[0].price).toBe(100); // matches at maker's price
      }
    });

    it("should partially fill an order", () => {
      const sellerId = createUserWithBalance("seller", 0, 3);
      const buyerId = createUserWithBalance("buyer", 10000);

      placeOrder(sellerId, "SOL", "sell", 100, 3);
      const result = placeOrder(buyerId, "SOL", "buy", 100, 5);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.order.status).toBe("partially_filled");
        expect(result.order.filled).toBe(3);
        // Remaining 2 should be in the orderbook
        expect(ORDERBOOKS.SOL.bids.length).toBe(1);
        expect(ORDERBOOKS.SOL.bids[0].quantity).toBe(2);
      }
    });

    it("should not match if prices don't cross", () => {
      const sellerId = createUserWithBalance("seller", 0, 10);
      const buyerId = createUserWithBalance("buyer", 10000);

      placeOrder(sellerId, "SOL", "sell", 110, 5);
      const result = placeOrder(buyerId, "SOL", "buy", 100, 3);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.order.status).toBe("open");
        expect(result.order.filled).toBe(0);
        expect(result.fills.length).toBe(0);
      }
    });

    it("should settle balances correctly after a fill", () => {
      const sellerId = createUserWithBalance("seller", 0, 10);
      const buyerId = createUserWithBalance("buyer", 10000);

      placeOrder(sellerId, "SOL", "sell", 100, 5);
      placeOrder(buyerId, "SOL", "buy", 100, 5);

      // Buyer should have received SOL and spent USD
      expect(BALANCES[buyerId].SOL.available).toBe(5);
      expect(BALANCES[buyerId].USD.available).toBe(9500);
      expect(BALANCES[buyerId].USD.locked).toBe(0);

      // Seller should have received USD
      expect(BALANCES[sellerId].USD.available).toBe(500);
      expect(BALANCES[sellerId].SOL.available).toBe(5);
      expect(BALANCES[sellerId].SOL.locked).toBe(0);
    });

    it("should match against multiple orders at different prices", () => {
      const seller1 = createUserWithBalance("seller1", 0, 10);
      const seller2 = createUserWithBalance("seller2", 0, 10);
      const buyerId = createUserWithBalance("buyer", 100000);

      placeOrder(seller1, "SOL", "sell", 100, 3);
      placeOrder(seller2, "SOL", "sell", 105, 4);

      const result = placeOrder(buyerId, "SOL", "buy", 105, 5);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.fills.length).toBe(2);
        expect(result.fills[0].price).toBe(100);
        expect(result.fills[0].quantity).toBe(3);
        expect(result.fills[1].price).toBe(105);
        expect(result.fills[1].quantity).toBe(2);
        expect(result.order.status).toBe("filled");
      }
    });
  });

  describe("cancelOrder", () => {
    it("should cancel an open order", () => {
      const userId = createUserWithBalance("user", 10000);
      const orderResult = placeOrder(userId, "SOL", "buy", 100, 5);
      if (!orderResult.success) throw new Error("Failed to place order");

      const result = cancelOrder(orderResult.order.id, userId);
      expect(result.success).toBe(true);
    });

    it("should unlock USD when cancelling a buy order", () => {
      const userId = createUserWithBalance("user", 10000);
      const orderResult = placeOrder(userId, "SOL", "buy", 100, 5);
      if (!orderResult.success) throw new Error("Failed to place order");

      expect(BALANCES[userId].USD.available).toBe(9500);
      cancelOrder(orderResult.order.id, userId);
      expect(BALANCES[userId].USD.available).toBe(10000);
      expect(BALANCES[userId].USD.locked).toBe(0);
    });

    it("should unlock assets when cancelling a sell order", () => {
      const userId = createUserWithBalance("user", 0, 10);
      const orderResult = placeOrder(userId, "SOL", "sell", 100, 5);
      if (!orderResult.success) throw new Error("Failed to place order");

      expect(BALANCES[userId].SOL.available).toBe(5);
      cancelOrder(orderResult.order.id, userId);
      expect(BALANCES[userId].SOL.available).toBe(10);
      expect(BALANCES[userId].SOL.locked).toBe(0);
    });

    it("should remove order from orderbook", () => {
      const userId = createUserWithBalance("user", 10000);
      const orderResult = placeOrder(userId, "SOL", "buy", 100, 5);
      if (!orderResult.success) throw new Error("Failed to place order");

      expect(ORDERBOOKS.SOL.bids.length).toBe(1);
      cancelOrder(orderResult.order.id, userId);
      expect(ORDERBOOKS.SOL.bids.length).toBe(0);
    });

    it("should fail if order not found", () => {
      const userId = createUserWithBalance("user", 10000);
      const result = cancelOrder("non-existent-id", userId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Order not found");
      }
    });

    it("should fail if order belongs to another user", () => {
      const userId1 = createUserWithBalance("user1", 10000);
      const userId2 = createUserWithBalance("user2", 10000);
      const orderResult = placeOrder(userId1, "SOL", "buy", 100, 5);
      if (!orderResult.success) throw new Error("Failed to place order");

      const result = cancelOrder(orderResult.order.id, userId2);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Order not found");
      }
    });

    it("should fail to cancel an already filled order", () => {
      const sellerId = createUserWithBalance("seller", 0, 10);
      const buyerId = createUserWithBalance("buyer", 10000);

      const sellResult = placeOrder(sellerId, "SOL", "sell", 100, 5);
      placeOrder(buyerId, "SOL", "buy", 100, 5);

      if (!sellResult.success) throw new Error("Failed to place sell order");
      const result = cancelOrder(sellResult.order.id, sellerId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Order cannot be cancelled");
      }
    });

    it("should fail to cancel an already cancelled order", () => {
      const userId = createUserWithBalance("user", 10000);
      const orderResult = placeOrder(userId, "SOL", "buy", 100, 5);
      if (!orderResult.success) throw new Error("Failed to place order");

      cancelOrder(orderResult.order.id, userId);
      const result = cancelOrder(orderResult.order.id, userId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Order cannot be cancelled");
      }
    });
  });

  describe("getDepth", () => {
    it("should return empty depth for symbol with no orders", () => {
      const result = getDepth("SOL");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.bids).toEqual([]);
        expect(result.asks).toEqual([]);
      }
    });

    it("should return aggregated depth", () => {
      const user1 = createUserWithBalance("user1", 100000);
      const user2 = createUserWithBalance("user2", 100000);

      placeOrder(user1, "SOL", "buy", 100, 5);
      placeOrder(user2, "SOL", "buy", 100, 3);
      placeOrder(user1, "SOL", "buy", 95, 2);

      const result = getDepth("SOL");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.bids.length).toBe(2);
        expect(result.bids[0]).toEqual([100, 8]); // aggregated at price 100
        expect(result.bids[1]).toEqual([95, 2]);
      }
    });

    it("should fail for unsupported symbol", () => {
      const result = getDepth("DOGE");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unsupported symbol: DOGE");
      }
    });
  });

  describe("getFills", () => {
    it("should return empty fills for user with no trades", () => {
      const userId = createUserWithBalance("user", 10000);
      const fills = getFills(userId);
      expect(fills).toEqual([]);
    });

    it("should return fills for a user after a trade", () => {
      const sellerId = createUserWithBalance("seller", 0, 10);
      const buyerId = createUserWithBalance("buyer", 10000);

      placeOrder(sellerId, "SOL", "sell", 100, 5);
      placeOrder(buyerId, "SOL", "buy", 100, 3);

      const buyerFills = getFills(buyerId);
      expect(buyerFills.length).toBe(1);
      expect(buyerFills[0].price).toBe(100);
      expect(buyerFills[0].quantity).toBe(3);
      expect(buyerFills[0].side).toBe("buy");
    });
  });

  describe("getOrders", () => {
    it("should return empty orders for user with no orders", () => {
      const userId = createUserWithBalance("user", 10000);
      const orders = getOrders(userId);
      expect(orders).toEqual([]);
    });

    it("should return all orders for a user", () => {
      const userId = createUserWithBalance("user", 100000);
      placeOrder(userId, "SOL", "buy", 100, 5);
      placeOrder(userId, "BTC", "buy", 50000, 1);

      const orders = getOrders(userId);
      expect(orders.length).toBe(2);
    });

    it("should not return orders from other users", () => {
      const user1 = createUserWithBalance("user1", 100000);
      const user2 = createUserWithBalance("user2", 100000);
      placeOrder(user1, "SOL", "buy", 100, 5);
      placeOrder(user2, "SOL", "buy", 95, 3);

      const user1Orders = getOrders(user1);
      expect(user1Orders.length).toBe(1);
      expect(user1Orders[0].price).toBe(100);
    });
  });

  describe("getOrderById", () => {
    it("should return an order by id", () => {
      const userId = createUserWithBalance("user", 10000);
      const orderResult = placeOrder(userId, "SOL", "buy", 100, 5);
      if (!orderResult.success) throw new Error("Failed to place order");

      const order = getOrderById(orderResult.order.id, userId);
      expect(order).not.toBeNull();
      expect(order?.id).toBe(orderResult.order.id);
      expect(order?.symbol).toBe("SOL");
    });

    it("should return null for non-existent order", () => {
      const userId = createUserWithBalance("user", 10000);
      const order = getOrderById("non-existent-id", userId);
      expect(order).toBeNull();
    });

    it("should return null if order belongs to another user", () => {
      const user1 = createUserWithBalance("user1", 10000);
      const user2 = createUserWithBalance("user2", 10000);
      const orderResult = placeOrder(user1, "SOL", "buy", 100, 5);
      if (!orderResult.success) throw new Error("Failed to place order");

      const order = getOrderById(orderResult.order.id, user2);
      expect(order).toBeNull();
    });
  });
});
