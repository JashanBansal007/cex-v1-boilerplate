import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { signup, signin } from "./services/auth";
import { placeOrder, cancelOrder, getDepth, getFills, getOrders, getOrderById } from "./services/order";
import { authenticateToken, signToken } from "./middleware/auth";
import { validateBody } from "./middleware/validate";
import { signupSchema, signinSchema } from "./schemas/auth";
import { createOrderSchema } from "./schemas/order";
import type { AuthenticatedRequest } from "./middleware/auth";

const app = express();

app.use(express.json({ limit: "10kb" }));

app.use(helmet());

const allowedOrigins = process.env["ALLOWED_ORIGINS"]?.split(",") ?? [];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin && process.env["NODE_ENV"] !== "production") {
        return callback(null, true);
      }
      if (origin && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// --- Auth Routes (public) ---

app.post("/signup", authLimiter, validateBody(signupSchema), async (req, res) => {
  try {
    const { username, password } = req.body as { username: string; password: string };
    const result = await signup(username, password);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post("/signin", authLimiter, validateBody(signinSchema), async (req, res) => {
  try {
    const { username, password } = req.body as { username: string; password: string };
    const result = await signin(username, password);
    if (result.success) {
      const token = signToken(result.user.id);
      res.status(200).json({ ...result, token });
    } else {
      res.status(401).json(result);
    }
  } catch {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// --- Protected Routes (require JWT) ---

app.post("/order", authenticateToken, validateBody(createOrderSchema), (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { symbol, side, price, quantity } = req.body as {
    symbol: string;
    side: "buy" | "sell";
    price: number;
    quantity: number;
  };
  const result = placeOrder(userId!, symbol, side, price, quantity);
  if (result.success) {
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

app.get("/depth", (req, res) => {
  const symbol = req.query["symbol"] as string;
  const result = getDepth(symbol);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
});

app.get("/fills", authenticateToken, (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const fills = getFills(userId!);
  res.status(200).json({ success: true, fills });
});

app.get("/orders", authenticateToken, (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const orders = getOrders(userId!);
  res.status(200).json({ success: true, orders });
});

app.get("/order/:orderId", authenticateToken, (req, res) => {
  const orderId = String(req.params["orderId"] ?? "");
  const { userId } = req as AuthenticatedRequest;
  const order = getOrderById(orderId, userId!);
  if (order) {
    res.status(200).json({ success: true, order });
  } else {
    res.status(404).json({ success: false, error: "Order not found" });
  }
});

app.delete("/order/:orderId", authenticateToken, (req, res) => {
  const orderId = String(req.params["orderId"] ?? "");
  const { userId } = req as AuthenticatedRequest;
  const result = cancelOrder(orderId, userId!);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
});

// --- Error Handling ---

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (process.env["NODE_ENV"] !== "production") {
      console.error(err);
    }
    res.status(500).json({ success: false, error: "Internal server error" });
  }
);

export default app;
