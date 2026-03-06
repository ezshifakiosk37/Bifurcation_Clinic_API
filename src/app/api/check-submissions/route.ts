import { NextResponse } from "next/server";
import { db } from "@/app/_utils/db/index";
import { results } from "@/app/_utils/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("entryId");
    if (!entryId) return NextResponse.json({ submittedTypes: {} });

    // Fetch all results for that entryId
    const existing = await db
      .select()
      .from(results)
      .where(eq(results.entryId, Number(entryId)));

    // Create a dictionary with questionnaireType as key
    const submittedTypes: Record<string, boolean> = {};
    existing.forEach((r) => {
      submittedTypes[r.questionnaireType] = true;
    });

    return NextResponse.json({ submittedTypes });
  } catch (err) {
    console.error("Check submission error:", err);
    return NextResponse.json({ submittedTypes: {} });
  }
}
