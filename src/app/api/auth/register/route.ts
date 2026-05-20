import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role, nisn, class_name, subject, session_id } = body as {
      name: string;
      email: string;
      password: string;
      role: "siswa" | "guru" | "admin";
      nisn?: string;
      class_name?: string;
      subject?: string;
      session_id?: string | null;
    };

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Nama, email, password, dan role wajib diisi." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Create the auth account in Supabase Auth
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true, // auto-confirm so user can login immediately
      });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "Email sudah terdaftar. Gunakan email lain." },
          { status: 409 }
        );
      }
      throw authError;
    }

    // 2. Insert user profile into our custom `users` table
    const { data: userRecord, error: insertError } = await admin
      .from("users")
      .insert({
        id: authData.user.id, // same UUID as auth.users
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        nisn: nisn?.trim() ?? null,
        class_name: role === "siswa" ? (class_name?.trim() ?? null) : null,
        subject: role === "guru" ? (subject?.trim() ?? null) : null,
        session_id: role === "siswa" ? (session_id || null) : null,
      })
      .select()
      .single();

    if (insertError) {
      // Rollback auth user if profile insert failed
      await admin.auth.admin.deleteUser(authData.user.id);
      throw insertError;
    }

    // Automatically ensure the class exists in the classes table
    if (role === "siswa" && class_name?.trim()) {
      try {
        await admin
          .from("classes")
          .upsert({ name: class_name.trim() }, { onConflict: "name" });
      } catch (classErr) {
        console.error("Gagal menambahkan kelas otomatis:", classErr);
      }
    }

    return NextResponse.json(
      {
        message: "Akun berhasil dibuat.",
        user: userRecord,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json(
      { error: "Gagal membuat akun. Coba lagi." },
      { status: 500 }
    );
  }
}
