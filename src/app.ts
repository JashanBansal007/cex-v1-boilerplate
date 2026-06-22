import express from "express";
import { signup, signin } from "./services/auth";
import { placeOrder, cancelOrder, getDepth, getFills, getOrders, getOrderById } from "./services/order";
import { handleServiceResult } from "./utils/response";
import { requireUserId } from "./middleware/requireUserId";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
app.use(express.json());

app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  const result = signup(username, password);
  handleServiceResult(res, result, 201);
});

app.post("/signin", (req, res) => {
  const { username, password } = req.body;
  const result = signin(username, password);
  handleServiceResult(res, result, 200, 401);
});

app.post("/order", (req, res) => {
  const { userId, symbol, side, price, quantity } = req.body;
  const result = placeOrder(userId, symbol, side, price, quantity);
  handleServiceResult(res, result, 201);
});

app.get("/depth", (req, res) => {
  const symbol = req.query.symbol as string;
  const result = getDepth(symbol);
  handleServiceResult(res, result);
});

app.get("/fills", requireUserId, (req, res) => {
  const userId = req.query.userId as string;
  const fills = getFills(userId);
  res.status(200).json({ success: true, fills });
});

app.get("/orders", requireUserId, (req, res) => {
  const userId = req.query.userId as string;
  const orders = getOrders(userId);
  res.status(200).json({ success: true, orders });
});

app.get("/order/:orderId", requireUserId, (req, res) => {
  const orderId = req.params.orderId as string;
  const userId = req.query.userId as string;
  const order = getOrderById(orderId, userId);
  if (order) {
    res.status(200).json({ success: true, order });
  } else {
    res.status(404).json({ success: false, error: "Order not found" });
  }
});

app.delete("/order/:orderId", requireUserId, (req, res) => {
  const orderId = req.params.orderId as string;
  const userId = req.query.userId as string;
  const result = cancelOrder(orderId, userId);
  handleServiceResult(res, result);
});

app.use(errorHandler);

export default app;
