import { ORDERBOOKS, ORDERS, FILLS, BALANCES } from "../store";
import type { Order, Fill, OrderEntry } from "../types";
import { randomUUID } from "crypto";

const SUPPORTED_SYMBOLS = ["SOL", "BTC"];

export function placeOrder(
  userId: string,
  symbol: string,
  side: "buy" | "sell",
  price: number,
  quantity: number
): { success: true; order: Order; fills: Fill[] } | { success: false; error: string } {
  if (!userId || !symbol || !side || !price || !quantity) {
    return { success: false, error: "All fields are required" };
  }

  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    return { success: false, error: `Unsupported symbol: ${symbol}` };
  }

  if (price <= 0 || quantity <= 0) {
    return { success: false, error: "Price and quantity must be positive" };
  }

  if (side !== "buy" && side !== "sell") {
    return { success: false, error: "Side must be 'buy' or 'sell'" };
  }

  const userBalance = BALANCES[userId];
  if (!userBalance) {
    return { success: false, error: "User not found" };
  }

  // Check balance
  if (side === "buy") {
    const requiredAmount = price * quantity;
    if (userBalance.USD.available < requiredAmount) {
      return { success: false, error: "Insufficient USD balance" };
    }
    // Lock funds
    userBalance.USD.available -= requiredAmount;
    userBalance.USD.locked += requiredAmount;
  } else {
    if (userBalance[symbol]?.available === undefined || userBalance[symbol].available < quantity) {
      return { success: false, error: `Insufficient ${symbol} balance` };
    }
    // Lock assets
    userBalance[symbol].available -= quantity;
    userBalance[symbol].locked += quantity;
  }

  const order: Order = {
    id: randomUUID(),
    symbol,
    price,
    quantity,
    side,
    userId,
    filled: 0,
    status: "open",
  };

  const fills = matchOrder(order);

  if (order.filled < order.quantity) {
    // Add remaining to order book
    const entry: OrderEntry = {
      price: order.price,
      quantity: order.quantity - order.filled,
      userId: order.userId,
      orderId: order.id,
    };

    const book = ORDERBOOKS[symbol];
    if (side === "buy") {
      book.bids.push(entry);
      book.bids.sort((a, b) => b.price - a.price); // highest first
    } else {
      book.asks.push(entry);
      book.asks.sort((a, b) => a.price - b.price); // lowest first
    }
  }

  ORDERS.push(order);

  return { success: true, order, fills };
}

function matchOrder(order: Order): Fill[] {
  const fills: Fill[] = [];
  const book = ORDERBOOKS[order.symbol];
  const opposingSide = order.side === "buy" ? book.asks : book.bids;

  let remainingQuantity = order.quantity - order.filled;

  while (remainingQuantity > 0 && opposingSide.length > 0) {
    const bestOrder = opposingSide[0];

    const priceMatch =
      order.side === "buy"
        ? order.price >= bestOrder.price
        : order.price <= bestOrder.price;

    if (!priceMatch) break;

    const fillQuantity = Math.min(remainingQuantity, bestOrder.quantity);
    const fillPrice = bestOrder.price;

    const fill: Fill = {
      id: randomUUID(),
      orderId: order.id,
      symbol: order.symbol,
      price: fillPrice,
      quantity: fillQuantity,
      side: order.side,
      userId: order.userId,
      timestamp: Date.now(),
    };

    fills.push(fill);
    FILLS.push(fill);

    order.filled += fillQuantity;
    remainingQuantity -= fillQuantity;
    bestOrder.quantity -= fillQuantity;

    // Update balances for the matched maker order
    settleFill(order, bestOrder, fillPrice, fillQuantity);

    // Update the maker's order status in ORDERS
    const makerOrder = ORDERS.find((o) => o.id === bestOrder.orderId);
    if (makerOrder) {
      makerOrder.filled += fillQuantity;
      if (makerOrder.filled >= makerOrder.quantity) {
        makerOrder.status = "filled";
      } else {
        makerOrder.status = "partially_filled";
      }
    }

    if (bestOrder.quantity === 0) {
      opposingSide.shift();
    }
  }

  if (order.filled === order.quantity) {
    order.status = "filled";
  } else if (order.filled > 0) {
    order.status = "partially_filled";
  }

  return fills;
}

