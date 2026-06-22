export interface Balance {
  available: number;
  locked: number;
}

export interface UserBalances {
  [asset: string]: Balance;
}

export interface Balances {
  [userId: string]: UserBalances;
}

export interface OrderEntry {
  price: number;
  quantity: number;
  userId: string;
  orderId: string;
}

export interface OrderBook {
  bids: OrderEntry[];
  asks: OrderEntry[];
}

export interface OrderBooks {
  [symbol: string]: OrderBook;
}

export interface Fill {
  id: string;
  orderId: string;
  symbol: string;
  price: number;
  quantity: number;
  side: "buy" | "sell";
  userId: string;
  timestamp: number;
}

export interface Order {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: "buy" | "sell";
  userId: string;
  filled: number;
  status: "open" | "partially_filled" | "filled" | "cancelled";
}

export interface User {
  id: string;
  username: string;
  password: string;
}
