import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("users")
      .select("id, name, email, role, nisn, class_name, subject, avatar, created_at, session_id")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ users: data });
  } catch (err) {
    console.error("[GET /api/users]", err);
    return NextResponse.json({ error: "Gagal memuat data user." }, { status: 500 });
  }
}
