import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { users } = body as {
      users: Array<{
        name: string;
        email: string;
        password: string;
        role: "siswa" | "guru" | "admin";
        nisn?: string;
        class_name?: string;
        subject?: string;
      }>;
    };

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: "Data user tidak valid atau kosong." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    // Proses user satu per satu
    for (const u of users) {
      try {
        if (!u.name || !u.email || !u.password || !u.role) {
          results.failedCount++;
          results.errors.push({
            email: u.email || "Tanpa Email",
            error: "Data tidak lengkap (nama, email, password, role wajib ada).",
          });
          continue;
        }

        // 1. Daftarkan di Supabase Auth
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email: u.email.trim().toLowerCase(),
          password: String(u.password),
          email_confirm: true,
        });

        if (authError) {
          results.failedCount++;
          results.errors.push({
            email: u.email,
            error: authError.message,
          });
          continue;
        }

        // 2. Simpan profil ke database publik.users
        const { error: insertError } = await admin.from("users").insert({
          id: authData.user.id,
          name: u.name.trim(),
          email: u.email.trim().toLowerCase(),
          role: u.role,
          nisn: u.nisn ? String(u.nisn).trim() : null,
          class_name: u.role === "siswa" ? (u.class_name ? String(u.class_name).trim() : null) : null,
          subject: u.role === "guru" ? (u.subject ? String(u.subject).trim() : null) : null,
        });

        if (insertError) {
          // Bersihkan auth user jika insert profil gagal
          await admin.auth.admin.deleteUser(authData.user.id);
          results.failedCount++;
          results.errors.push({
            email: u.email,
            error: "Gagal menyimpan profil ke database.",
          });
          continue;
        }

        // Automatically ensure the class exists in the classes table
        if (u.role === "siswa" && u.class_name?.trim()) {
          try {
            await admin
              .from("classes")
              .upsert({ name: u.class_name.trim() }, { onConflict: "name" });
          } catch (classErr) {
            console.error("Gagal menambahkan kelas otomatis di impor bulk:", classErr);
          }
        }

        results.successCount++;
      } catch (err: any) {
        results.failedCount++;
        results.errors.push({
          email: u.email || "Unknown",
          error: err.message || "Kesalahan sistem.",
        });
      }
    }

    return NextResponse.json({
      message: "Proses impor selesai.",
      results,
    });
  } catch (err) {
    console.error("[POST /api/users/bulk]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memproses impor bulk." },
      { status: 500 }
    );
  }
}
