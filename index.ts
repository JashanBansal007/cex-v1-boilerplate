import express from "express";
import type { Request, Response, NextFunction } from "express";

const app = express();

app.use(express.json());

const BALANCES: Record<string, number> = {};

const ORDERBOOKS: Record<string, Record<string, unknown>> = {
  SOL: {},
  BTC: {},
};

app.post("/signup", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "username and password are required" });
      return;
    }
    // TODO: implement signup logic
    res.status(501).json({ error: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

app.post("/signin", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "username and password are required" });
      return;
    }
    // TODO: implement signin logic
    res.status(501).json({ error: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

app.post("/order", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol, side, price, quantity } = req.body;
    if (!symbol || !side || price == null || quantity == null) {
      res
        .status(400)
        .json({ error: "symbol, side, price, and quantity are required" });
      return;
    }
    if (!ORDERBOOKS[symbol]) {
      res.status(400).json({ error: `Unsupported symbol: ${symbol}` });
      return;
    }
    // TODO: implement order placement logic
    res.status(501).json({ error: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

app.get("/depth", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol } = req.query;
    if (!symbol || typeof symbol !== "string") {
      res.status(400).json({ error: "symbol query parameter is required" });
      return;
    }
    if (!ORDERBOOKS[symbol]) {
      res.status(400).json({ error: `Unsupported symbol: ${symbol}` });
      return;
    }
    // TODO: implement depth logic
    res.status(501).json({ error: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

app.get("/fills", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      res.status(400).json({ error: "userId query parameter is required" });
      return;
    }
    // TODO: implement fills logic
    res.status(501).json({ error: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

app.get("/orders", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      res.status(400).json({ error: "userId query parameter is required" });
      return;
    }
    // TODO: implement orders listing logic
    res.status(501).json({ error: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

app.get("/order/:orderId", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      res.status(400).json({ error: "orderId parameter is required" });
      return;
    }
    // TODO: implement get order by ID logic
    res.status(501).json({ error: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

app.delete("/order/:orderId", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      res.status(400).json({ error: "orderId parameter is required" });
      return;
    }
    // TODO: implement order cancellation logic
    res.status(501).json({ error: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// Global error handler — catches errors forwarded via next(err)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env["PORT"] || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
