import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { student_id, exam_id } = await req.json();
    if (!student_id || !exam_id) {
      return NextResponse.json({ error: "student_id dan exam_id wajib diisi." }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Check if submission already exists (prevent duplicate submissions)
    const { data: existingSubs, error: checkError } = await admin
      .from("exam_submissions")
      .select("*")
      .eq("student_id", student_id)
      .eq("exam_id", exam_id);

    if (existingSubs && existingSubs.length > 0) {
      const activeSub = existingSubs.find((s) => s.status === "graded" || s.status === "submitted") ?? existingSubs[0];
      return NextResponse.json({
        message: "Sesi ujian sudah ada.",
        submission: activeSub
      });
    }

    // 2. Start a new session
    const { data: newSub, error: insertError } = await admin
      .from("exam_submissions")
      .insert({
        student_id,
        exam_id,
        status: "in_progress",
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existingSub, error: fetchError } = await admin
          .from("exam_submissions")
          .select("*")
          .eq("student_id", student_id)
          .eq("exam_id", exam_id)
          .single();
        
        if (!fetchError && existingSub) {
          return NextResponse.json({
            message: "Sesi ujian sudah ada.",
            submission: existingSub,
          });
        }
      }
      throw insertError;
    }

    return NextResponse.json({
      message: "Sesi ujian dimulai.",
      submission: newSub
    }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/submissions/start]", err);
    return NextResponse.json({ error: err.message || "Gagal memulai sesi ujian." }, { status: 500 });
  }
}
