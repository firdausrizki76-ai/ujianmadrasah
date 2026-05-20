import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("exam_sessions")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ sessions: data });
  } catch (err: any) {
    console.error("[GET /api/sessions]", err);
    return NextResponse.json({ error: err.message || "Gagal memuat sesi ujian." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, start_time, end_time } = body as {
      name: string;
      start_time: string;
      end_time: string;
    };

    if (!name || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Nama sesi, waktu mulai, dan waktu selesai wajib diisi." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("exam_sessions")
      .insert({
        name: name.trim(),
        start_time,
        end_time,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ session: data }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/sessions]", err);
    return NextResponse.json({ error: err.message || "Gagal membuat sesi ujian baru." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessions } = body as {
      sessions: Array<{
        id: string;
        start_time: string;
        end_time: string;
      }>;
    };

    if (!sessions || !Array.isArray(sessions)) {
      return NextResponse.json({ error: "Data sesi tidak valid." }, { status: 400 });
    }

    const admin = createAdminClient();

    for (const sess of sessions) {
      const { error } = await admin
        .from("exam_sessions")
        .update({
          start_time: sess.start_time,
          end_time: sess.end_time,
        })
        .eq("id", sess.id);

      if (error) throw error;
    }

    return NextResponse.json({ message: "Sesi ujian berhasil diperbarui." });
  } catch (err: any) {
    console.error("[PUT /api/sessions]", err);
    return NextResponse.json({ error: err.message || "Gagal memperbarui sesi ujian." }, { status: 500 });
  }
}
