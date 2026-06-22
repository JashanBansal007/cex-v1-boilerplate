import type { Balances, OrderBooks, Fill, Order, User } from "./types";

export const USERS: User[] = [];

export const BALANCES: Balances = {};

export const ORDERBOOKS: OrderBooks = {
  SOL: { bids: [], asks: [] },
  BTC: { bids: [], asks: [] },
};

export const FILLS: Fill[] = [];

export const ORDERS: Order[] = [];

export function resetStore(): void {
  USERS.length = 0;
  Object.keys(BALANCES).forEach((key) => delete BALANCES[key]);
  ORDERBOOKS.SOL = { bids: [], asks: [] };
  ORDERBOOKS.BTC = { bids: [], asks: [] };
  FILLS.length = 0;
  ORDERS.length = 0;
}
