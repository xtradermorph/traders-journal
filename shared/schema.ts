'use client'

import { pgTable, text, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { z } from "zod";

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(), // This will be the Supabase auth user ID (UUID)
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  avatar_url: text("avatar_url"),
  profession: text("profession"),
  trader_status: text("trader_status"),
  trader_type: text("trader_type"),
  bio: text("bio"),
  years_experience: text("years_experience"),
  trading_frequency: text("trading_frequency"),
  markets: text("markets"),
  trading_goal: text("trading_goal"),
  trading_challenges: text("trading_challenges"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
});

export const loginUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().default(false)
});

export const trades = pgTable("trades", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.id),
  currencyPair: text("currency_pair").notNull(),
  tradeType: text("trade_type").notNull(), // "LONG" or "SHORT"
  entryPrice: doublePrecision("entry_price").notNull(),
  exitPrice: doublePrecision("exit_price").notNull(),
  entryTime: timestamp("entry_time").notNull(),
  exitTime: timestamp("exit_time").notNull(),
  duration: integer("duration").notNull(), // Duration in minutes
  pips: doublePrecision("pips").notNull(), // Calculated based on entry and exit prices
  lotSize: doublePrecision("lot_size").notNull(),
  profitLoss: doublePrecision("profit_loss").notNull(),
  currency: text("currency").notNull().default("AUD"), // Currency for profit/loss
  date: timestamp("date").notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  tags: text("tags"), // Optional, max 20 chars, alphanumeric
});

export const insertTradeSchema = z.object({
  currencyPair: z.string().min(1, "Currency pair is required").max(6, "Currency pair must be 6 characters or less"),
  tradeType: z.enum(["LONG", "SHORT"]),
  entryPrice: z.number().positive("Entry price must be positive"),
  exitPrice: z.number().positive("Exit price must be positive"),
  entryTime: z.string(),
  exitTime: z.string(),
  duration: z.number().optional(), // Make this optional to match the database
  pips: z.number().optional(), // Make this optional to match the database
  lotSize: z.number().positive("Lot size must be positive"),
  profitLoss: z.number(),
  currency: z.string().min(1, "Currency is required").max(4, "Currency must be 4 characters or less").regex(/^[A-Z]{3,4}$/, "Currency must be uppercase letters only"),
  date: z.string(),
  notes: z.string().optional(),
  tags: z.string().max(20, "Tags must be 20 characters or less").regex(/^[a-zA-Z0-9 ]*$/, "Tags can only contain letters, numbers, and spaces").optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof profiles.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;