function settleFill(
  takerOrder: Order,
  makerEntry: OrderEntry,
  price: number,
  quantity: number
): void {
  const takerBalance = BALANCES[takerOrder.userId];
  const makerBalance = BALANCES[makerEntry.userId];
  if (!takerBalance || !makerBalance) return;

  const cost = price * quantity;

  if (takerOrder.side === "buy") {
    // Taker buys: taker gets asset, maker gets USD
    takerBalance.USD.locked -= cost;
    takerBalance[takerOrder.symbol] = takerBalance[takerOrder.symbol] || { available: 0, locked: 0 };
    takerBalance[takerOrder.symbol].available += quantity;

    makerBalance[takerOrder.symbol].locked -= quantity;
    makerBalance.USD.available += cost;
  } else {
    // Taker sells: taker gets USD, maker gets asset
    takerBalance[takerOrder.symbol].locked -= quantity;
    takerBalance.USD.available += cost;

    makerBalance.USD.locked -= cost;
    makerBalance[takerOrder.symbol] = makerBalance[takerOrder.symbol] || { available: 0, locked: 0 };
    makerBalance[takerOrder.symbol].available += quantity;
  }
}

export function cancelOrder(
  orderId: string,
  userId: string
): { success: true } | { success: false; error: string } {
  const order = ORDERS.find((o) => o.id === orderId && o.userId === userId);
  if (!order) {
    return { success: false, error: "Order not found" };
  }

  if (order.status === "filled" || order.status === "cancelled") {
    return { success: false, error: "Order cannot be cancelled" };
  }

  // Remove from orderbook
  const book = ORDERBOOKS[order.symbol];
  const side = order.side === "buy" ? book.bids : book.asks;
  const idx = side.findIndex((e) => e.orderId === orderId);
  if (idx !== -1) {
    side.splice(idx, 1);
  }

  // Unlock funds
  const remaining = order.quantity - order.filled;
  const userBalance = BALANCES[userId];
  if (userBalance) {
    if (order.side === "buy") {
      const lockedAmount = order.price * remaining;
      userBalance.USD.locked -= lockedAmount;
      userBalance.USD.available += lockedAmount;
    } else {
      userBalance[order.symbol].locked -= remaining;
      userBalance[order.symbol].available += remaining;
    }
  }

  order.status = "cancelled";
  return { success: true };
}

export function getDepth(symbol: string): { success: true; bids: [number, number][]; asks: [number, number][] } | { success: false; error: string } {
  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    return { success: false, error: `Unsupported symbol: ${symbol}` };
  }

  const book = ORDERBOOKS[symbol];

  // Aggregate by price level
  const bidMap = new Map<number, number>();
  for (const bid of book.bids) {
    bidMap.set(bid.price, (bidMap.get(bid.price) || 0) + bid.quantity);
  }

  const askMap = new Map<number, number>();
  for (const ask of book.asks) {
    askMap.set(ask.price, (askMap.get(ask.price) || 0) + ask.quantity);
  }

  const bids: [number, number][] = Array.from(bidMap.entries()).sort((a, b) => b[0] - a[0]);
  const asks: [number, number][] = Array.from(askMap.entries()).sort((a, b) => a[0] - b[0]);

  return { success: true, bids, asks };
}

export function getFills(userId: string): Fill[] {
  return FILLS.filter((f) => f.userId === userId);
}

export function getOrders(userId: string): Order[] {
  return ORDERS.filter((o) => o.userId === userId);
}

export function getOrderById(
  orderId: string,
  userId: string
): Order | null {
  return ORDERS.find((o) => o.id === orderId && o.userId === userId) || null;
}
