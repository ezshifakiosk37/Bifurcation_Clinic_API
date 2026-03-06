// src/app/api/save-entry/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/_utils/db/index";
import { all_entries, all_research_entries } from "@/app/_utils/db/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, father_husband, age, gender, profession, qualification, phoneNumber, user_id } = body;

    // Insert demographic
    const entry = await db
      .insert(all_research_entries)
      .values({ name, father_husband, age: Number(age), gender, profession, qualification, phoneNumber, user_id: Number(user_id) })
      .returning();

    // Return the entryId for linking questionnaire results
    return NextResponse.json({ success: true, entryId: entry[0].id });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to add entry" },
      { status: 500 }
    );
  }
}
