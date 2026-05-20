import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { submission_id, answers } = await req.json() as {
      submission_id: string;
      answers: Record<string, string>;
    };

    if (!submission_id || !answers) {
      return NextResponse.json({ error: "submission_id dan answers wajib diisi." }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Fetch the submission details to get the exam_id
    const { data: submission, error: subError } = await admin
      .from("exam_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: "Sesi ujian tidak ditemukan atau telah berakhir." }, { status: 404 });
    }

    // Check if already completed to prevent double submissions
    if (submission.status !== "in_progress") {
      return NextResponse.json({
        message: "Ujian ini sudah dikumpulkan sebelumnya.",
        submission
      });
    }

    // 2. Fetch all questions for this exam to perform grading
    const { data: questions, error: qError } = await admin
      .from("exam_questions")
      .select("*")
      .eq("exam_id", submission.exam_id);

    if (qError || !questions) {
      return NextResponse.json({ error: "Gagal memuat butir soal." }, { status: 500 });
    }

    // 3. Prepare the answers batch insertion and calculate scores
    let correctCount = 0;
    let mcCount = 0;
    let hasEssay = false;

    const answersPayload = questions.map((q) => {
      const studentAnswer = (answers[q.id] || "").trim();
      let isCorrect: boolean | null = null;

      if (q.type === "pilihan_ganda") {
        mcCount++;
        // Compare option letter (case-insensitive)
        const matched = studentAnswer.toUpperCase() === (q.answer_key || "").trim().toUpperCase();
        isCorrect = matched;
        if (matched) correctCount++;
      } else {
        hasEssay = true;
        isCorrect = null; // Essay requires manual teacher evaluation
      }

      return {
        submission_id,
        question_id: q.id,
        answer_text: studentAnswer,
        is_correct: isCorrect
      };
    });

    // 4. Insert all answers into `exam_answers`
    if (answersPayload.length > 0) {
      const { error: ansInsertError } = await admin
        .from("exam_answers")
        .insert(answersPayload);

      if (ansInsertError) throw ansInsertError;
    }

    // 5. Calculate score (out of 100)
    const scoreBase = mcCount > 0 ? mcCount : questions.length;
    const computedScore = scoreBase > 0 ? Math.round((correctCount / scoreBase) * 100) : 0;

    // 6. Update submission record
    // If exam has essays, status = 'completed' (awaits teacher grading).
    // If only multiple-choice, status = 'graded' (fully graded).
    const finalStatus = hasEssay ? "completed" : "graded";

    const { data: updatedSub, error: updateError } = await admin
      .from("exam_submissions")
      .update({
        completed_at: new Date().toISOString(),
        score: computedScore,
        status: finalStatus
      })
      .eq("id", submission_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      message: "Ujian berhasil dikumpulkan.",
      submission: updatedSub,
      stats: {
        total_questions: questions.length,
        multiple_choice_count: mcCount,
        correct_multiple_choice: correctCount,
        score: computedScore,
        has_essay: hasEssay
      }
    });
  } catch (err: any) {
    console.error("[POST /api/submissions/submit]", err);
    return NextResponse.json({ error: err.message || "Gagal mengumpulkan lembar jawaban." }, { status: 500 });
  }
}
