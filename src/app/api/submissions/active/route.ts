import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacher_id");

    const admin = createAdminClient();

    let query = admin
      .from("exam_submissions")
      .select(`
        id,
        started_at,
        cheat_attempts,
        status,
        users!exam_submissions_student_id_fkey (name, class_name),
        exams!exam_submissions_exam_id_fkey (id, title, subject, duration_minutes, created_by)
      `);

    const { data: activeSubs, error: subsError } = await query;
    if (subsError) throw subsError;

    // 2. Filter by teacher if teacher_id is provided
    let filteredSubs = activeSubs ?? [];
    if (teacherId) {
      filteredSubs = filteredSubs.filter(
        (sub: any) => sub.exams?.created_by === teacherId
      );
    }

    const formatted = filteredSubs.map((s: any) => ({
      id: s.id,
      student_name: s.users?.name ?? "Siswa",
      class_name: s.users?.class_name ?? "—",
      exam_id: s.exams?.id ?? "",
      exam_title: s.exams?.title ?? "Ujian",
      subject: s.exams?.subject ?? "—",
      duration_minutes: s.exams?.duration_minutes ?? 60,
      started_at: s.started_at,
      cheat_attempts: s.cheat_attempts ?? 0,
      status: s.status,
    }));

    return NextResponse.json({ active_sessions: formatted });
  } catch (err: any) {
    console.error("[GET /api/submissions/active]", err);
    return NextResponse.json({ error: err.message || "Gagal memuat sesi aktif." }, { status: 500 });
  }
}
