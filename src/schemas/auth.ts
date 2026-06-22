import { z } from "zod";

export const signupSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username must be at most 50 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const signinSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
