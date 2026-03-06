// src/app/api/save-result/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/_utils/db/index";
import { research_result, results } from "@/app/_utils/db/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entryId, questionnaireType, totalScore, user_id } = body;

    if (!entryId || !questionnaireType || totalScore == null || user_id === null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(research_result)
      .values({ entryId: Number(entryId), questionnaireType, totalScore: Number(totalScore), user_id: Number(user_id) })
      .returning();

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save result" },
      { status: 500 }
    );
  }
}
