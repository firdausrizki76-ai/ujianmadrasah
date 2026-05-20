import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: classes, error } = await admin
      .from("classes")
      .select(`
        id,
        name,
        level,
        created_at,
        wali_kelas_id,
        users!classes_wali_kelas_id_fkey (id, name, email)
      `)
      .order("name", { ascending: true });

    if (error) throw error;

    const formatted = classes.map((c: any) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      created_at: c.created_at,
      wali_kelas_id: c.wali_kelas_id,
      wali_kelas_name: c.users?.name ?? null,
      wali_kelas_email: c.users?.email ?? null,
    }));

    return NextResponse.json({ classes: formatted });
  } catch (err: any) {
    console.error("[GET /api/classes]", err);
    return NextResponse.json({ error: err.message || "Gagal memuat data kelas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, level, wali_kelas_id } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama kelas wajib diisi." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: newClass, error } = await admin
      .from("classes")
      .insert({
        name: name.trim(),
        level: level ? parseInt(level, 10) : null,
        wali_kelas_id: wali_kelas_id || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Kelas dengan nama tersebut sudah ada." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, class: newClass });
  } catch (err: any) {
    console.error("[POST /api/classes]", err);
    return NextResponse.json({ error: err.message || "Gagal menambahkan kelas." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { class_id, wali_kelas_id, name, level } = await req.json();

    if (!class_id) {
      return NextResponse.json({ error: "class_id wajib diisi." }, { status: 400 });
    }

    const admin = createAdminClient();

    const updatePayload: any = {};
    if (wali_kelas_id !== undefined) updatePayload.wali_kelas_id = wali_kelas_id || null;
    if (name !== undefined) updatePayload.name = name.trim();
    if (level !== undefined) updatePayload.level = level ? parseInt(level, 10) : null;

    const { data: updatedClass, error } = await admin
      .from("classes")
      .update(updatePayload)
      .eq("id", class_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, class: updatedClass });
  } catch (err: any) {
    console.error("[PUT /api/classes]", err);
    return NextResponse.json({ error: err.message || "Gagal memperbarui kelas." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");

    if (!classId) {
      return NextResponse.json({ error: "class_id wajib disertakan." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("classes")
      .delete()
      .eq("id", classId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Kelas berhasil dihapus." });
  } catch (err: any) {
    console.error("[DELETE /api/classes]", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus kelas." }, { status: 500 });
  }
}
