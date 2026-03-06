import { pgTable, serial, varchar, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const all_entries = pgTable("all_entries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  father_husband: varchar("father_husband", { length: 100 }).notNull(),
  age: integer("age").notNull(),
  gender: varchar("gender", { length: 15 }).notNull(),
  qualification: varchar("qualification", { length: 100 }).notNull(),
  profession: varchar("profession", { length: 100 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  user_id: integer("user_id").notNull().references(() => users.id),
});

export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  entryId: integer("entryId").notNull().references(() => all_entries.id),
  questionnaireType: varchar("questionnaireType", { length: 50 }).notNull(),
  totalScore: integer("totalScore").notNull(),
  detailedResults: jsonb("detailed_results"),
  created_at: timestamp("created_at").defaultNow(),
  user_id: integer("user_id").notNull().references(() => users.id),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const all_research_entries = pgTable("all_research_entries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  father_husband: varchar("father_husband", { length: 100 }).notNull(),
  age: integer("age").notNull(),
  gender: varchar("gender", { length: 15 }).notNull(),
  qualification: varchar("qualification", { length: 100 }).notNull(),
  profession: varchar("profession", { length: 100 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  epds_scores: integer("epds_scores"),
  user_id: integer("user_id").notNull().references(() => users.id),
});

export const research_result = pgTable("research_result", {
  id: serial("id").primaryKey(),
  entryId: integer("entryId").notNull().references(() => all_research_entries.id),
  questionnaireType: varchar("questionnaireType", { length: 50 }).notNull(),
  totalScore: integer("totalScore").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  user_id: integer("user_id").notNull().references(() => users.id),
});
