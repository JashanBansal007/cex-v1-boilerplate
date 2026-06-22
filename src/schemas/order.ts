import { z } from "zod";

export const createOrderSchema = z.object({
  symbol: z.enum(["SOL", "BTC"], {
    error: "Symbol must be SOL or BTC",
  }),
  side: z.enum(["buy", "sell"], {
    error: "Side must be buy or sell",
  }),
  price: z.number().positive("Price must be positive"),
  quantity: z.number().positive("Quantity must be positive"),
});
