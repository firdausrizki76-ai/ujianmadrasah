import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const admin = createAdminClient();
    const adminEmail = "admin@mtsalinsani.sch.id";
    const adminPassword = "passwordadmin123";

    // 1. Ciptakan user di Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return NextResponse.json({
          status: "Aktif",
          message: "Akun Super Admin sudah terdaftar sebelumnya.",
          credentials: {
            email: adminEmail,
            password: adminPassword
          }
        });
      }
      throw authError;
    }

    // 2. Masukkan ke tabel publik `users`
    const { error: profileError } = await admin
      .from("users")
      .insert({
        id: authData.user.id,
        name: "Admin Utama",
        email: adminEmail,
        role: "admin"
      });

    if (profileError) {
      // Bersihkan jika profil gagal dibuat
      await admin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({
      success: true,
      message: "Selamat! Akun Super Admin berhasil diinisialisasi.",
      credentials: {
        email: adminEmail,
        password: adminPassword,
        role: "admin"
      }
    });

  } catch (err: any) {
    console.error("Initialization error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Gagal menginisialisasi admin"
    }, { status: 500 });
  }
}
