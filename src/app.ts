import express from "express";
import type { Request, Response, NextFunction } from "express";
import { signup, signin } from "./services/auth";
import { placeOrder, cancelOrder, getDepth, getFills, getOrders, getOrderById } from "./services/order";

const app = express();
app.use(express.json());

app.post("/signup", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const result = signup(username, password);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    next(err);
  }
});

app.post("/signin", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const result = signin(username, password);
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (err) {
    next(err);
  }
});

app.post("/order", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, symbol, side, price, quantity } = req.body;
    const result = placeOrder(userId, symbol, side, price, quantity);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    next(err);
  }
});

app.get("/depth", (req: Request, res: Response, next: NextFunction) => {
  try {
    const symbol = req.query.symbol;
    if (!symbol || typeof symbol !== "string") {
      res.status(400).json({ success: false, error: "symbol query parameter is required" });
      return;
    }
    const result = getDepth(symbol);
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    next(err);
  }
});

app.get("/fills", (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId;
    if (!userId || typeof userId !== "string") {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }
    const fills = getFills(userId);
    res.status(200).json({ success: true, fills });
  } catch (err) {
    next(err);
  }
});

app.get("/orders", (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId;
    if (!userId || typeof userId !== "string") {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }
    const orders = getOrders(userId);
    res.status(200).json({ success: true, orders });
  } catch (err) {
    next(err);
  }
});

app.get("/order/:orderId", (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.query.userId;
    if (!orderId || typeof orderId !== "string" || !userId || typeof userId !== "string") {
      res.status(400).json({ success: false, error: "orderId and userId are required" });
      return;
    }
    const order = getOrderById(orderId, userId);
    if (order) {
      res.status(200).json({ success: true, order });
    } else {
      res.status(404).json({ success: false, error: "Order not found" });
    }
  } catch (err) {
    next(err);
  }
});

app.delete("/order/:orderId", (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.query.userId;
    if (!orderId || typeof orderId !== "string" || !userId || typeof userId !== "string") {
      res.status(400).json({ success: false, error: "orderId and userId are required" });
      return;
    }
    const result = cancelOrder(orderId, userId);
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ success: false, error: "Internal server error" });
});

export default app;
