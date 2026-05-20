import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacher_id");

    if (!teacherId) {
      return NextResponse.json({ error: "teacher_id query param wajib diisi." }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Get total students count (global)
    const { count: studentCount, error: studentError } = await admin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "siswa");

    if (studentError) throw studentError;

    // 2. Get total exams created by this teacher
    const { data: teacherExams, error: examsError } = await admin
      .from("exams")
      .select("id, title, subject, total_questions, start_at, end_at")
      .eq("created_by", teacherId);

    if (examsError) throw examsError;

    const totalExams = teacherExams?.length ?? 0;

    // 3. Get active exams count
    const now = new Date().toISOString();
    const activeExams = teacherExams?.filter(
      (e) => new Date(e.start_at) <= new Date() && new Date(e.end_at) >= new Date()
    ).length ?? 0;

    // 4. Get total questions across all exams created by this teacher
    let totalQuestions = 0;
    if (teacherExams && teacherExams.length > 0) {
      const examIds = teacherExams.map((e) => e.id);
      const { count: qCount, error: qError } = await admin
        .from("exam_questions")
        .select("*", { count: "exact", head: true })
        .in("exam_id", examIds);
      
      if (qError) throw qError;
      totalQuestions = qCount ?? 0;
    }

    // 5. Get average score & recent submissions for this teacher's exams
    let averageScore = 0;
    let recentSubmissions: any[] = [];

    if (teacherExams && teacherExams.length > 0) {
      const examIds = teacherExams.map((e) => e.id);

      // Get average score
      const { data: scores, error: scoresError } = await admin
        .from("exam_submissions")
        .select("score")
        .in("exam_id", examIds)
        .not("score", "is", null);

      if (scoresError) throw scoresError;

      if (scores && scores.length > 0) {
        const sum = scores.reduce((acc, curr) => acc + Number(curr.score), 0);
        averageScore = parseFloat((sum / scores.length).toFixed(1));
      }

      // Get recent submissions
      const { data: subs, error: subsError } = await admin
        .from("exam_submissions")
        .select(`
          id,
          started_at,
          completed_at,
          score,
          status,
          student_id,
          exam_id,
          users!exam_submissions_student_id_fkey (name, class_name),
          exams!exam_submissions_exam_id_fkey (title)
        `)
        .in("exam_id", examIds)
        .order("created_at", { ascending: false })
        .limit(5);

      if (subsError) {
        console.error("Error fetching submissions joined data:", subsError);
      } else {
        recentSubmissions = subs?.map((s: any) => ({
          id: s.id,
          student_name: s.users?.name ?? "Siswa MTs",
          class_name: s.users?.class_name ?? "—",
          exam_title: s.exams?.title ?? "Ujian",
          started_at: s.started_at,
          completed_at: s.completed_at,
          score: s.score,
          status: s.status,
        })) ?? [];
      }
    }

    // 6. Generate statistics of exam counts by subject for charts
    const subjectStats: Record<string, number> = {};
    teacherExams?.forEach((e) => {
      subjectStats[e.subject] = (subjectStats[e.subject] || 0) + 1;
    });

    return NextResponse.json({
      stats: {
        totalStudents: studentCount ?? 0,
        totalExams,
        activeExams,
        totalQuestions,
        averageScore,
      },
      recentSubmissions,
      subjectStats: Object.entries(subjectStats).map(([subject, count]) => ({
        subject,
        count,
      })),
    });
  } catch (err) {
    console.error("[GET /api/guru/stats]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server saat memproses statistik." }, { status: 500 });
  }
}
