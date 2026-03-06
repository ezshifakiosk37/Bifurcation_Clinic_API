// src/app/api/save-result/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/_utils/db/index";
import { results } from "@/app/_utils/db/schema";

interface DetailedResult {
  questionNumber: number;
  questionText: string;
  selectedLabel: string;
  score: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entryId, questionnaireType, totalScore, user_id, detailedResults } = body;

    // VALIDATION: Added detailedResults to the required fields check
    if (
      !entryId || 
      !questionnaireType || 
      totalScore === undefined || 
      !user_id || 
      !detailedResults // Ensure the array exists
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    console.log("Saving result for user:", user_id);

    const parsedUserId = Number(user_id);
    const parsedTotalScore = Number(totalScore);
    const parsedEntryId = Number(entryId);

    // Safety check: Ensure we didn't get NaN
    if (isNaN(parsedUserId) || isNaN(parsedTotalScore) || isNaN(parsedEntryId)) {
        return NextResponse.json({ error: "Invalid numeric data" }, { status: 400 });
    }

    // Database Insertion
    const result = await db
      .insert(results)
      .values({ 
        entryId: parsedEntryId, 
        questionnaireType, 
        totalScore: parsedTotalScore, 
        user_id: parsedUserId,
        detailedResults: detailedResults // Drizzle handles the JSONB conversion automatically
      })
      .returning();

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("DATABASE ERROR:", err); 
    return NextResponse.json(
      { error: "Failed to save result" },
      { status: 500 }
    );
  }
}