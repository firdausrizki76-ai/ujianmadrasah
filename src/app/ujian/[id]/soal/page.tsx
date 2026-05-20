"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Question {
  id: string;
  question_text: string;
  answer_key: string;
  order_index: number;
  options: string[] | null;
  type: "pilihan_ganda" | "essay";
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  duration_minutes: number;
  instructions?: string;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  class_name: string | null;
}

/**
 * Utility to parse and render LaTeX equations in text (delimited by $$)
 */
function renderMathInText(htmlStr: string): string {
  if (!htmlStr) return "";
  const parts = htmlStr.split("$$");
  return parts
    .map((part, idx) => {
      if (idx % 2 === 1) {
        try {
          return katex.renderToString(part, {
            throwOnError: false,
            displayMode: false,
          });
        } catch (err) {
          console.error("KaTeX Error:", err);
          return part;
        }
      }
      return part;
    })
    .join("");
}

export default function SoalUjian() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissionId, setSubmissionId] = useState<string>("");
  
  // State Management
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Modals & UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Anti-Cheat / Lockdown States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cheatAttempts, setCheatAttempts] = useState(0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);

  // Submit Exam Handler (autoSubmit) declared early to avoid hoisting issues
  const autoSubmitExam = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/submissions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          answers,
        }),
      });
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      router.push(`/ujian/${examId}/hasil?submission_id=${submissionId}`);
    } catch {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      router.push(`/ujian/${examId}/hasil?submission_id=${submissionId}`);
    }
  }, [submitting, submissionId, answers, examId, router]);

  // 1. Initial Authentication and Data Loading
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

    const initExamSession = async () => {
      try {
        // A. Start / Resume the Submission Session
        const startRes = await fetch("/api/submissions/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: userObj.id,
            exam_id: examId,
          }),
        });

        const startData = await startRes.json();
        if (!startRes.ok) {
          setErrorMsg(startData.error ?? "Gagal menginisialisasi sesi ujian.");
          setLoading(false);
          return;
        }

        const submission = startData.submission;
        setSubmissionId(submission.id);
        setCheatAttempts(submission.cheat_attempts || 0);

        if (submission.cheat_attempts >= 3) {
          setErrorMsg("Ujian Anda telah dikunci karena Anda terdeteksi melakukan tindakan kecurangan (berganti tab/aplikasi) sebanyak 3 kali. Silakan hubungi Guru Pengampu Anda untuk membukanya kembali.");
          setLoading(false);
          return;
        }

        if (submission.status !== "in_progress") {
          // Student already completed this exam
          router.push(`/ujian/${examId}/hasil?submission_id=${submission.id}`);
          return;
        }

        // B. Fetch Exam Info
        const examRes = await fetch(`/api/exams?exam_id=${examId}`);
        if (!examRes.ok) throw new Error("Gagal mengambil info ujian.");
        const examData = await examRes.json();
        const activeExam = examData.exam as Exam;
        setExam(activeExam);

        // C. Fetch Questions
        const qRes = await fetch(`/api/questions?exam_id=${examId}`);
        if (!qRes.ok) throw new Error("Gagal mengambil butir pertanyaan.");
        const qData = await qRes.json();
        const activeQuestions = qData.questions as Question[];
        setQuestions(activeQuestions);

        // D. Calculate Remaining Time based on started_at
        const durationMinutes = activeExam.duration_minutes ?? 60;
        const startedTime = new Date(submission.started_at).getTime();
        const nowTime = new Date().getTime();
        const elapsedSeconds = Math.floor((nowTime - startedTime) / 1000);
        const remainingSeconds = Math.max(0, durationMinutes * 60 - elapsedSeconds);
        setTimeLeft(remainingSeconds);

      } catch (err: any) {
        console.error("[CBT Setup Error]", err);
        setErrorMsg(err.message || "Gagal memuat ujian.");
      } finally {
        setLoading(false);
      }
    };

    initExamSession();
  }, [examId, router]);

  // Fullscreen Mode and Anti-Cheat Event Listeners
  const enterFullscreen = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Fullscreen Request Failed:", err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    // Only detect cheating if the exam is loaded, active, and not currently submitting
    if (!submissionId || submitting || loading || questions.length === 0) return;

    let timeoutId: NodeJS.Timeout;

    const handleCheatDetected = () => {
      // Small debounce/delay to avoid double-triggering or triggering during transitions
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Log cheat attempt to database
        fetch("/api/submissions/cheat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission_id: submissionId }),
        }).catch((err) => console.error("Failed to log cheat attempt:", err));

        setCheatAttempts((prev) => {
          const nextVal = prev + 1;
          if (nextVal >= 3) {
            // AUTO SUBMIT EXAM ON 3rd ATTEMPT!
            autoSubmitExam();
            alert("Ujian Anda otomatis dikumpulkan karena terdeteksi meninggalkan halaman ujian sebanyak 3 kali.");
          } else {
            setShowCheatWarning(true);
          }
          return nextVal;
        });
      }, 300);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleCheatDetected();
      }
    };

    const handleWindowBlur = () => {
      handleCheatDetected();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [submissionId, answers, submitting, loading, questions.length, autoSubmitExam]);

  // 2. Timer Effect
  useEffect(() => {
    if (timeLeft === null) return;
    
    if (timeLeft <= 0) {
      // Auto-submit when time runs out!
      autoSubmitExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, autoSubmitExam]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleOptionChange = (key: string) => {
    if (questions.length === 0) return;
    const currentQuestion = questions[currentIdx];
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: key,
    }));
  };

  const handleEssayChange = (text: string) => {
    if (questions.length === 0) return;
    const currentQuestion = questions[currentIdx];
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: text,
    }));
  };

  const toggleFlag = () => {
    if (questions.length === 0) return;
    const currentQuestion = questions[currentIdx];
    setFlagged((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  // 3. Submit Exam Handlers
  const handleSubmitExam = async () => {
    if (!submissionId || submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/submissions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          answers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Gagal mengirim jawaban.");
        setSubmitting(false);
        return;
      }

      // Automatically exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      router.push(`/ujian/${examId}/hasil?submission_id=${submissionId}`);
    } catch {
      setErrorMsg("Terjadi kesalahan koneksi saat mengumpulkan jawaban.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl animate-spin text-primary-fixed">progress_activity</span>
        <p className="text-body-lg font-bold animate-pulse">Menyiapkan lembar ujian & mengunci lembar jawaban...</p>
      </div>
    );
  }

  if (errorMsg && questions.length === 0) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center p-8 text-center gap-4">
        <span className="material-symbols-outlined text-6xl text-error">error</span>
        <h3 className="text-headline-md font-bold">Terjadi Kendala</h3>
        <p className="text-body-md text-on-surface-variant max-w-md">{errorMsg}</p>
        <Link href="/dashboard/siswa/ujian-tugas" className="bg-primary-fixed text-on-primary-fixed px-6 py-3 font-bold">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center p-8 text-center gap-4">
        <span className="material-symbols-outlined text-6xl text-primary-fixed/40">quiz</span>
        <h3 className="text-headline-md font-bold">Soal Belum Tersedia</h3>
        <p className="text-body-md text-on-surface-variant max-w-md">
          Ustadz/Ustadzah pengampu belum mengunggah butir pertanyaan untuk paket ujian ini.
        </p>
        <Link href="/dashboard/siswa/ujian-tugas" className="bg-primary-fixed text-on-primary-fixed px-6 py-3 font-bold">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).filter((key) => answers[key]?.trim() !== "").length;

  return (
    <div className="bg-background text-on-background font-body-md overflow-hidden h-screen fixed inset-0 z-[100] flex flex-col">
      {/* TopAppBar */}
      <header className="bg-surface-container-lowest border-b-2 border-primary-fixed flex justify-between items-center w-full px-gutter h-20 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-headline-md font-bold text-on-surface">
            {exam?.title} ({exam?.subject})
          </h1>
        </div>
        <div className="flex items-center gap-6">
          {exam?.instructions && (
            <button
              onClick={() => setShowInstructionsModal(true)}
              className="border border-outline-variant hover:border-primary-fixed text-on-surface-variant hover:text-on-surface font-bold px-4 py-2 hover:bg-surface-container-high transition-all active:scale-95 cursor-pointer text-xs uppercase tracking-wider flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">info</span>
              Petunjuk Ujian
            </button>
          )}
          <div className="flex flex-col items-end">
            <span className="text-label-sm text-outline">Sisa Waktu</span>
            <span className="text-label-timer text-error font-black text-xl animate-pulse">
              {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
            </span>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-primary-fixed text-on-primary-fixed font-black px-6 py-2.5 hover:bg-primary-fixed-dim transition-all active:scale-95 cursor-pointer text-sm uppercase tracking-wider"
          >
            Kumpulkan Ujian
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-gutter py-12 custom-scrollbar">
          <div className="max-w-[700px] mx-auto space-y-8">
            
            {/* Error alerts if submission fails */}
            {errorMsg && (
              <div className="bg-error/10 border border-error/40 text-error text-sm p-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                {errorMsg}
              </div>
            )}

            {/* Question Header */}
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <span className="bg-surface-container-highest text-primary-fixed px-3 py-1 text-xs font-black uppercase tracking-wider">
                Pertanyaan {currentIdx + 1} dari {questions.length}
              </span>
              <button
                onClick={toggleFlag}
                className={`flex items-center gap-2 transition-colors ${
                  flagged[currentQuestion.id]
                    ? "text-primary-fixed font-bold"
                    : "text-on-surface-variant hover:text-primary-fixed"
                }`}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: flagged[currentQuestion.id] ? "'FILL' 1" : "'FILL' 0" }}
                >
                  flag
                </span>
                <span className="text-xs font-bold uppercase tracking-wide">Tandai Soal</span>
              </button>
            </div>

            {/* Question Content */}
            <div className="space-y-6">
              <div
                className="text-body-lg text-on-surface font-medium leading-relaxed html-question-content space-y-2 [&_img]:max-w-full [&_img]:h-auto [&_img]:border [&_img]:border-outline-variant/60 [&_img]:my-2 [&_table]:border-collapse [&_table]:border [&_table]:border-outline-variant [&_td]:border [&_td]:border-outline-variant [&_td]:p-2 [&_th]:border [&_th]:border-outline-variant [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: renderMathInText(currentQuestion.question_text) }}
              />
            </div>

            {/* Render Answers Input based on Question Type */}
            {currentQuestion.type === "pilihan_ganda" ? (
              <div className="space-y-3 pt-6">
                {["A", "B", "C", "D"].map((letter, idx) => {
                  const optionText = currentQuestion.options?.[idx] || "";
                  const isChecked = answers[currentQuestion.id] === letter;
                  
                  if (!optionText && idx >= 2) return null; // allow binary options (True/False)

                  return (
                    <label
                      key={letter}
                      onClick={() => handleOptionChange(letter)}
                      className={`group flex items-center p-4 border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-primary-fixed/15 border-primary-fixed shadow-md"
                          : "bg-surface-container border-outline-variant hover:border-primary-fixed"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 border-2 flex items-center justify-center mr-4 transition-all ${
                          isChecked
                            ? "bg-primary-fixed border-primary-fixed"
                            : "border-outline group-hover:border-primary-fixed"
                        }`}
                      >
                        <span className={`text-[11px] font-black ${isChecked ? "text-black" : "text-on-surface-variant"}`}>
                          {letter}
                        </span>
                      </div>
                      <span
                        className={`text-body-md html-option-content [&_img]:max-w-full [&_img]:h-auto ${
                          isChecked ? "text-primary-fixed font-bold" : "text-on-surface group-hover:text-primary-fixed"
                        }`}
                        dangerouslySetInnerHTML={{ __html: renderMathInText(optionText) }}
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4 pt-6">
                <label className="text-headline-sm text-on-surface font-bold block">Tuliskan Jawaban Uraian Anda *</label>
                <textarea
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleEssayChange(e.target.value)}
                  className="w-full h-48 bg-surface-container-high border border-outline-variant p-6 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary-fixed transition-all font-body-md leading-relaxed"
                  placeholder="Ketik jawaban penjelasan Anda secara lengkap dan mendalam..."
                  required
                />
                <div className="flex justify-between items-center text-xs text-outline font-bold">
                  <span>Pastikan jawaban Anda logis & padat</span>
                  <span>{answers[currentQuestion.id]?.trim() ? answers[currentQuestion.id].trim().split(/\s+/).length : 0} kata</span>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-12 pb-24">
              <button
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-2 border-2 border-outline px-6 py-2.5 text-on-surface font-black text-xs uppercase tracking-wider hover:border-primary-fixed hover:text-primary-fixed transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
                SEBELUMNYA
              </button>
              <button
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIdx === questions.length - 1}
                className="flex items-center gap-2 bg-primary-fixed text-on-primary-fixed px-8 py-2.5 font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                SELANJUTNYA
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </main>

        {/* SideNavBar - Question Navigator */}
        <aside className="h-full w-72 bg-surface-container-low border-l border-outline-variant p-6 flex flex-col gap-6 shadow-xl shrink-0">
          <div className="space-y-1">
            <h2 className="text-label-sm text-primary-fixed font-black uppercase tracking-widest">Navigasi Soal</h2>
            <p className="text-body-md text-on-surface-variant font-bold">{questions.length} Butir Soal</p>
          </div>

          <div className="grid grid-cols-5 gap-2 overflow-y-auto pr-2 flex-1 content-start custom-scrollbar">
            {questions.map((q, idx) => {
              const isCurrent = currentIdx === idx;
              const hasAnswer = answers[q.id]?.trim() !== "";
              const isFlagged = flagged[q.id];

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-10 h-10 flex items-center justify-center rounded-sm text-xs font-black relative transition-all border cursor-pointer ${
                    isCurrent
                      ? "border-2 border-primary-fixed bg-primary-fixed/15 text-primary-fixed shadow"
                      : hasAnswer
                      ? "bg-green-950/20 border-green-500/50 text-green-400"
                      : "border-outline-variant text-on-surface hover:border-primary-fixed bg-surface/35"
                  }`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span
                      className="material-symbols-outlined text-[9px] absolute top-0 right-0 text-red-500"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      flag
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Progress Section */}
          <div className="mt-auto border-t border-outline-variant pt-4 space-y-4">
            <div className="flex flex-col gap-1.5 text-[10px] text-outline font-black uppercase tracking-wider">
              <div className="flex justify-between">
                <span>Terjawab:</span>
                <span className="text-primary-fixed">
                  {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 mt-1 rounded-full overflow-hidden">
                <div
                  className="bg-primary-fixed h-full transition-all duration-300"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant p-8 max-w-[460px] w-full text-center shadow-2xl">
            <span
              className="material-symbols-outlined text-error text-6xl mb-4 animate-bounce"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
            <h3 className="text-headline-md font-black text-on-surface mb-2">Kumpulkan Lembar Jawaban?</h3>
            <p className="text-body-md text-on-surface-variant mb-6 leading-relaxed">
              Anda telah menjawab <strong>{answeredCount}</strong> dari <strong>{questions.length}</strong> pertanyaan. Setelah dikumpulkan, Anda tidak dapat mengubah jawaban Anda lagi.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 border-2 border-outline-variant text-on-surface py-3 font-bold hover:bg-surface-container-high transition-colors cursor-pointer uppercase tracking-wider text-xs"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                onClick={handleSubmitExam}
                className="flex-1 bg-primary-fixed text-on-primary-fixed py-3 font-black hover:bg-primary-fixed-dim transition-all cursor-pointer uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    Mengirim...
                  </>
                ) : (
                  "Ya, Kumpulkan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* LOCKDOWN MODE FULLSCREEN OVERLAY */}
      {!isFullscreen && !loading && questions.length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
          <div className="max-w-md w-full bg-surface-container border border-error/30 p-8 space-y-6 shadow-2xl relative overflow-hidden group">
            
            {/* Absolute top warning bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-error animate-pulse"></div>

            <div className="w-20 h-20 bg-error/10 border border-error/20 flex items-center justify-center mx-auto rounded-full text-error">
              <span className="material-symbols-outlined text-4xl animate-bounce">lock</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-headline-md font-black text-error uppercase tracking-wider">Mode Ujian Terkunci</h3>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                Ujian ini dilindungi oleh sistem keamanan CBT Madrasah. Anda wajib mengerjakan ujian dalam **Mode Layar Penuh** agar tidak dapat mengakses aplikasi lain atau tab lain.
              </p>
            </div>

            {exam?.instructions && (
              <div className="bg-surface-container-high border border-outline-variant p-4 text-left space-y-1">
                <span className="text-[10px] font-black uppercase text-primary-fixed tracking-wider block">Petunjuk / Aturan Ujian:</span>
                <p className="text-xs text-on-surface-variant whitespace-pre-line leading-relaxed italic">
                  {exam.instructions}
                </p>
              </div>
            )}

            {cheatAttempts > 0 && (
              <div className="bg-error/10 border border-error/30 p-4 text-xs font-bold text-error space-y-1">
                <p className="uppercase tracking-wider">Peringatan Pelanggaran Focus</p>
                <p>Terdeteksi keluar tab: <span className="text-base font-black underline">{cheatAttempts}</span> dari <span className="text-base font-black">3</span> kesempatan.</p>
              </div>
            )}

            <button
              onClick={enterFullscreen}
              className="w-full bg-error hover:bg-error/95 text-white py-3.5 px-6 font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-error/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">fullscreen</span>
              Masuk Mode Layar Penuh
            </button>

            <p className="text-[10px] text-outline">
              * Percobaan keluar layar penuh / berpindah tab sebanyak 3 kali akan menyebabkan lembar ujian Anda dikumpulkan otomatis dengan status pelanggaran.
            </p>
          </div>
        </div>
      )}

      {/* TAB SWITCH CHEAT WARNING MODAL */}
      {showCheatWarning && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-container border border-error/50 w-full max-w-md p-8 space-y-6 shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-error"></div>
            
            <div className="w-16 h-16 bg-error/10 border border-error/20 flex items-center justify-center mx-auto rounded-full text-error">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>

            <div className="space-y-2 text-center">
              <h3 className="text-headline-md font-black text-error uppercase tracking-wider">Deteksi Pelanggaran!</h3>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                Sistem mendeteksi Anda meninggalkan halaman ujian (membuka tab lain / menekan tombol home / berganti aplikasi).
              </p>
            </div>

            <div className="bg-error/10 border border-error/30 p-4 text-center text-xs font-bold text-error space-y-1">
              <p className="uppercase tracking-wider">Status Percobaan Pelanggaran</p>
              <p className="text-lg">
                Terdeteksi: <span className="font-black underline">{cheatAttempts}</span> / 3 Kali
              </p>
              <p className="text-[10px] font-normal text-on-surface-variant mt-1">
                Jika terdeteksi keluar dari halaman ujian **3 kali**, jawaban Anda akan **OTOMATIS DIKUMPULKAN** saat itu juga!
              </p>
            </div>

            <button
              onClick={() => {
                setShowCheatWarning(false);
                enterFullscreen();
              }}
              className="w-full bg-primary-fixed text-on-primary-fixed py-3 font-bold uppercase tracking-wider hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">verified_user</span>
              Saya Mengerti & Janji Jujur
            </button>
          </div>
        </div>
      )}
      
      {/* PETUNJUK UJIAN MODAL DURING EXAM */}
      {showInstructionsModal && exam?.instructions && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant w-full max-w-md p-8 space-y-6 shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-primary-fixed"></div>
            
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
              <h3 className="text-headline-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-fixed">info</span>
                Petunjuk Ujian
              </h3>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                close
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-surface-container-high border border-outline-variant p-4 rounded max-h-60 overflow-y-auto custom-scrollbar">
                <p className="text-body-md text-on-surface whitespace-pre-line leading-relaxed italic text-sm">
                  {exam.instructions}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstructionsModal(false)}
              className="w-full bg-primary-fixed text-on-primary-fixed py-3 font-bold uppercase tracking-wider hover:bg-primary-fixed-dim transition-colors cursor-pointer text-xs"
            >
              Kembali ke Ujian
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
