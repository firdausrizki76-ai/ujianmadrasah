import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// List all questions for a specific exam
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("exam_id");

    if (!examId) {
      return NextResponse.json({ error: "exam_id query param wajib diisi." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: questions, error } = await admin
      .from("exam_questions")
      .select("*")
      .eq("exam_id", examId)
      .order("order_index", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ questions: questions ?? [] });
  } catch (err) {
    console.error("[GET /api/questions]", err);
    return NextResponse.json({ error: "Gagal memuat daftar soal." }, { status: 500 });
  }
}

// Add or update a question (supports single insert/update and bulk array insert)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const admin = createAdminClient();

    // Check if it is a bulk insert (array of questions)
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ error: "Data soal kosong." }, { status: 400 });
      }

      const firstExamId = body[0].exam_id;
      if (!firstExamId) {
        return NextResponse.json({ error: "exam_id wajib diisi untuk seluruh soal." }, { status: 400 });
      }

      // Determine starting order_index
      const { data: existingQ } = await admin
        .from("exam_questions")
        .select("order_index")
        .eq("exam_id", firstExamId)
        .order("order_index", { ascending: false })
        .limit(1);
      let startIndex = existingQ && existingQ.length > 0 ? existingQ[0].order_index + 1 : 0;

      // Map dynamic bulk payload
      const bulkPayload = body.map((q: any, idx: number) => {
        if (!q.question_text || !q.answer_key) {
          throw new Error("Tiap soal wajib memiliki teks pertanyaan dan kunci jawaban.");
        }
        return {
          exam_id: firstExamId,
          question_text: q.question_text.trim(),
          answer_key: q.answer_key.trim(),
          options: q.options || [],
          type: q.type || "pilihan_ganda",
          order_index: startIndex + idx,
        };
      });

      const { data: insertedData, error: bulkError } = await admin
        .from("exam_questions")
        .insert(bulkPayload)
        .select();

      if (bulkError) throw bulkError;

      // Automatically update the total_questions count on the exams table
      const { count } = await admin
        .from("exam_questions")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", firstExamId);

      await admin
        .from("exams")
        .update({ total_questions: count ?? 0 })
        .eq("id", firstExamId);

      return NextResponse.json({
        message: `${insertedData?.length ?? 0} butir soal berhasil di-import dari dokumen.`,
        count: insertedData?.length ?? 0,
      }, { status: 201 });
    }

    // Single insert or update
    const { id, exam_id, question_text, answer_key, order_index, options, type } = body as {
      id?: string;
      exam_id: string;
      question_text: string;
      answer_key: string;
      order_index?: number;
      options?: string[];
      type?: "pilihan_ganda" | "essay";
    };

    if (!exam_id || !question_text || !answer_key) {
      return NextResponse.json(
        { error: "exam_id, question_text, dan answer_key wajib diisi." },
        { status: 400 }
      );
    }

    let questionRecord;
    if (id) {
      // Update existing question
      const { data, error } = await admin
        .from("exam_questions")
        .update({
          question_text: question_text.trim(),
          answer_key: answer_key.trim(),
          options: options || [],
          type: type || "pilihan_ganda",
          order_index: order_index ?? 0,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      questionRecord = data;
    } else {
      // Determine order_index if not provided
      let finalIndex = order_index;
      if (finalIndex === undefined) {
        const { data: existingQ } = await admin
          .from("exam_questions")
          .select("order_index")
          .eq("exam_id", exam_id)
          .order("order_index", { ascending: false })
          .limit(1);
        finalIndex = existingQ && existingQ.length > 0 ? existingQ[0].order_index + 1 : 0;
      }

      // Insert new question
      const { data, error } = await admin
        .from("exam_questions")
        .insert({
          exam_id,
          question_text: question_text.trim(),
          answer_key: answer_key.trim(),
          options: options || [],
          type: type || "pilihan_ganda",
          order_index: finalIndex,
        })
        .select()
        .single();

      if (error) throw error;
      questionRecord = data;
    }

    // Automatically update the total_questions count on the exams table
    const { count } = await admin
      .from("exam_questions")
      .select("*", { count: "exact", head: true })
      .eq("exam_id", exam_id);

    await admin
      .from("exams")
      .update({ total_questions: count ?? 0 })
      .eq("id", exam_id);

    return NextResponse.json({
      message: "Soal berhasil disimpan.",
      question: questionRecord,
    });
  } catch (err) {
    console.error("[POST /api/questions]", err);
    return NextResponse.json({ error: "Gagal menyimpan soal." }, { status: 500 });
  }
}

// Delete a question
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("question_id");
    const examId = searchParams.get("exam_id");

    if (!questionId || !examId) {
      return NextResponse.json({ error: "question_id dan exam_id wajib diisi." }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Delete the question
    const { error } = await admin.from("exam_questions").delete().eq("id", questionId);
    if (error) throw error;

    // 2. Re-calculate and update total_questions count on the exams table
    const { count } = await admin
      .from("exam_questions")
      .select("*", { count: "exact", head: true })
      .eq("exam_id", examId);

    await admin
      .from("exams")
      .update({ total_questions: count ?? 0 })
      .eq("id", examId);

    return NextResponse.json({ message: "Soal berhasil dihapus." });
  } catch (err) {
    console.error("[DELETE /api/questions]", err);
    return NextResponse.json({ error: "Gagal menghapus soal." }, { status: 500 });
  }
}
