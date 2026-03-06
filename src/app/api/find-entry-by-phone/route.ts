import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/_utils/db/index";
import { all_entries } from "@/app/_utils/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  }

  try {
    // 1. Query the database for the most recent entry with this phone number
    const [entry] = await db
      .select()
      .from(all_entries)
      .where(eq(all_entries.phoneNumber, phone))
      .orderBy(desc(all_entries.id))
      .limit(1);

    if (!entry) {
      return NextResponse.json({ error: "No entry found" }, { status: 404 });
    }

    // 2. Return the data mapped to your frontend keys
    // NOTE: Ensure these keys match the 'key' property in your demographic.ts file
    return NextResponse.json({
      entryId: entry.id,
      fields: {
        name: entry.name,
        father_husband: entry.father_husband,
        age: String(entry.age), // Convert to string for the HTML input value
        gender: entry.gender,
        qualification: entry.qualification,
        profession: entry.profession,
        phoneNumber: entry.phoneNumber,
      }
    });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}