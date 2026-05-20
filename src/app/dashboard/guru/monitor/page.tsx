"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type ActiveSession = {
  id: string;
  student_name: string;
  class_name: string;
  exam_id: string;
  exam_title: string;
  subject: string;
  duration_minutes: number;
  started_at: string;
  cheat_attempts: number;
  status: string;
};

type TeacherInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
  subject: string | null;
};

type Exam = {
  id: string;
  title: string;
  subject: string;
  class_name: string;
};

export default function MonitorUjian() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-refresh interval (5 seconds)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Time tick interval (1 second to update elapsed/remaining times)
  const [timeTicker, setTimeTicker] = useState(0);

  const fetchExams = async (teacherId: string) => {
    try {
      const res = await fetch(`/api/exams?teacher_id=${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams ?? []);
      }
    } catch (err) {
      console.error("Gagal mengambil daftar ujian:", err);
    }
  };

  const fetchActiveSessions = async (teacherId: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch(`/api/submissions/active?teacher_id=${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.active_sessions ?? []);
      }
    } catch (err) {
      console.error("Gagal mengambil sesi aktif:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/");
      return;
    }
    const userObj = JSON.parse(userStr) as TeacherInfo;
    if (userObj.role !== "guru") {
      router.push("/");
      return;
    }
    setTeacher(userObj);
    fetchExams(userObj.id);
    fetchActiveSessions(userObj.id);

    // Set up auto-refresh every 5 seconds
    refreshIntervalRef.current = setInterval(() => {
      fetchActiveSessions(userObj.id, true);
    }, 5000);

    // Set up local time ticker for live clock updates
    const ticker = setInterval(() => {
      setTimeTicker((prev) => prev + 1);
    }, 1000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      clearInterval(ticker);
    };
  }, [router]);

  const handleForceSubmit = async (sessionId: string, studentName: string) => {
    const confirmAction = confirm(
      `Apakah Anda yakin ingin memaksa mengumpulkan ujian siswa "${studentName}"?\nSesi ujian siswa akan langsung ditutup dan lembar jawaban yang tersimpan akan langsung dinilai.`
    );
    if (!confirmAction) return;

    try {
      const res = await fetch("/api/submissions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: sessionId,
          answers: {}, // Empty answers payload to force submit current progress
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Ujian siswa "${studentName}" berhasil dipaksa kumpul.`);
        if (teacher) fetchActiveSessions(teacher.id, true);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error ?? "Gagal memaksa mengumpulkan ujian.");
        setTimeout(() => setErrorMsg(""), 4000);
      }
    } catch {
      setErrorMsg("Terjadi kesalahan koneksi.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleReactivate = async (sessionId: string, studentName: string) => {
    const confirmAction = confirm(
      `Apakah Anda yakin ingin mengaktifkan kembali siswa "${studentName}"?\nSemua jawaban sebelumnya akan dihapus dan siswa dapat masuk kembali ke ujian dengan waktu yang direset.`
    );
    if (!confirmAction) return;

    try {
      const res = await fetch("/api/submissions/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: sessionId,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Siswa "${studentName}" berhasil diaktifkan kembali.`);
        if (teacher) fetchActiveSessions(teacher.id, true);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error ?? "Gagal mengaktifkan kembali.");
        setTimeout(() => setErrorMsg(""), 4000);
      }
    } catch {
      setErrorMsg("Terjadi kesalahan koneksi.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  // Helper to compute time remaining/elapsed dynamically
  const getTimeMetrics = (startedAt: string, durationMinutes: number) => {
    const startedTime = new Date(startedAt).getTime();
    const nowTime = new Date().getTime();
    const elapsedSeconds = Math.floor((nowTime - startedTime) / 1000);
    const totalDurationSeconds = durationMinutes * 60;
    const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

    const formatTime = (totalSeconds: number) => {
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      if (h > 0) {
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      }
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return {
      elapsedStr: formatTime(elapsedSeconds),
      remainingStr: remainingSeconds > 0 ? formatTime(remainingSeconds) : "Waktu Habis",
      isOvertime: remainingSeconds <= 0,
    };
  };

  if (!teacher) return null;

  // Filter sessions based on selection
  const filteredSessions = selectedExamId
    ? sessions.filter((s) => s.exam_id === selectedExamId)
    : [];

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  // Stats summary counts for the selected exam
  const totalStudents = filteredSessions.length;
  const highRiskStudents = filteredSessions.filter((s) => s.cheat_attempts > 0).length;
  const safeStudents = totalStudents - highRiskStudents;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-2 font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-primary-fixed">monitoring</span>
            Monitor Ujian Live
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Pantau seluruh santri yang sedang mengerjakan ujian secara langsung dan real-time.
          </p>
        </div>
        
        {selectedExamId && (
          <div className="flex items-center gap-3">
            {refreshing && (
              <span className="text-xs text-on-surface-variant flex items-center gap-1 animate-pulse">
                <span className="material-symbols-outlined text-sm animate-spin text-primary-fixed">progress_activity</span>
                Sinkronisasi...
              </span>
            )}
            <button
              onClick={() => fetchActiveSessions(teacher.id)}
              className="px-4 py-2 bg-surface-container border border-outline-variant hover:border-primary-fixed/50 hover:text-primary-fixed font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh Manual
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-primary-fixed/10 border border-primary-fixed/30 text-primary-fixed px-4 py-3 flex items-center gap-2 text-sm font-bold animate-fadeIn">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-error/10 border border-error/30 text-error px-4 py-3 flex items-center gap-2 text-sm font-bold animate-fadeIn">
          <span className="material-symbols-outlined text-base">error</span>
          {errorMsg}
        </div>
      )}

      {/* Exam Selection Bar */}
      <div className="bg-surface-container border border-outline-variant p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed text-2xl">filter_list</span>
          <div>
            <h4 className="text-sm font-bold text-on-surface">Pilih Sesi Ujian</h4>
            <p className="text-xs text-on-surface-variant">Filter tampilan berdasarkan paket ujian aktif</p>
          </div>
        </div>
        <div className="w-full sm:w-80">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full bg-surface border border-outline-variant text-on-surface text-sm px-3 py-2 outline-none focus:border-primary-fixed font-medium rounded cursor-pointer"
          >
            <option value="">— Pilih Ujian Terlebih Dahulu —</option>
            {exams.map((ex) => {
              // Count active sessions for this exam
              const count = sessions.filter((s) => s.exam_id === ex.id).length;
              return (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.class_name}) [{count} Aktif]
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {!selectedExamId ? (
        /* Empty State: Prompt teacher to choose an exam */
        <div className="bg-surface-container border border-outline-variant rounded-lg p-12 text-center max-w-xl mx-auto space-y-6 my-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary-fixed/10 flex items-center justify-center text-primary-fixed">
            <span className="material-symbols-outlined text-4xl">assignment</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-on-surface">Silakan Pilih Paket Ujian</h3>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto">
              Untuk mengelola dan memantau ratusan ujian secara efektif, pilih salah satu paket ujian dari menu pilihan di atas untuk memantau aktivitas pengerjaan santri secara langsung.
            </p>
          </div>
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 text-xs text-primary-fixed bg-primary-fixed/5 border border-primary-fixed/20 px-3 py-1.5 font-bold">
              <span className="material-symbols-outlined text-sm animate-pulse">info</span>
              Total {exams.length} paket ujian terdaftar di akun Anda
            </div>
          </div>
        </div>
      ) : (
        /* Active Exam Monitor Interface */
        <div className="space-y-8 animate-fadeIn">
          {/* Live Stats Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface-container border border-outline-variant p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Siswa Aktif Ujian
                </span>
                <span className="text-headline-lg font-black text-on-surface leading-none">{totalStudents}</span>
              </div>
              <span className="material-symbols-outlined text-4xl text-blue-400 bg-blue-500/10 p-3 rounded">
                groups
              </span>
            </div>

            <div className="bg-surface-container border border-outline-variant p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Terdeteksi Curang
                </span>
                <span className={`text-headline-lg font-black leading-none ${highRiskStudents > 0 ? "text-error" : "text-on-surface"}`}>
                  {highRiskStudents}
                </span>
              </div>
              <span className={`material-symbols-outlined text-4xl p-3 rounded ${
                highRiskStudents > 0 ? "text-error bg-error/10 animate-pulse" : "text-on-surface-variant bg-surface-container-high"
              }`}>
                warning
              </span>
            </div>

            <div className="bg-surface-container border border-outline-variant p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Sesi Aman & Jujur
                </span>
                <span className="text-headline-lg font-black text-green-400 leading-none">{safeStudents}</span>
              </div>
              <span className="material-symbols-outlined text-4xl text-green-400 bg-green-500/10 p-3 rounded">
                verified_user
              </span>
            </div>
          </div>

          {/* Active Session Monitoring List */}
          <div className="bg-surface-container border border-outline-variant overflow-hidden">
            <div className="p-4 border-b border-outline-variant bg-surface-container-high flex justify-between items-center">
              <h3 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                Sesi Ujian Aktif: {selectedExam?.title} ({selectedExam?.class_name})
              </h3>
              <span className="text-xs text-on-surface-variant">Auto-update setiap 5 detik</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-5xl animate-spin text-primary-fixed">progress_activity</span>
                <p>Menghubungkan ke monitor ujian...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant">desktop_access_disabled</span>
                <div>
                  <h4 className="text-headline-md font-bold text-on-surface">Tidak Ada Siswa Aktif</h4>
                  <p className="text-body-sm text-on-surface-variant mt-1">Saat ini tidak ada siswa kelas ini yang sedang membuka/mengerjakan paket ujian ini.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-on-surface-variant text-xs uppercase font-bold tracking-wider">
                      <th className="text-left p-4">Nama Siswa</th>
                      <th className="text-left p-4">Kelas</th>
                      <th className="text-left p-4">Mata Pelajaran</th>
                      <th className="text-center p-4">Durasi Ujian</th>
                      <th className="text-center p-4">Waktu Berjalan</th>
                      <th className="text-center p-4">Sisa Waktu</th>
                      <th className="text-center p-4">Kecurangan (Tab Switch)</th>
                      <th className="text-right p-4">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((sub, i) => {
                      const { elapsedStr, remainingStr, isOvertime } = getTimeMetrics(sub.started_at, sub.duration_minutes);

                      // Formatting warning badge for cheating attempts
                      let cheatBadge = "bg-green-500/20 text-green-400 border border-green-500/30";
                      let cheatLabel = "Aman (0)";
                      
                      if (sub.status === "completed" || sub.status === "graded") {
                        if (sub.cheat_attempts >= 3) {
                          cheatBadge = "bg-red-950/60 text-red-400 border border-red-500/30 animate-pulse";
                          cheatLabel = `Diskualifikasi (${sub.cheat_attempts})`;
                        } else {
                          cheatBadge = "bg-green-950/40 text-green-400 border border-green-500/30";
                          cheatLabel = "Selesai";
                        }
                      } else {
                        if (sub.cheat_attempts === 1) {
                          cheatBadge = "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
                          cheatLabel = "Peringatan (1)";
                        } else if (sub.cheat_attempts === 2) {
                          cheatBadge = "bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse";
                          cheatLabel = "Bahaya (2)";
                        } else if (sub.cheat_attempts >= 3) {
                          cheatBadge = "bg-red-500/20 text-red-400 border border-red-500/30 animate-ping duration-1000";
                          cheatLabel = `Terkunci (${sub.cheat_attempts})`;
                        }
                      }

                      return (
                        <tr
                          key={sub.id}
                          className={`border-b border-outline-variant/40 hover:bg-surface-container-high transition-colors ${
                            i % 2 === 0 ? "" : "bg-surface/30"
                          } ${sub.cheat_attempts >= 2 ? "bg-red-500/5 hover:bg-red-500/10" : ""}`}
                        >
                          <td className="p-4 font-bold text-on-surface">
                            <div className="flex flex-col">
                              <span>{sub.student_name}</span>
                              <span className="text-[10px] text-on-surface-variant font-normal">Sesi ID: {sub.id.substring(0, 8)}...</span>
                            </div>
                          </td>
                          <td className="p-4 text-on-surface-variant font-medium">{sub.class_name}</td>
                          <td className="p-4 text-on-surface font-medium">{sub.subject}</td>
                          <td className="p-4 text-center text-on-surface-variant">{sub.duration_minutes} Menit</td>
                          <td className="p-4 text-center font-mono font-medium text-on-surface">{elapsedStr}</td>
                          <td className={`p-4 text-center font-mono font-bold text-sm ${isOvertime ? "text-error" : "text-primary-fixed"}`}>
                            {remainingStr}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${cheatBadge}`}>
                              {cheatLabel}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              {sub.status === "in_progress" && (
                                <button
                                  onClick={() => handleForceSubmit(sub.id, sub.student_name)}
                                  className="px-3 py-1.5 bg-error text-on-error font-bold text-xs hover:bg-error-dim transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">gavel</span>
                                  Paksa Kumpul
                                </button>
                              )}
                              {(sub.status !== "in_progress" || sub.cheat_attempts >= 3) && (
                                <button
                                  onClick={() => handleReactivate(sub.id, sub.student_name)}
                                  className="px-3 py-1.5 bg-primary-fixed text-on-primary-fixed font-bold text-xs hover:bg-primary-fixed-dim transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">replay</span>
                                  Aktifkan Kembali
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
