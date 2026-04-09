// src/db/schema.ts 
import { pgTable, text, timestamp, uuid, varchar, integer, date, time , boolean,jsonb} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// staff/users 
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
  vitalsRecorded: boolean("vitals_recorded").default(false).notNull(),
  token: varchar("token", { length: 10 }),
  tokenDate: date("token_date"),           // date of latest check-in
  tokenTime: time("token_time"),            // time of last check-in
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
  symptoms: text("symptoms"),
  token: varchar("token", { length: 10 }),
  createdDate: date("created_date"),
  createdTime: time("created_time"),
  patient_id: uuid("patient_id").notNull().references(() => all_entries.id),
});

// ─────────────────────────────────────────────
// 4. DOCTORS
// ─────────────────────────────────────────────
export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 20 }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: varchar("phone", { length: 20 }),
  gender: text("gender"),
  photo: text("photo"),
  specializations: jsonb("specializations").notNull().default([]),
  qualifications: jsonb("qualifications").notNull().default([]),
  experience: integer("experience").default(0),
  city: text("city"),
  
  createdDate: date("created_date").defaultNow().notNull(),
  createdTime: time("created_time").defaultNow(),
  updatedDate: date("updated_date").defaultNow().notNull(),
  updatedTime: time("updated_time").defaultNow(),
});

// ─────────────────────────────────────────────
// 5. PRESCRIPTIONS (Header)
// ─────────────────────────────────────────────
export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  patient_id: uuid("patient_id").notNull().references(() => all_entries.id, { onDelete: "cascade" }),
  doctor_id: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  
  token: varchar("token", { length: 10 }).notNull(),
  
  prescriptionDate: date("prescription_date").defaultNow().notNull(),
  prescriptionTime: time("prescription_time").defaultNow(),

  diagnosis: text("diagnosis"),
  clinicalNotes: text("clinical_notes"),

  createdDate: date("created_date").defaultNow().notNull(),
  createdTime: time("created_time").defaultNow(),
});

// ─────────────────────────────────────────────
// 6. PRESCRIPTION MEDICINES (One row per medicine)
// ─────────────────────────────────────────────
export const prescription_medicines = pgTable("prescription_medicines", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  prescription_id: uuid("prescription_id").notNull().references(() => prescriptions.id, { onDelete: "cascade" }),
  
  medicineName: text("medicine_name").notNull(),
  
  morning: boolean("morning").default(false).notNull(),     // 1 = true, 0 = false
  afternoon: boolean("afternoon").default(false).notNull(),
  night: boolean("night").default(false).notNull(),
  
  beforeMeal: boolean("before_meal").default(false).notNull(),
  afterMeal: boolean("after_meal").default(true).notNull(),   // default after meal as common
  
  dosage: text("dosage"),      // e.g. "500mg", "1 tablet"
  duration: text("duration"),  // e.g. "3 days", "1 week"
});

// ====================== RELATIONS ======================
export const allEntriesRelations = relations(all_entries, ({ one, many }) => ({
  user: one(users),
  vitals: many(vitals),
  prescriptions: many(prescriptions),
}));

export const vitalsRelations = relations(vitals, ({ one }) => ({
  patient: one(all_entries),
  recordedBy: one(users),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  patient: one(all_entries),
  doctor: one(doctors),
  medicines: many(prescription_medicines),
}));

export const prescriptionMedicinesRelations = relations(prescription_medicines, ({ one }) => ({
  prescription: one(prescriptions),
}));

export const doctorsRelations = relations(doctors, ({ many }) => ({
  prescriptions: many(prescriptions),
}));