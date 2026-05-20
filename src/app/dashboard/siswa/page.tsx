"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  class_name: string | null;
}

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

interface Exam {
  id: string;
  title: string;
  subject: string;
  type: string;
  start_at: string;
  end_at: string;
}

export default function DashboardSiswa() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

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

    const loadData = async () => {
      let activeClassName = userObj.class_name;
      // Sync fresh profile to get updated class_name
      try {
        const userRes = await fetch("/api/users");
        if (userRes.ok) {
          const uData = await userRes.json();
          const freshUser = uData.users?.find((u: any) => u.id === userObj.id);
          if (freshUser) {
            activeClassName = freshUser.class_name;
            const updatedUser = { ...userObj, class_name: freshUser.class_name };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setStudent(updatedUser);
          }
        }
      } catch (err) {
        console.error("Gagal sinkronisasi data santri:", err);
      }

      if (!student) {
        setStudent({ ...userObj, class_name: activeClassName });
      }

      await fetchDashboardData(userObj.id, activeClassName);
    };

    loadData();
  }, [router]);

  const fetchDashboardData = async (studentId: string, className: string | null) => {
    setLoading(true);
    try {
      // 1. Fetch submissions
      const subRes = await fetch(`/api/submissions?student_id=${studentId}`);
      let studentSubs: Submission[] = [];
      if (subRes.ok) {
        const subData = await subRes.json();
        studentSubs = subData.submissions ?? [];

        // Deduplicate submissions (graded > submitted > in_progress)
        const dedupedSubsMap: Record<string, Submission> = {};
        studentSubs.forEach((sub) => {
          const existing = dedupedSubsMap[sub.exam_id];
          if (!existing) {
            dedupedSubsMap[sub.exam_id] = sub;
          } else {
            const statusPriority = { graded: 3, submitted: 2, in_progress: 1 };
            const currentPrio = statusPriority[sub.status] ?? 0;
            const existingPrio = statusPriority[existing.status] ?? 0;
            if (currentPrio > existingPrio) {
              dedupedSubsMap[sub.exam_id] = sub;
            }
          }
        });
        studentSubs = Object.values(dedupedSubsMap);
        setSubmissions(studentSubs);
      }

      // 2. Fetch exams for this class
      if (className) {
        const examRes = await fetch(`/api/exams?class_name=${encodeURIComponent(className)}`);
        if (examRes.ok) {
          const examData = await examRes.json();
          setExams(examData.exams ?? []);
        }
      }
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const completedSubs = submissions.filter((s) => s.status === "submitted" || s.status === "graded");
  const finishedCount = completedSubs.length;

  const activeExamsCount = exams.filter(
    (e) => !submissions.find((s) => s.exam_id === e.id && (s.status === "submitted" || s.status === "graded"))
  ).length;

  const gradedSubs = submissions.filter((s) => s.status === "graded" && s.score !== null);
  const averageScore =
    gradedSubs.length > 0
      ? Math.round((gradedSubs.reduce((acc, curr) => acc + (curr.score ?? 0), 0) / gradedSubs.length) * 10) / 10
      : 0;

  // Last Exam Attempt
  const sortedCompleted = [...completedSubs].sort(
    (a, b) => new Date(b.completed_at || b.started_at).getTime() - new Date(a.completed_at || a.started_at).getTime()
  );
  const lastAttempt = sortedCompleted.length > 0 ? sortedCompleted[0] : null;

  // Generic Initials Avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Performance Rating Level
  const getPerformanceRating = (score: number) => {
    if (score >= 80) return "Sangat Baik (A)";
    if (score >= 60) return "Baik (B)";
    return "Cukup (C)";
  };

  // Completion Rate
  const totalTarget = exams.length;
  const completionRate = totalTarget > 0 ? Math.round((finishedCount / totalTarget) * 100) : 0;

  if (!student) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-headline-lg text-on-surface mb-2 font-black">Dashboard Santri</h1>
        <p className="text-body-lg text-on-surface-variant">
          Ahlan wa Sahlan kembali, raih prestasi terbaikmu hari ini dengan kejujuran.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-surface-container border border-outline-variant p-8 animate-pulse lg:col-span-2 h-72"></div>
          <div className="bg-surface-container border border-outline-variant p-8 animate-pulse h-72"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:col-span-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-surface-container border border-outline-variant p-6 animate-pulse h-28"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Real-time Profile Card */}
          <div className="bg-surface-container border border-outline-variant p-8 flex flex-col justify-between gap-6 lg:col-span-2 relative overflow-hidden group hover:border-primary-fixed/30 transition-all">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              {/* Initials Avatar Grid */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary-fixed/20 to-primary-fixed/40 border-2 border-primary-fixed flex items-center justify-center text-primary-fixed font-black text-3xl shadow-lg">
                {getInitials(student.name)}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-headline-md text-on-surface font-black">{student.name}</h2>
                  <span className="bg-primary-fixed/20 text-primary-fixed text-[10px] px-3 py-1 font-bold rounded-full uppercase tracking-wider self-center">
                    Santri Aktif
                  </span>
                </div>
                <p className="text-body-lg text-on-surface-variant font-mono">{student.email}</p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/30 text-body-md text-on-surface-variant">
                  <div>
                    <span className="text-xs uppercase text-primary-fixed font-bold block">Kelas</span>
                    <span className="text-on-surface font-medium">{student.class_name ?? "Belum Diatur"}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase text-primary-fixed font-bold block">Tahun Akademik</span>
                    <span className="text-on-surface font-medium">2025/2026</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Integrity quote widget */}
            <div className="bg-surface/50 border border-outline-variant/50 p-4 flex items-center gap-3 relative z-10">
              <span className="material-symbols-outlined text-primary-fixed text-2xl select-none">verified_user</span>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                <strong>Prinsip Madrasah:</strong> "Integritas adalah melakukan hal yang benar bahkan ketika tidak ada
                yang melihat." Laksanakan ujian secara mandiri dan jujur!
              </p>
            </div>
          </div>

          {/* Last Exam Result Card */}
          <div className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between gap-6 relative overflow-hidden group hover:border-primary-fixed/30 transition-all">
            {lastAttempt ? (
              <>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs uppercase text-primary-fixed font-bold block">Nilai Terakhir</span>
                      <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-wider">
                        {lastAttempt.status === "graded" ? "Hasil Dinilai" : "Menunggu Hasil"}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-primary-fixed/50 text-2xl select-none">
                      emoji_events
                    </span>
                  </div>

                  <h3 className="text-headline-md text-on-surface font-black mt-2">
                    {lastAttempt.exams?.title ?? "Ujian Madrasah"}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">Mapel: {lastAttempt.exams?.subject ?? "—"}</p>
                </div>

                {/* Graphical Display */}
                <div className="flex items-center gap-4 py-4">
                  <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
                    <svg className="absolute transform -rotate-90 w-full h-full">
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        className="stroke-surface-container-high fill-transparent"
                        strokeWidth="6"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        className="stroke-primary-fixed fill-transparent"
                        strokeWidth="6"
                        strokeDasharray={2 * Math.PI * 34}
                        strokeDashoffset={
                          lastAttempt.score !== null
                            ? 2 * Math.PI * 34 * (1 - lastAttempt.score / 100)
                            : 2 * Math.PI * 34
                        }
                      />
                    </svg>
                    <div className="flex flex-col items-center">
                      <span className="text-headline-md text-on-surface font-black leading-none">
                        {lastAttempt.score ?? "—"}
                      </span>
                      <span className="text-[9px] text-on-surface-variant font-bold leading-none mt-1">/ 100</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-primary-fixed font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-fixed" />
                      Status: {lastAttempt.status === "graded" ? "Lulus Evaluasi" : "Tinjauan Guru"}
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {lastAttempt.score !== null
                        ? `Pencapaian belajar Anda berkategori ${getPerformanceRating(lastAttempt.score)}.`
                        : "Jawaban essay sedang ditinjau & dinilai oleh Guru pengampu."}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-on-surface-variant space-y-3">
                <span className="material-symbols-outlined text-4xl text-outline">history_edu</span>
                <div>
                  <h4 className="text-body-md font-bold text-on-surface">Belum Ada Riwayat</h4>
                  <p className="text-[10px] text-outline mt-1 leading-relaxed">
                    Selesaikan salah satu sesi ujian aktif untuk memunculkan evaluasi nilai terakhir Anda di sini.
                  </p>
                </div>
              </div>
            )}

            <Link
              href="/dashboard/siswa/riwayat"
              className="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-3 text-center rounded text-body-md font-bold transition-all block border border-outline-variant/30 uppercase tracking-wider text-xs"
            >
              Lihat Riwayat Lengkap
            </Link>
          </div>

          {/* Small Bento Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:col-span-3">
            {/* Rata-rata Nilai */}
            <div className="bg-surface-container border border-outline-variant p-6 flex items-center justify-between gap-4 group hover:border-primary-fixed/30 transition-all">
              <div>
                <span className="text-xs uppercase text-on-surface-variant font-bold block">Rata-Rata Nilai</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-headline-lg text-on-surface font-black">{averageScore}</span>
                  <span className="text-[10px] text-outline font-bold">/ 100</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-primary-fixed/40 text-4xl select-none group-hover:text-primary-fixed transition-colors">
                trending_up
              </span>
            </div>

            {/* Ujian Aktif */}
            <Link
              href="/dashboard/siswa/ujian-tugas"
              className="bg-surface-container border border-outline-variant p-6 flex items-center justify-between gap-4 group hover:border-primary-fixed/50 transition-all"
            >
              <div>
                <span className="text-xs uppercase text-on-surface-variant font-bold block">Ujian & Tugas Aktif</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-headline-lg text-primary-fixed font-black">{activeExamsCount}</span>
                  <span className="text-xs text-on-surface-variant font-medium">Tersedia</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-primary-fixed/40 text-4xl select-none group-hover:text-primary-fixed transition-colors">
                assignment
              </span>
            </Link>

            {/* Ujian Selesai */}
            <Link
              href="/dashboard/siswa/riwayat"
              className="bg-surface-container border border-outline-variant p-6 flex items-center justify-between gap-4 group hover:border-primary-fixed/30 transition-all"
            >
              <div>
                <span className="text-xs uppercase text-on-surface-variant font-bold block">Ujian Selesai</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-headline-lg text-on-surface font-black">{finishedCount}</span>
                  <span className="text-xs text-on-surface-variant font-medium">Ujian</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-primary-fixed/40 text-4xl select-none group-hover:text-primary-fixed transition-colors">
                task_alt
              </span>
            </Link>

            {/* Completion Rate / Tingkat Ketercapaian */}
            <div className="bg-surface-container border border-outline-variant p-6 flex items-center justify-between gap-4 group hover:border-primary-fixed/30 transition-all">
              <div>
                <span className="text-xs uppercase text-on-surface-variant font-bold block">Kepatuhan Ujian</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-headline-lg text-on-surface font-black">{completionRate}%</span>
                  <span className="text-xs text-on-surface-variant font-medium">selesai</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-primary-fixed/40 text-4xl select-none group-hover:text-primary-fixed transition-colors">
                workspace_premium
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
