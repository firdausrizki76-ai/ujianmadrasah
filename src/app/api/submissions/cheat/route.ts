import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { submission_id } = await req.json();

    if (!submission_id) {
      return NextResponse.json({ error: "Missing submission_id" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Fetch current cheat attempts
    const { data: sub, error: fetchErr } = await admin
      .from("exam_submissions")
      .select("cheat_attempts")
      .eq("id", submission_id)
      .single();

    if (fetchErr) throw fetchErr;

    const newAttempts = (sub.cheat_attempts || 0) + 1;

    // 2. Update the cheat_attempts count
    const { error: updateErr } = await admin
      .from("exam_submissions")
      .update({ cheat_attempts: newAttempts })
      .eq("id", submission_id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, cheat_attempts: newAttempts });
  } catch (err: any) {
    console.error("[Cheat API]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
