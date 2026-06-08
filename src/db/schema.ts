// src/db/schema.ts 
import { pgTable, text, timestamp, uuid, varchar, integer, date, time, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { serial } from "drizzle-orm/pg-core";

// staff/users/clinic
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  location: text("location").notNull().default("Pilot"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  name: text("name").notNull().default("null"),
  country: text("country").notNull().default("null"),
  city: text("city").notNull().default("null"),
  province: text("province").notNull().default("null"),

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
  fcmToken: text("fcm_token"),
  token: varchar("token", { length: 10 }),
  tokenDate: date("token_date"),           // date of latest check-in
  tokenTime: time("token_time"),            // time of last check-in
  mrNumber: text("mrNumber"),
  profilePhoto: text("profilePhoto").default("null"),
  countryCode: text("countryCode").default("null"), 
});

export const vitals = pgTable("vitals", {
  id: uuid("id").primaryKey().defaultRandom(),
  PulseRate: text("PulseRate"),
  BloodOxygen: text("BloodOxygen"),
  Diastolic: text("Diastolic"),
  Systolic: text("Systolic"),
  Temperature: text("Temperature"),
  temperatureUnit: text("temperatureUnit"),
  Weight: text("Weight"),
  Height: text("Height"),
  heightUnit: text("heightUnit"),
  symptoms: text("symptoms"),
  bmi: text("bmi"),

  token: varchar("token", { length: 10 }),
  patientType: text("patientType").default("Walk-in"),

  createdDate: date("created_date"),
  createdTime: time("created_time"),

  // Video call fields
  roomUrl: text("room_url"),
  roomName: text("room_name"),
  callStatus: text("call_status").default("idle"),

  patient_id: uuid("patient_id").notNull().references(() => all_entries.id),
});

//Rapid Testing
export const rapid_testing = pgTable("rapid_testing", {
  id: uuid("id").primaryKey().defaultRandom(),
  bloodSugar: text("blood_sugar").default("Not Performed"),
  ecg: text("ecg").default("Not Performed"),
  hiv: text("hiv").default("Not Performed"),
  hepatitis: text("hepatitis").default("Not Performed"),
  hbsag: text("hbsag").default("Not Performed"),
  hcvAb: text("hcv_ab").default("Not Performed"),
  hivAb: text("hiv_ab").default("Not Performed"),
  dengueNs1Ag: text("dengue_ns1_ag").default("Not Performed"),
  syphilisAb: text("syphilis_ab").default("Not Performed"),
  typhoidAb: text("typhoid_ab").default("Not Performed"),
  tuberculosis: text("tuberculosis").default("Not Performed"),
  malariaPfPvAg: text("malaria_pf_pv_ag").default("Not Performed"),
  hemoglobin: text("hemoglobin").default("Not Performed"),
  cholesterol: text("cholesterol").default("Not Performed"),
  bodyFat: text("body_fat").default("Not Performed"),
  createdDate: date("created_date"),
  createdTime: time("created_time"),
  vitals_id: uuid("vitals_id").notNull().references(() => vitals.id,),
});
//eyetesting
export const eye_testing = pgTable("eye_testing", {
  id: uuid("id").primaryKey().defaultRandom(),

  chartType: text("chart_type").notNull().default("Not Performed"),
  leftEye: text("left_eye").notNull().default("Not Performed"),
  rightEye: text("right_eye").notNull().default("Not Performed"),
  leftEyeResult:text("leftEyeResult").notNull().default("Not Performed"),
  rightEyeResult:text("rightEyeResult").notNull().default("Not Performed"),
  createdDate: date("created_date"),
  createdTime: time("created_time"),

  vitals_id: uuid("vitals_id").notNull().references(() => vitals.id),
});

//color blind testing
export const color_blind_testing = pgTable("color_blind_testing", {
  id: uuid("id").primaryKey().defaultRandom(),

  plate1: text("plate_1").notNull().default("Not Performed"),
  plate2: text("plate_2").notNull().default("Not Performed"),
  plate3: text("plate_3").notNull().default("Not Performed"),
  colorBlindResult: text("color_blind_result").notNull().default("Not Performed"),

  createdDate: date("created_date"),
  createdTime: time("created_time"),

  vitals_id: uuid("vitals_id").notNull().references(() => vitals.id),
});

// Hearing Testing Table
export const hearing_testing = pgTable("hearing_testing", {
  id: uuid("id").primaryKey().defaultRandom(),

  leftEar: text("left_ear").notNull().default("Not Performed"),
  rightEar: text("right_ear").notNull().default("Not Performed"),
  leftEarResult: text("left_ear_result").notNull().default("Not Performed"),
  rightEarResult: text("right_ear_result").notNull().default("Not Performed"),

  createdDate: date("created_date"),
  createdTime: time("created_time"),

  vitals_id: uuid("vitals_id").notNull().references(() => vitals.id),
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
  doctorStatus: text("doctorStatus").default("online"),

  user_id: uuid("user_id").references(() => users.id),

  createdDate: date("created_date").defaultNow().notNull(),
  createdTime: time("created_time").defaultNow(),
  updatedDate: date("updated_date").defaultNow().notNull(),
  updatedTime: time("updated_time").defaultNow(),

  fcmToken: text("fcm_token"),
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
  labTest: text("labTest"),
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

// ─────────────────────────────────────────────
// 7. DOCTOR ACTIVITY LOGS (Logout Reasons)
// ─────────────────────────────────────────────
export const doctor_logs = pgTable("doctor_logs", {
  id: uuid("id").primaryKey().defaultRandom(),

  doctor_id: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),

  action: text("action").notNull().default("logout"),
  reason: text("reason").notNull(),                    // e.g. "Meal Break", "Shift Ends"

  createdDate: date("created_date").defaultNow().notNull(),
  createdTime: time("created_time").defaultNow(),
});

export const medicine_inventry = pgTable("medicines_inventry", {
  id: serial("id").primaryKey(),
  name: text("name"),
  row: integer("row").notNull().default(1),
  column: integer("column").notNull().default(1),
  quantity: integer("quantity").notNull().default(1),
  createdDate: date("created_date").defaultNow().notNull(),
  createdTime: time("created_time").defaultNow(),
})