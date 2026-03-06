import { NextResponse } from "next/server";
import { db } from "@/app/_utils/db/index";
import { all_entries } from "@/app/_utils/db/schema";
import { eq } from "drizzle-orm"; // Necessary for the update condition

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Destructure entryId from the body
    const { 
      entryId, 
      name, 
      father_husband, 
      age, 
      gender, 
      profession, 
      qualification, 
      phoneNumber, 
      user_id 
    } = body;

    let finalEntry;

    // 2. Logic: If entryId exists, UPDATE. Otherwise, INSERT.
    if (entryId) {
      // --- UPDATE EXISTING RECORD ---
      const updated = await db
        .update(all_entries)
        .set({
          name,
          father_husband,
          age: Number(age),
          gender,
          profession,
          qualification,
          phoneNumber,
          user_id: Number(user_id),
        })
        .where(eq(all_entries.id, Number(entryId))) // Find the record by ID
        .returning();
      
      finalEntry = updated[0];
    } else {
      // --- INSERT NEW RECORD ---
      const inserted = await db
        .insert(all_entries)
        .values({
          name,
          father_husband,
          age: Number(age),
          gender,
          profession,
          qualification,
          phoneNumber,
          user_id: Number(user_id),
        })
        .returning();
      
      finalEntry = inserted[0];
    }

    // 3. Return the ID (either the one we just created or the one we just updated)
    return NextResponse.json({ 
      success: true, 
      entryId: finalEntry.id,
      message: entryId ? "Entry updated successfully" : "New entry created"
    });

  } catch (err) {
    console.error("Database Error:", err);
    return NextResponse.json(
      { error: "Failed to process entry" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import { db } from "@/app/_utils/db/index";
// import { all_entries } from "@/app/_utils/db/schema";
// import { eq, and, ne } from "drizzle-orm"; // Added 'and' and 'ne'

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { 
//       entryId, 
//       name, 
//       father_husband, 
//       age, 
//       gender, 
//       profession, 
//       qualification, 
//       phoneNumber, 
//       user_id 
//     } = body;

//     // --- 1. DUPLICATE PHONE CHECK ---
//     if (phoneNumber) {
//       const existingRecord = await db
//         .select()
//         .from(all_entries)
//         .where(
//           entryId 
//             ? and(eq(all_entries.phoneNumber, phoneNumber), ne(all_entries.id, Number(entryId))) 
//             : eq(all_entries.phoneNumber, phoneNumber)
//         )
//         .limit(1);

//       if (existingRecord.length > 0) {
//         return NextResponse.json(
//           { error: "This phone number is already registered to another client." },
//           { status: 400 } // Bad Request
//         );
//       }
//     }

//     let finalEntry;

//     // 2. Logic: If entryId exists, UPDATE. Otherwise, INSERT.
//     if (entryId) {
//       const updated = await db
//         .update(all_entries)
//         .set({
//           name,
//           father_husband,
//           age: Number(age),
//           gender,
//           profession,
//           qualification,
//           phoneNumber,
//           user_id: Number(user_id),
//         })
//         .where(eq(all_entries.id, Number(entryId)))
//         .returning();
      
//       finalEntry = updated[0];
//     } else {
//       const inserted = await db
//         .insert(all_entries)
//         .values({
//           name,
//           father_husband,
//           age: Number(age),
//           gender,
//           profession,
//           qualification,
//           phoneNumber,
//           user_id: Number(user_id),
//         })
//         .returning();
      
//       finalEntry = inserted[0];
//     }

//     return NextResponse.json({ 
//       success: true, 
//       entryId: finalEntry.id,
//       message: entryId ? "Entry updated successfully" : "New entry created"
//     });

//   } catch (err) {
//     console.error("Database Error:", err);
//     return NextResponse.json(
//       { error: "Failed to process entry" },
//       { status: 500 }
//     );
//   }
// }