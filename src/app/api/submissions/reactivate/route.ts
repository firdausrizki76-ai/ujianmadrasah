import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { submission_id } = await req.json();

    if (!submission_id) {
      return NextResponse.json({ error: "Missing submission_id" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Delete previous answers for this submission so student can start fresh
    const { error: deleteErr } = await admin
      .from("exam_answers")
      .delete()
      .eq("submission_id", submission_id);

    if (deleteErr) throw deleteErr;

    // 2. Reset submission status and cheat attempts to allow student to enter again
    const { error: updateErr } = await admin
      .from("exam_submissions")
      .update({
        status: "in_progress",
        cheat_attempts: 0,
        completed_at: null,
        score: null,
        started_at: new Date().toISOString(),
      })
      .eq("id", submission_id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, message: "Siswa berhasil diaktifkan kembali." });
  } catch (err: any) {
    console.error("[Reactivate API]", err);
    return NextResponse.json({ error: err.message || "Gagal mengaktifkan kembali siswa." }, { status: 500 });
  }
}
