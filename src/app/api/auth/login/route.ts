import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    // Look up the user in our custom `users` table first using admin client
    const admin = createAdminClient();
    const { data: userRecord, error: dbError } = await admin
      .from("users")
      .select("id, name, role, nisn, avatar, email, class_name, subject")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (dbError || !userRecord) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan. Periksa kembali email Anda." },
        { status: 401 }
      );
    }

    // Authenticate with Supabase Auth using anon client from config
    const { supabase: supabaseAuth } = await import("@/lib/supabase");
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signInWithPassword({ email, password });

    if (authError || !authData?.session) {
      return NextResponse.json(
        { error: "Password salah. Coba lagi." },
        { status: 401 }
      );
    }

    // Return user profile + session tokens
    return NextResponse.json({
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        nisn: userRecord.nisn ?? null,
        avatar: userRecord.avatar ?? null,
        class_name: userRecord.class_name ?? null,
        subject: userRecord.subject ?? null,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
    });
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server. Coba lagi." },
      { status: 500 }
    );
  }
}
