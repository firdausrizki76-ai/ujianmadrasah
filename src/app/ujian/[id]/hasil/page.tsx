"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

interface Submission {
  id: string;
  student_name: string;
  class_name: string;
  exam_title: string;
  subject: string;
  started_at: string;
  completed_at: string;
  score: number;
  status: "in_progress" | "completed" | "graded";
}

interface QuestionDetail {
  id: string;
  question_text: string;
  answer_key: string;
  order_index: number;
  options: string[] | null;
  type: "pilihan_ganda" | "essay";
  student_answer: string;
  is_correct: boolean | null;
}

function HasilUjianContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const examId = params.id as string;
  const submissionId = searchParams.get("submission_id");

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!submissionId) {
      setErrorMsg("ID Sesi Ujian tidak ditemukan di URL. Silakan kembali ke dashboard.");
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/submissions?submission_id=${submissionId}`);
        const data = await res.json();
        
        if (!res.ok) {
          setErrorMsg(data.error ?? "Gagal memuat hasil ujian.");
          return;
        }

        setSubmission(data.submission);
        setQuestions(data.questions);
      } catch (err: any) {
        console.error("[Fetch Results Error]", err);
        setErrorMsg("Terjadi kesalahan jaringan saat memuat hasil.");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [submissionId]);

  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl animate-spin text-primary-fixed">progress_activity</span>
        <p className="text-body-lg font-bold animate-pulse">Memproses & menghitung lembar jawaban...</p>
      </div>
    );
  }

  if (errorMsg || !submission) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center p-8 text-center gap-4">
        <span className="material-symbols-outlined text-6xl text-error">error</span>
        <h3 className="text-headline-md font-bold">Hasil Tidak Ditemukan</h3>
        <p className="text-body-md text-on-surface-variant max-w-md">{errorMsg || "Sesi ujian ini tidak valid."}</p>
        <Link href="/dashboard/siswa/ujian-tugas" className="bg-primary-fixed text-on-primary-fixed px-6 py-3 font-bold">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  // Calculate stats
  const mcQuestions = questions.filter((q) => q.type === "pilihan_ganda");
  const essayQuestions = questions.filter((q) => q.type === "essay");
  
  const correctMc = mcQuestions.filter((q) => q.is_correct === true).length;
  const incorrectMc = mcQuestions.filter((q) => q.is_correct === false).length;
  const unansweredMc = mcQuestions.filter((q) => !q.student_answer).length;

  // Calculate elapsed time
  const start = new Date(submission.started_at).getTime();
  const end = new Date(submission.completed_at || new Date()).getTime();
  const diffMs = Math.max(0, end - start);
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  const durationStr = `${minutes} menit ${seconds} detik`;

  const hasEssay = essayQuestions.length > 0;

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col fixed inset-0 z-[100] overflow-y-auto">
      {/* Header */}
      <header className="bg-surface border-b border-outline-variant sticky top-0 z-50 shrink-0">
        <div className="flex justify-between items-center w-full px-gutter h-16 max-w-container-max-width mx-auto">
          <span className="text-headline-md font-black text-primary-fixed tracking-tight">MTs. Al-Madrasah</span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-on-surface-variant font-bold">
              {submission.student_name} ({submission.class_name})
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-container-max-width mx-auto px-gutter py-12 flex flex-col items-center justify-center">
        {/* Score Hero Section */}
        <div className="w-full text-center mb-12">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary-fixed/10 flex items-center justify-center border-2 border-primary-fixed">
              <span className="material-symbols-outlined text-primary-fixed text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
            </div>
          </div>
          <h1 className="text-headline-lg mb-4 font-black">Alhamdulillah! Ujian Selesai Dikerjakan</h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            Lembar jawaban Anda untuk paket ujian <strong>{submission.exam_title}</strong> mata pelajaran <strong>{submission.subject}</strong> telah berhasil disimpan di server kami.
          </p>
        </div>

        {/* Main Score Card */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Left: Major Result */}
          <div className="lg:col-span-5 bg-surface-container border border-outline-variant p-8 flex flex-col items-center justify-center text-center">
            <span className="text-label-sm text-on-surface-variant uppercase font-black tracking-widest mb-4">SKOR EVALUASI</span>
            <div className="text-4xl lg:text-5xl font-black text-primary-fixed mb-2 font-headline-lg">
              {submission.score ?? 0}/100
            </div>
            <div className="w-full bg-outline-variant h-2.5 mb-8 overflow-hidden rounded-full">
              <div 
                className="bg-primary-fixed h-full transition-all duration-500 rounded-full" 
                style={{ width: `${Math.min(100, Math.max(0, submission.score))}%` }}
              ></div>
            </div>
            <div className="flex flex-col gap-2 w-full text-left">
              <div className="flex justify-between items-center py-3 border-b border-outline-variant/60">
                <span className="text-on-surface-variant font-medium">Status Penilaian</span>
                <span className={`font-black uppercase tracking-wider text-xs px-2.5 py-0.5 ${
                  submission.status === "graded" 
                    ? "bg-green-950/20 text-green-400 border border-green-500/30" 
                    : "bg-yellow-950/20 text-yellow-400 border border-yellow-500/30"
                }`}>
                  {submission.status === "graded" ? "Selesai Dinilai" : "Menunggu Koreksi Essay"}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-outline-variant/60">
                <span className="text-on-surface-variant font-medium">Jenis Pertanyaan</span>
                <span className="text-on-surface font-bold text-xs uppercase">
                  {mcQuestions.length} PG {hasEssay ? `& ${essayQuestions.length} Uraian` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Breakdown Grid */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Correct Answers */}
              <div className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between">
                <div>
                  <span className="material-symbols-outlined text-green-400 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <h3 className="text-on-surface-variant text-label-sm uppercase font-black tracking-wider">Pilihan Ganda Benar</h3>
                </div>
                <div className="text-headline-lg font-black text-green-400 mt-2">{correctMc} Soal</div>
              </div>

              {/* Incorrect Answers */}
              <div className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between">
                <div>
                  <span className="material-symbols-outlined text-error mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
                    cancel
                  </span>
                  <h3 className="text-on-surface-variant text-label-sm uppercase font-black tracking-wider">Pilihan Ganda Salah</h3>
                </div>
                <div className="text-headline-lg font-black text-error mt-2">{incorrectMc} Soal</div>
              </div>

              {/* Time Taken */}
              <div className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between col-span-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="material-symbols-outlined text-tertiary-fixed mb-4">timer</span>
                    <h3 className="text-on-surface-variant text-label-sm uppercase font-black tracking-wider">Durasi Ujian</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-headline-md font-black text-on-surface">{durationStr}</div>
                    {hasEssay && (
                      <div className="text-xs text-yellow-400 font-bold mt-1">Jawaban Uraian Anda sedang ditinjau Ustadz/Ustadzah.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
          <Link href="/dashboard/siswa/ujian-tugas" className="w-full sm:w-auto px-10 py-4 bg-primary-fixed text-on-primary-fixed font-black text-body-md hover:scale-95 transition-transform duration-100 flex items-center justify-center gap-2 text-center select-none uppercase tracking-wider text-xs">
            <span className="material-symbols-outlined text-sm">dashboard</span>
            Kembali ke Dashboard
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-outline-variant text-center shrink-0">
        <p className="text-label-sm text-on-surface-variant">
          © 2026 MTs. Al-Madrasah. Lembar evaluasi CBT madrasah digital terverifikasi.
        </p>
      </footer>
    </div>
  );
}

export default function HasilUjian() {
  return (
    <Suspense fallback={
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl animate-spin text-primary-fixed">progress_activity</span>
        <p className="text-body-lg font-bold animate-pulse">Menyiapkan halaman hasil...</p>
      </div>
    }>
      <HasilUjianContent />
    </Suspense>
  );
}
