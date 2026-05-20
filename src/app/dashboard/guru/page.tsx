"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Stats = {
  totalStudents: number;
  totalExams: number;
  activeExams: number;
  totalQuestions: number;
  averageScore: number;
};

type Submission = {
  id: string;
  student_name: string;
  class_name: string;
  exam_title: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  status: string;
};

type TeacherInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
  subject: string | null;
};

export default function DashboardGuru() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalExams: 0,
    activeExams: 0,
    totalQuestions: 0,
    averageScore: 0,
  });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get teacher session from localStorage
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

    // 2. Fetch stats from API
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/guru/stats?teacher_id=${userObj.id}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setSubmissions(data.recentSubmissions ?? []);
        }
      } catch (err) {
        console.error("Gagal memuat stats guru:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (loading || !teacher) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl animate-spin text-primary-fixed">
          progress_activity
        </span>
        <p className="text-body-lg font-medium">Memuat data dashboard guru...</p>
      </div>
    );
  }

  const teacherSalutation = teacher.subject?.toLowerCase().includes("ustadz") 
    ? "" 
    : teacher.name.toLowerCase().includes("ustadz") || teacher.name.toLowerCase().includes("ustadah") || teacher.name.toLowerCase().includes("ustadzah")
      ? ""
      : "Ustadz / Ustadzah ";

  return (
    <div className="max-w-container-max-width mx-auto space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-headline-lg text-on-surface font-black">
          Dashboard Guru
        </h1>
        <p className="text-body-lg text-on-surface-variant mt-1">
          Selamat datang kembali, <span className="text-primary-fixed font-bold">{teacherSalutation}{teacher.name}</span>. 
          {teacher.subject ? ` Pengampu Mata Pelajaran ${teacher.subject}.` : " Pengampu mata pelajaran di madrasah."}
        </p>
      </div>

      {/* Quick Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Siswa */}
        <div className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between hover:border-primary-fixed/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-black">Total Siswa</span>
            <span className="material-symbols-outlined text-primary-fixed">group</span>
          </div>
          <div className="mt-4">
            <h3 className="text-headline-lg text-primary-fixed font-black leading-none">{stats.totalStudents}</h3>
            <p className="text-label-sm text-on-surface-variant mt-1">Terdaftar Aktif</p>
          </div>
        </div>

        {/* Card 2: Ujian Berlangsung */}
        <div className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between hover:border-primary-fixed/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-black">Ujian Aktif</span>
            <span className="material-symbols-outlined text-primary-fixed">pending_actions</span>
          </div>
          <div className="mt-4">
            <h3 className="text-headline-lg text-primary-fixed font-black leading-none">{stats.activeExams}</h3>
            <p className="text-label-sm text-on-surface-variant mt-1">Sesi Sedang Aktif</p>
          </div>
        </div>

        {/* Card 3: Total Soal */}
        <div className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between hover:border-primary-fixed/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-black">Bank Soal Anda</span>
            <span className="material-symbols-outlined text-primary-fixed">library_books</span>
          </div>
          <div className="mt-4">
            <h3 className="text-headline-lg text-primary-fixed font-black leading-none">{stats.totalQuestions}</h3>
            <p className="text-label-sm text-on-surface-variant mt-1">Butir Pertanyaan Dibuat</p>
          </div>
        </div>

        {/* Card 4: Rata-rata Nilai */}
        <div className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between hover:border-primary-fixed/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-black">Rata-rata Nilai</span>
            <span className="material-symbols-outlined text-primary-fixed">analytics</span>
          </div>
          <div className="mt-4">
            <h3 className="text-headline-lg text-primary-fixed font-black leading-none">
              {stats.averageScore > 0 ? `${stats.averageScore}` : "—"}
            </h3>
            <p className="text-label-sm text-on-surface-variant mt-1">Dari Sesi Ujian Selesai</p>
          </div>
        </div>
      </div>

      {/* Bento Grid Visuals & Graphs */}
      <div className="grid grid-cols-12 gap-6">
        {/* Chart Card */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant p-8 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-headline-md text-on-surface font-bold">Statistik Sebaran Soal & Aktivitas</h3>
                <p className="text-label-sm text-on-surface-variant">Gambaran umum bank soal dan kelas aktif pengampu</p>
              </div>
              <span className="bg-primary-fixed/10 text-primary-fixed text-label-sm px-3 py-1 font-bold">Real-time</span>
            </div>

            {/* Graph Visualization */}
            {stats.totalExams > 0 ? (
              <div className="h-64 flex items-end gap-6 pt-6 border-b border-outline-variant">
                {[
                  { label: "Total Siswa", val: stats.totalStudents, max: 500, color: "bg-primary-fixed" },
                  { label: "Ujian Dibuat", val: stats.totalExams, max: 10, color: "bg-primary-fixed-dim" },
                  { label: "Jumlah Soal", val: stats.totalQuestions, max: 100, color: "bg-primary-fixed" },
                  { label: "Ujian Aktif", val: stats.activeExams, max: 5, color: "bg-outline" },
                ].map((item, idx) => {
                  const percent = Math.min(100, Math.max(15, (item.val / item.max) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <span className="text-[10px] font-bold text-primary-fixed opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.val}
                      </span>
                      <div 
                        className={`w-full rounded-t-sm transition-all duration-500 group-hover:brightness-125 ${item.color}`}
                        style={{ height: `${percent}%` }}
                      />
                      <span className="text-label-sm text-on-surface-variant mt-2 whitespace-nowrap truncate w-full text-center">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center border border-dashed border-outline-variant/60 gap-3 text-on-surface-variant p-6 text-center">
                <span className="material-symbols-outlined text-4xl text-primary-fixed/50">bar_chart</span>
                <div>
                  <h4 className="text-body-md font-bold text-on-surface">Grafik Analisis Belum Tersedia</h4>
                  <p className="text-xs max-w-sm mt-1 mx-auto">
                    Grafik otomatis aktif setelah Anda menjadwalkan ujian pertama dan siswa mulai menjawab soal.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions (Bento Card High Contrast) */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-high border-2 border-primary-fixed p-8 flex flex-col justify-between">
          <div>
            <span className="bg-primary-fixed text-on-primary-fixed text-[10px] px-2.5 py-1 font-bold uppercase tracking-wider mb-4 inline-block">
              Aksi Cepat
            </span>
            <h3 className="text-headline-md text-on-surface font-bold mt-2">Mulai Ujian Baru</h3>
            <p className="text-body-md text-on-surface-variant mt-2">
              Jadwalkan sesi ujian, acak bank soal Anda, dan buat token masuk ujian santri secara instan.
            </p>
          </div>
          <a 
            href="/dashboard/guru/ujian" 
            className="mt-8 bg-primary-fixed text-on-primary-fixed py-4 text-center rounded-none font-bold hover:bg-primary-fixed-dim transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Jadwalkan Sesi Ujian
          </a>
        </div>

        {/* Live Student Progress Tracker or Recent Submissions */}
        <div className="col-span-12 bg-surface-container border border-outline-variant p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-headline-md text-on-surface font-bold">Riwayat Pengumpulan Ujian</h3>
              <p className="text-label-sm text-on-surface-variant">Siswa yang baru saja mengumpulkan jawaban untuk mata pelajaran Anda</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-primary-fixed animate-pulse mr-1"></span>
              <span className="text-label-sm text-on-surface font-bold uppercase tracking-wider">Terhubung Live</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {submissions.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant border border-dashed border-outline-variant/60 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary-fixed/40">assignment_turned_in</span>
                <div>
                  <h4 className="text-body-md font-bold text-on-surface">Belum ada Pengumpulan</h4>
                  <p className="text-xs mt-1">Setelah santri Anda menyelesaikan ujiannya, nama dan nilai mereka akan langsung tampil di sini.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wider">
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Nama Ujian</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Skor Perolehan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-body-md">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-surface-container-high transition-colors">
                      <td className="py-4 px-4 font-bold text-on-surface">{sub.student_name}</td>
                      <td className="py-4 px-4 text-on-surface-variant">{sub.class_name}</td>
                      <td className="py-4 px-4 text-on-surface-variant font-medium">{sub.exam_title}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 font-bold text-xs rounded-full uppercase tracking-wider ${
                          sub.status === "selesai" || sub.status === "dinilai"
                            ? "bg-green-900/20 text-green-400"
                            : "bg-blue-900/20 text-blue-400"
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-black text-primary-fixed">
                        {sub.score !== null ? `${sub.score}` : "Belum Dinilai"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
