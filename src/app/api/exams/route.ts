import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// List exams for a teacher or a student class
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacher_id");
    const className = searchParams.get("class_name");
    const examId = searchParams.get("exam_id");

    const admin = createAdminClient();

    if (examId) {
      const { data: exam, error } = await admin
        .from("exams")
        .select(`
          *,
          users!exams_created_by_fkey (name),
          exam_sessions (name, start_time, end_time)
        `)
        .eq("id", examId)
        .single();

      if (error) throw error;
      return NextResponse.json({
        exam: {
          ...exam,
          teacher_name: exam.users?.name ?? "Guru Madrasah"
        }
      });
    }

    if (className) {
      // Get exams for a specific student class or school-wide "Semua Kelas"
      const { data: exams, error } = await admin
        .from("exams")
        .select(`
          *,
          users!exams_created_by_fkey (name),
          exam_sessions (name, start_time, end_time),
          exam_questions(count)
        `)
        .or(`class_name.eq."${className}",class_name.eq."Semua Kelas"`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedExams = exams?.map((e: any) => ({
        ...e,
        teacher_name: e.users?.name ?? "Guru Madrasah",
        total_questions: e.exam_questions?.[0]?.count ?? 0,
      })) ?? [];

      return NextResponse.json({ exams: formattedExams });
    }

    let query = admin
      .from("exams")
      .select(`
        *,
        users!exams_created_by_fkey (name),
        exam_sessions (name, start_time, end_time),
        exam_questions(count)
      `)
      .order("created_at", { ascending: false });

    if (teacherId) {
      query = query.eq("created_by", teacherId);
    }

    const { data: exams, error } = await query;

    if (error) throw error;

    const formattedExams = exams?.map((e: any) => ({
      ...e,
      teacher_name: e.users?.name ?? "Guru Madrasah",
      total_questions: e.exam_questions?.[0]?.count ?? 0,
    })) ?? [];

    return NextResponse.json({ exams: formattedExams });
  } catch (err) {
    console.error("[GET /api/exams]", err);
    return NextResponse.json({ error: "Gagal memuat daftar ujian." }, { status: 500 });
  }
}

// Create a new exam
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, subject, type, duration_minutes, start_at, end_at, created_by, class_name, instructions, session_id } = body as {
      title: string;
      subject: string;
      type: string;
      duration_minutes: number;
      start_at: string;
      end_at: string;
      created_by: string;
      class_name: string;
      instructions?: string;
      session_id?: string | null;
    };

    if (!title || !subject || !duration_minutes || !start_at || !end_at || !created_by || !class_name) {
      return NextResponse.json(
        { error: "Judul, mapel, durasi, tanggal mulai/selesai, kelas target, dan ID pembuat wajib diisi." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: newExam, error } = await admin
      .from("exams")
      .insert({
        title: title.trim(),
        subject: subject.trim(),
        type: type || "Ujian",
        duration_minutes: Number(duration_minutes),
        total_questions: 0,
        start_at,
        end_at,
        created_by,
        class_name: class_name.trim(),
        instructions: instructions ? instructions.trim() : null,
        session_id: session_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ message: "Ujian berhasil dibuat.", exam: newExam }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/exams]", err);
    return NextResponse.json({ error: "Gagal membuat sesi ujian baru." }, { status: 500 });
  }
}

// Update an existing exam
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, subject, type, duration_minutes, start_at, end_at, class_name, instructions, session_id } = body as {
      id: string;
      title: string;
      subject: string;
      type: string;
      duration_minutes: number;
      start_at: string;
      end_at: string;
      class_name: string;
      instructions?: string;
      session_id?: string | null;
    };

    if (!id || !title || !subject || !duration_minutes || !start_at || !end_at || !class_name) {
      return NextResponse.json(
        { error: "ID, Judul, mapel, durasi, tanggal mulai/selesai, dan kelas target wajib diisi." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: updatedExam, error } = await admin
      .from("exams")
      .update({
        title: title.trim(),
        subject: subject.trim(),
        type: type || "Ujian",
        duration_minutes: Number(duration_minutes),
        start_at,
        end_at,
        class_name: class_name.trim(),
        instructions: instructions ? instructions.trim() : null,
        session_id: session_id || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ message: "Ujian berhasil diperbarui.", exam: updatedExam });
  } catch (err) {
    console.error("[PUT /api/exams]", err);
    return NextResponse.json({ error: "Gagal memperbarui sesi ujian." }, { status: 500 });
  }
}

// Delete an exam
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("exam_id");

    if (!examId) {
      return NextResponse.json({ error: "exam_id query param wajib diisi." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("exams").delete().eq("id", examId);

    if (error) throw error;

    return NextResponse.json({ message: "Ujian berhasil dihapus." });
  } catch (err) {
    console.error("[DELETE /api/exams]", err);
    return NextResponse.json({ error: "Gagal menghapus ujian." }, { status: 500 });
  }
}
