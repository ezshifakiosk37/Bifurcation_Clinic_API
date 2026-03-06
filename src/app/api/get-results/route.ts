
import { NextResponse } from "next/server";
// @ts-ignore - Assuming user has these configured as per their snippet
import { db } from "@/app/_utils/db/index";
// @ts-ignore - Assuming user has these configured as per their snippet
import { results } from "@/app/_utils/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const entryId = Number(url.searchParams.get("entryId"));

    if (!entryId) {
      return NextResponse.json({ error: "Missing entryId" }, { status: 400 });
    }

    // Fetch ALL records for this entryId, ordered by most recent first
    const allResults = await db
      .select({
        id: results.id,
        questionnaireType: results.questionnaireType,
        totalScore: results.totalScore,
        created_at: results.created_at,
      })
      .from(results)
      .where(eq(results.entryId, entryId))
      .orderBy(desc(results.created_at));

    return NextResponse.json({
      results: allResults,
    });
  } catch (err) {
    console.error("Database Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}
