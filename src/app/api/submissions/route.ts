import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// Get submissions list or specific details
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacher_id");
    const submissionId = searchParams.get("submission_id");
    const studentId = searchParams.get("student_id");

    const admin = createAdminClient();

    if (submissionId) {
      // 1. Get specific submission details with questions & student answers
      const { data: submission, error: subError } = await admin
        .from("exam_submissions")
        .select(`
          *,
          users!exam_submissions_student_id_fkey (name, class_name),
          exams!exam_submissions_exam_id_fkey (title, subject)
        `)
        .eq("id", submissionId)
        .single();

      if (subError) throw subError;

      // Fetch all questions for this exam
      const { data: questions, error: qError } = await admin
        .from("exam_questions")
        .select("*")
        .eq("exam_id", submission.exam_id)
        .order("order_index", { ascending: true });

      if (qError) throw qError;

      // Fetch student's answers
      const { data: answers, error: ansError } = await admin
        .from("exam_answers")
        .select("*")
        .eq("submission_id", submissionId);

      if (ansError) throw ansError;

      // Map answers to questions
      const detailedQuestions = questions?.map((q: any) => {
        const studentAns = answers?.find((a: any) => a.question_id === q.id);
        return {
          ...q,
          student_answer: studentAns?.answer_text ?? "",
          is_correct: studentAns?.is_correct ?? null,
          answer_id: studentAns?.id ?? null,
        };
      }) ?? [];

      return NextResponse.json({
        submission: {
          id: submission.id,
          student_name: submission.users?.name ?? "Siswa",
          class_name: submission.users?.class_name ?? "—",
          exam_title: submission.exams?.title ?? "Ujian",
          subject: submission.exams?.subject ?? "—",
          started_at: submission.started_at,
          completed_at: submission.completed_at,
          score: submission.score,
          status: submission.status,
        },
        questions: detailedQuestions,
      });
    }

    if (teacherId) {
      // 2. Get list of submissions for exams created by this teacher
      const { data: teacherExams, error: examsError } = await admin
        .from("exams")
        .select("id")
        .eq("created_by", teacherId);

      if (examsError) throw examsError;

      if (!teacherExams || teacherExams.length === 0) {
        return NextResponse.json({ submissions: [] });
      }

      const examIds = teacherExams.map((e) => e.id);

      const { data: subs, error: subsError } = await admin
        .from("exam_submissions")
        .select(`
          id,
          started_at,
          completed_at,
          score,
          status,
          users!exam_submissions_student_id_fkey (name, class_name),
          exams!exam_submissions_exam_id_fkey (title, subject)
        `)
        .in("exam_id", examIds)
        .order("created_at", { ascending: false });

      if (subsError) throw subsError;

      const formattedSubs = subs?.map((s: any) => ({
        id: s.id,
        student_name: s.users?.name ?? "Siswa",
        class_name: s.users?.class_name ?? "—",
        exam_title: s.exams?.title ?? "Ujian",
        subject: s.exams?.subject ?? "—",
        started_at: s.started_at,
        completed_at: s.completed_at,
        score: s.score,
        status: s.status,
      })) ?? [];

      return NextResponse.json({ submissions: formattedSubs });
    }

    if (studentId) {
      // 3. Get list of submissions for a specific student
      const { data: subs, error: subsError } = await admin
        .from("exam_submissions")
        .select(`
          id,
          exam_id,
          started_at,
          completed_at,
          score,
          status,
          exams!exam_submissions_exam_id_fkey (title, subject)
        `)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (subsError) throw subsError;

      return NextResponse.json({ submissions: subs ?? [] });
    }

    // 4. Default: Get all submissions for Admin reports
    const { data: subs, error: subsError } = await admin
      .from("exam_submissions")
      .select(`
        id,
        exam_id,
        student_id,
        started_at,
        completed_at,
        score,
        status,
        users!exam_submissions_student_id_fkey (name, class_name, email),
        exams!exam_submissions_exam_id_fkey (title, subject)
      `)
      .order("created_at", { ascending: false });

    if (subsError) throw subsError;

    const formattedSubs = subs?.map((s: any) => ({
      id: s.id,
      exam_id: s.exam_id,
      student_id: s.student_id,
      student_name: s.users?.name ?? "Siswa",
      class_name: s.users?.class_name ?? "—",
      student_email: s.users?.email ?? "—",
      exam_title: s.exams?.title ?? "Ujian",
      subject: s.exams?.subject ?? "—",
      started_at: s.started_at,
      completed_at: s.completed_at,
      score: s.score,
      status: s.status,
    })) ?? [];

    return NextResponse.json({ submissions: formattedSubs });
  } catch (err) {
    console.error("[GET /api/submissions]", err);
    return NextResponse.json({ error: "Gagal memuat data pengumpulan." }, { status: 500 });
  }
}

// Grade essay questions and save final submission score
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submission_id, grades } = body as {
      submission_id: string;
      grades: Array<{
        answer_id: string;
        is_correct: boolean;
      }>;
    };

    if (!submission_id || !grades || !Array.isArray(grades)) {
      return NextResponse.json({ error: "submission_id dan grades array wajib diisi." }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Update individual answer status (is_correct)
    for (const g of grades) {
      const { error: ansError } = await admin
        .from("exam_answers")
        .update({ is_correct: g.is_correct })
        .eq("id", g.answer_id);

      if (ansError) throw ansError;
    }

    // 2. Fetch all answers for this submission to re-calculate the final score
    const { data: allAnswers, error: fetchError } = await admin
      .from("exam_answers")
      .select("is_correct")
      .eq("submission_id", submission_id);

    if (fetchError) throw fetchError;

    const totalQuestions = allAnswers?.length ?? 0;
    const correctAnswers = allAnswers?.filter((a) => a.is_correct === true).length ?? 0;
    
    // Compute score out of 100
    const finalScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // 3. Update the submission record status to 'graded' and save the computed score
    const { data: updatedSub, error: updateError } = await admin
      .from("exam_submissions")
      .update({
        score: finalScore,
        status: "graded",
      })
      .eq("id", submission_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      message: "Penilaian berhasil disimpan dan skor akhir dihitung.",
      submission: updatedSub,
    });
  } catch (err) {
    console.error("[POST /api/submissions/grade]", err);
    return NextResponse.json({ error: "Gagal menyimpan penilaian essay." }, { status: 500 });
  }
}
