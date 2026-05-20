"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Exam = {
  id: string;
  title: string;
  subject: string;
  type: string;
  duration_minutes: number;
  total_questions: number;
  start_at: string;
  end_at: string;
  class_name: string;
  teacher_name: string;
  instructions?: string;
  session_id?: string | null;
  exam_sessions?: { name: string; start_time: string; end_time: string } | null;
};

type StudentInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
  class_name: string | null;
  subject: string | null;
  session_id?: string | null;
};

interface Submission {
  id: string;
  exam_id: string;
  started_at: string;
  completed_at: string;
  score: number;
  status: "in_progress" | "completed" | "graded";
}

export default function UjianTugasSiswa() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudentExams = async (className: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams?class_name=${encodeURIComponent(className)}`);
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentSubmissions = async (studentId: string) => {
    try {
      const res = await fetch(`/api/submissions?student_id=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        const rawSubmissions = (data.submissions as Submission[]) ?? [];
        
        // Group submissions by exam_id, prioritizing graded/submitted status over left-over in_progress sessions
        const dedupedSubsMap: Record<string, Submission> = {};
        rawSubmissions.forEach((sub) => {
          const existing = dedupedSubsMap[sub.exam_id];
          if (!existing) {
            dedupedSubsMap[sub.exam_id] = sub;
          } else {
            const statusPriority = { graded: 3, completed: 3, submitted: 2, in_progress: 1 };
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
      }
    } catch (err) {
      console.error("Gagal sinkronisasi riwayat ujian:", err);
    }
  };

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

    const syncProfileAndFetchExams = async () => {
      let activeClassName = userObj.class_name;
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          const freshUser = data.users?.find((u: any) => u.id === userObj.id);
          if (freshUser) {
            activeClassName = freshUser.class_name;
            const updatedUser = {
              ...userObj,
              class_name: freshUser.class_name,
              subject: freshUser.subject,
              session_id: freshUser.session_id,
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setStudent(updatedUser);
          }
        }
      } catch (err) {
        console.error("Gagal sinkronisasi data santri:", err);
      }

      // Fallback/Set state in case fetch failed or succeeded
      if (!student) {
        setStudent({
          ...userObj,
          class_name: activeClassName,
          session_id: userObj.session_id || null,
        });
      }

      const fetchSessions = async () => {
        try {
          const res = await fetch("/api/sessions");
          if (res.ok) {
            const data = await res.json();
            setSessions(data.sessions ?? []);
          }
        } catch {
          // silently fail
        }
      };

      if (activeClassName) {
        await fetchStudentExams(activeClassName);
      }
      await fetchSessions();
      await fetchStudentSubmissions(userObj.id);
    };

    syncProfileAndFetchExams();
  }, [router]);

  if (!student) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-headline-lg text-on-surface mb-2 font-black">Ujian dan Tugas Santri</h1>
        <p className="text-body-lg text-on-surface-variant">
          Daftar ujian dan tugas untuk kelas <strong className="text-primary-fixed">{student.class_name ?? "Belum Ditentukan"}</strong> yang aktif dan dapat dikerjakan.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-5xl animate-spin text-primary-fixed">progress_activity</span>
          <p>Memuat daftar ujian aktif...</p>
        </div>
      ) : !student.class_name ? (
        <div className="bg-surface-container border border-outline-variant p-8 rounded text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl text-warning mb-2">warning</span>
          <h3 className="text-headline-sm font-bold text-on-surface">Kelas Anda Belum Diatur</h3>
          <p className="text-body-md mt-1">Silakan hubungi Ustadz/Ustadzah atau Admin Madrasah untuk mendaftarkan Anda ke kelas agar dapat melihat ujian.</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant bg-surface-container border border-outline-variant flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-5xl">assignment_late</span>
          <div>
            <h4 className="text-headline-md font-bold text-on-surface">Belum Ada Ujian / Tugas</h4>
            <p className="text-body-sm text-on-surface-variant mt-1">Tidak ada ujian atau tugas yang aktif ditujukan untuk {student.class_name} saat ini.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {exams.map((exam) => {
            const now = new Date();
            const start = new Date(exam.start_at);
            const end = new Date(exam.end_at);
            const examSub = submissions.find((s) => s.exam_id === exam.id);
            const isCompleted = examSub && (examSub.status === "completed" || examSub.status === "graded");
            const isInProgress = examSub && examSub.status === "in_progress";
            const isLive = now >= start && now <= end;
            const isPast = now > end;
            const isFuture = now < start;

            const isMismatchedSession = exam.session_id && student.session_id && exam.session_id !== student.session_id;
            const studentSession = sessions.find((s) => s.id === student.session_id);

            return (
              <div
                key={exam.id}
                className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between gap-6 relative overflow-hidden group hover:border-primary-fixed/50 transition-all"
              >
                {/* Header info */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-primary-fixed/20 text-primary-fixed px-2.5 py-0.5 rounded font-black uppercase tracking-wider">
                        {exam.subject}
                      </span>
                      <span className="text-[10px] border border-outline-variant text-on-surface-variant px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        {exam.type === "tugas" ? "Tugas / PR" : "Ujian Utama"}
                      </span>
                      {exam.exam_sessions?.name && (
                        <span className="text-[10px] bg-primary-fixed text-on-primary-fixed px-2.5 py-0.5 rounded font-black uppercase tracking-wider">
                          {exam.exam_sessions.name} ({exam.exam_sessions.start_time.substring(0, 5)} - {exam.exam_sessions.end_time.substring(0, 5)})
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[10px] bg-green-500 text-black px-2.5 py-0.5 rounded font-black uppercase tracking-wider">
                          Selesai (Skor: {examSub.score ?? 0})
                        </span>
                      )}
                      {isInProgress && (
                        <span className="text-[10px] bg-yellow-500 text-black px-2.5 py-0.5 rounded font-black uppercase tracking-wider animate-pulse">
                          Sedang Dikerjakan
                        </span>
                      )}
                      {!examSub && isLive && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                          Tersedia
                        </span>
                      )}
                      {!examSub && isFuture && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          Terjadwal
                        </span>
                      )}
                      {!examSub && isPast && (
                        <span className="text-[10px] bg-surface-container-highest text-on-surface-variant px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          Berakhir
                        </span>
                      )}
                    </div>
                    <h3 className="text-headline-md text-on-surface group-hover:text-primary-fixed transition-colors font-bold">
                      {exam.title}
                    </h3>
                    <p className="text-body-md text-on-surface-variant">Pengampu: {exam.teacher_name}</p>
                    {exam.instructions && (
                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 bg-surface-container-high/40 p-2 border border-outline-variant/30 font-sans italic">
                        Petunjuk: {exam.instructions}
                      </p>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-primary-fixed/40 text-4xl group-hover:text-primary-fixed transition-colors select-none">
                    {exam.type === "tugas" ? "assignment" : "auto_stories"}
                  </span>
                </div>

                {/* Middle Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-b border-outline-variant/30 py-4 text-body-md text-on-surface-variant font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary-fixed">schedule</span>
                    <span>{exam.duration_minutes} Menit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary-fixed">quiz</span>
                    <span>{exam.total_questions} Soal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-error">event_busy</span>
                    <span className="text-error">
                      Batas: {end.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Bottom Button */}
                <div className="flex items-center justify-between gap-4 mt-2">
                  <div className="text-label-sm text-on-surface-variant font-bold">
                    Mulai: {start.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>

                  {isCompleted ? (
                    <Link
                      href={`/ujian/${exam.id}/hasil?submission_id=${examSub.id}`}
                      className="bg-green-500 hover:bg-green-600 text-black px-6 py-3 font-black transition-all flex items-center gap-2"
                    >
                      Lihat Hasil <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                    </Link>
                  ) : isMismatchedSession ? (
                    <button
                      disabled
                      className="bg-red-950/40 text-red-400 border border-red-500/30 px-6 py-3 font-black flex items-center gap-2 cursor-not-allowed text-xs"
                    >
                      Bukan Sesi Anda ({studentSession?.name ?? "Sesi Lain"})
                      <span className="material-symbols-outlined text-sm">lock</span>
                    </button>
                  ) : isInProgress ? (
                    <Link
                      href={`/ujian/${exam.id}/soal`}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 font-black transition-all flex items-center gap-2"
                    >
                      Lanjutkan <span className="material-symbols-outlined text-sm">forward</span>
                    </Link>
                  ) : isLive ? (
                    <Link
                      href={`/ujian/${exam.id}/soal`}
                      className="bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim px-6 py-3 font-black transition-all flex items-center gap-2"
                    >
                      Mulai Ujian <span className="material-symbols-outlined text-sm">play_arrow</span>
                    </Link>
                  ) : isFuture ? (
                    <button
                      disabled
                      className="bg-surface-container-highest text-on-surface-variant/40 px-6 py-3 font-black flex items-center gap-2 cursor-not-allowed border border-outline-variant"
                    >
                      Belum Dibuka <span className="material-symbols-outlined text-sm">lock</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="bg-surface-container-highest text-on-surface-variant/40 px-6 py-3 font-black flex items-center gap-2 cursor-not-allowed border border-outline-variant"
                    >
                      Waktu Habis <span className="material-symbols-outlined text-sm">lock_clock</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
