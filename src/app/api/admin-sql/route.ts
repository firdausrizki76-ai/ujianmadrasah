import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();
    
    // Check if cheat_attempts exists
    const { data, error } = await admin
      .from("exam_submissions")
      .select("*")
      .limit(1);

    return NextResponse.json({ data, error });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    // we can try executing a raw SQL if possible, or just updating it
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
