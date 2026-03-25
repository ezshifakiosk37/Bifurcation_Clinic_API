import { isNotNull } from "drizzle-orm";
import { date, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
// by u name field
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password: text("password").notNull(),
    location: text("location").notNull().default("Pilot"),
    createdAt: date("created_at").defaultNow().notNull(),
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
  createdAt: date("created_at").defaultNow().notNull(),
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
  medicalHistory:text("medicalHistory").default("null"),
  medicineHistory:text("medicineHistory").default("null"),
  allergies:text("allergies").default("null")
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
    createdAt: date("created_at").defaultNow().notNull(),
    patient_id: uuid("patient_id").notNull().references(() => all_entries.id)
  });