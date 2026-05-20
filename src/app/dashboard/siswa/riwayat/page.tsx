"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Submission {
  id: string;
  exam_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  status: "in_progress" | "submitted" | "graded";
  exams: {
    title: string;
    subject: string;
  } | null;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  class_name: string | null;
}

export default function RiwayatSiswa() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/");
      return;
    }
    const userObj = JSON.parse(userStr) as StudentInfo;
    if (userObj.role !== "siswa") {
      router.push("/");
      return;
    }
    setStudent(userObj);
    fetchRiwayat(userObj.id);
  }, [router]);

  const fetchRiwayat = async (studentId: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/submissions?student_id=${studentId}`);
      if (!res.ok) {
        throw new Error("Gagal memuat riwayat ujian.");
      }
      const data = await res.json();
      const rawSubmissions = (data.submissions as Submission[]) ?? [];
      
      // Group submissions by exam_id, prioritizing graded/submitted status over left-over in_progress sessions
      const dedupedSubsMap: Record<string, Submission> = {};
      rawSubmissions.forEach((sub) => {
        const existing = dedupedSubsMap[sub.exam_id];
        if (!existing) {
          dedupedSubsMap[sub.exam_id] = sub;
        } else {
          const statusPriority = { graded: 3, submitted: 2, in_progress: 1 };
          const currentPrio = statusPriority[sub.status] ?? 0;
          const existingPrio = statusPriority[existing.status] ?? 0;
          if (currentPrio > existingPrio) {
            dedupedSubsMap[sub.exam_id] = sub;
          } else if (currentPrio === existingPrio) {
            const currentDate = new Date(sub.started_at).getTime();
            const existingDate = new Date(existing.started_at).getTime();
            if (currentDate > existingDate) {
              dedupedSubsMap[sub.exam_id] = sub;
            }
          }
        }
      });

      setSubmissions(Object.values(dedupedSubsMap));
    } catch (err: any) {
      console.error("[Fetch Riwayat Error]", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalExams = submissions.length;
  const gradedExams = submissions.filter((s) => s.status === "graded" && s.score !== null);
  const averageScore =
    gradedExams.length > 0
      ? Math.round(gradedExams.reduce((acc, curr) => acc + (curr.score ?? 0), 0) / gradedExams.length)
      : 0;

  const inProgressCount = submissions.filter((s) => s.status === "in_progress").length;
  const submittedCount = submissions.filter((s) => s.status === "submitted").length;

  // Helpers for styling status and scores
  const getScoreBadgeClass = (score: number | null, status: string) => {
    if (status !== "graded" || score === null) {
      return "bg-surface-container-highest text-on-surface-variant";
    }
    if (score >= 80) return "bg-primary-fixed/20 text-primary-fixed border border-primary-fixed/30";
    if (score >= 60) return "bg-warning/20 text-warning border border-warning/30";
    return "bg-error/20 text-error border border-error/30";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_progress":
        return "Sedang Dikerjakan";
      case "submitted":
        return "Menunggu Dinilai";
      case "graded":
        return "Selesai & Dinilai";
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-warning/10 text-warning border border-warning/30";
      case "submitted":
        return "bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/30";
      case "graded":
        return "bg-success-container/20 text-on-success-container border border-success/30";
      default:
        return "bg-surface-container border border-outline-variant";
    }
  };

  if (!student) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-headline-lg text-on-surface mb-2 font-black">Riwayat Ujian</h1>
        <p className="text-body-lg text-on-surface-variant">
          Daftar dan evaluasi nilai ujian yang telah Anda selesaikan di Madrasah.
        </p>
      </div>

      {/* Stats Summary Cards */}
      {!loading && !errorMsg && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-surface-container border border-outline-variant p-6 flex items-center gap-5 transition-transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20 flex items-center justify-center rounded-full">
              <span className="material-symbols-outlined text-2xl">assignment_turned_in</span>
            </div>
            <div>
              <span className="text-label-sm text-outline block uppercase tracking-wider">Total Ujian</span>
              <span className="text-headline-lg font-black text-on-surface block mt-1">{totalExams}</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container border border-outline-variant p-6 flex items-center gap-5 transition-transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-success-container/20 text-on-success-container border border-success/20 flex items-center justify-center rounded-full">
              <span className="material-symbols-outlined text-2xl">insights</span>
            </div>
            <div>
              <span className="text-label-sm text-outline block uppercase tracking-wider">Rata-Rata Nilai</span>
              <span className="text-headline-lg font-black text-on-surface block mt-1">
                {averageScore} <span className="text-body-sm font-normal text-outline">/ 100</span>
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container border border-outline-variant p-6 flex items-center gap-5 transition-transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-warning/10 text-warning border border-warning/20 flex items-center justify-center rounded-full">
              <span className="material-symbols-outlined text-2xl">pending_actions</span>
            </div>
            <div>
              <span className="text-label-sm text-outline block uppercase tracking-wider">Menunggu Penilaian</span>
              <span className="text-headline-lg font-black text-on-surface block mt-1">
                {submittedCount} <span className="text-body-sm font-normal text-outline">sesi</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-surface-container border border-outline-variant p-6 animate-pulse flex justify-between items-center h-24">
              <div className="space-y-2">
                <div className="h-4 bg-outline-variant w-48"></div>
                <div className="h-3 bg-outline-variant w-32"></div>
              </div>
              <div className="h-8 bg-outline-variant w-24"></div>
            </div>
          ))}
        </div>
      ) : errorMsg ? (
        <div className="bg-error/10 border border-error/30 p-6 text-center text-error space-y-3">
          <span className="material-symbols-outlined text-4xl">error</span>
          <p className="font-bold">{errorMsg}</p>
          <button
            onClick={() => fetchRiwayat(student.id)}
            className="bg-error text-white px-6 py-2 text-xs font-bold uppercase tracking-wider"
          >
            Coba Lagi
          </button>
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-surface-container border border-outline-variant p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-surface-container-high border border-outline-variant/60 flex items-center justify-center rounded-full text-outline mb-2">
            <span className="material-symbols-outlined text-3xl">history</span>
          </div>
          <h3 className="text-title-lg font-bold text-on-surface">Belum Ada Riwayat Ujian</h3>
          <p className="text-body-md text-on-surface-variant max-w-sm">
            Anda belum pernah mengambil sesi ujian atau tugas apapun. Silakan periksa halaman Ujian & Tugas aktif.
          </p>
          <Link href="/dashboard/siswa/ujian-tugas" className="bg-primary-fixed text-on-primary-fixed px-6 py-3 font-bold uppercase tracking-wider text-xs shadow-lg hover:shadow-primary-fixed/20 transition-all">
            Mulai Ujian Sekarang
          </Link>
        </div>
      ) : (
        <div className="bg-surface-container border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high border-b border-outline-variant">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-outline">Detail Ujian</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-outline text-center">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-outline text-center">Skor Akhir</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-outline text-center">Tanggal Selesai</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-outline text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {submissions.map((sub) => {
                  const examTitle = sub.exams?.title ?? "Ujian Madrasah";
                  const subject = sub.exams?.subject ?? "—";
                  const formattedDate = sub.completed_at
                    ? new Date(sub.completed_at).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  return (
                    <tr key={sub.id} className="hover:bg-surface-container-high/30 transition-colors">
                      {/* Title & Subject */}
                      <td className="p-4">
                        <div className="font-bold text-on-surface text-body-md">{examTitle}</div>
                        <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">menu_book</span>
                          {subject}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(sub.status)}`}>
                          {getStatusLabel(sub.status)}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="p-4 text-center">
                        {sub.status === "graded" && sub.score !== null ? (
                          <span className={`inline-block px-4 py-1.5 font-mono text-sm font-black ${getScoreBadgeClass(sub.score, sub.status)}`}>
                            {sub.score}
                          </span>
                        ) : sub.status === "submitted" ? (
                          <span className="text-xs text-outline font-bold italic">Essay dinilai Guru</span>
                        ) : (
                          <span className="text-xs text-error font-bold italic">Belum Selesai</span>
                        )}
                      </td>

                      {/* Completed At Date */}
                      <td className="p-4 text-center text-body-sm text-on-surface-variant font-mono">
                        {formattedDate}
                      </td>

                      {/* Action Button */}
                      <td className="p-4 text-right">
                        {sub.status !== "in_progress" ? (
                          <Link
                            href={`/ujian/${sub.exam_id}/hasil?submission_id=${sub.id}`}
                            className="inline-flex items-center gap-1 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant hover:border-primary-fixed/50 px-4 py-2 font-bold text-xs text-on-surface transition-all uppercase tracking-wider"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            Lihat Hasil
                          </Link>
                        ) : (
                          <Link
                            href={`/ujian/${sub.exam_id}/soal`}
                            className="inline-flex items-center gap-1 bg-warning/20 hover:bg-warning/30 border border-warning/40 px-4 py-2 font-bold text-xs text-warning transition-all uppercase tracking-wider"
                          >
                            <span className="material-symbols-outlined text-sm">play_arrow</span>
                            Lanjutkan
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
