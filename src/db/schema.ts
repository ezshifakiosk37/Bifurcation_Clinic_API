import { pgTable, text, timestamp, uuid, varchar, integer, date, time } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password: text("password").notNull(),
    location: text("location").notNull().default("Pilot"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    name: text("name").notNull().default("null"),
});

export const all_entries = pgTable("all_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  phoneNumber: text("phoneNumber").notNull(),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  father_husband: text("father_husband").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  createdDate: date("created_date"),
  createdTime: time("created_time"),
  user_id: uuid("user_id").notNull().references(() => users.id),
  email: text("email").default("null"),
  cnic: text("cnic").default("null"),
  dob: text("dob").notNull().default("null"),
  country: text("country").notNull().default("null"),
  province: text("province").notNull().default("null"),
  city: text("city").notNull().default("null"),
  stAddress: text("stAddress").notNull().default("null"),
  languages: text("languages").default("null"),
  surgicalHistory: text("surgicalHistory").default("null"),
  medicalHistory: text("medicalHistory").default("null"),
  medicineHistory: text("medicineHistory").default("null"),
  allergies: text("allergies").default("null"),
  token: varchar("token", { length: 10 }),
});

export const vitals = pgTable("vitals", {
  id: uuid("id").primaryKey().defaultRandom(),
  PulseRate: text("PulseRate"),
  BloodOxygen: text("BloodOxygen"),
  Diastolic: text("Diastolic"),
  Systolic: text("Systolic"),
  Temperature: text("Temperature"),
  Weight: text("Weight"),
  Height: text("Height"),
  token: varchar("token", { length: 10 }),
  createdDate: date("created_date"),
  createdTime: time("created_time"),
  patient_id: uuid("patient_id").notNull().references(() => all_entries.id),
});