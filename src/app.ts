import express from "express";
import { signup, signin } from "./services/auth";
import { placeOrder, cancelOrder, getDepth, getFills, getOrders, getOrderById } from "./services/order";

const app = express();
app.use(express.json());

app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  const result = signup(username, password);
  if (result.success) {
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

app.post("/signin", (req, res) => {
  const { username, password } = req.body;
  const result = signin(username, password);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(401).json(result);
  }
});

app.post("/order", (req, res) => {
  const { userId, symbol, side, price, quantity } = req.body;
  const result = placeOrder(userId, symbol, side, price, quantity);
  if (result.success) {
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

app.get("/depth", (req, res) => {
  const symbol = req.query.symbol as string;
  const result = getDepth(symbol);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
});

app.get("/fills", (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ success: false, error: "userId is required" });
    return;
  }
  const fills = getFills(userId);
  res.status(200).json({ success: true, fills });
});

app.get("/orders", (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ success: false, error: "userId is required" });
    return;
  }
  const orders = getOrders(userId);
  res.status(200).json({ success: true, orders });
});

app.get("/order/:orderId", (req, res) => {
  const { orderId } = req.params;
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ success: false, error: "userId is required" });
    return;
  }
  const order = getOrderById(orderId, userId);
  if (order) {
    res.status(200).json({ success: true, order });
  } else {
    res.status(404).json({ success: false, error: "Order not found" });
  }
});

app.delete("/order/:orderId", (req, res) => {
  const { orderId } = req.params;
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ success: false, error: "userId is required" });
    return;
  }
  const result = cancelOrder(orderId, userId);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
});

export default app;
