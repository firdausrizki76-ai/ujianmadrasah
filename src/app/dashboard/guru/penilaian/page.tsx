"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import katex from "katex";
import "katex/dist/katex.min.css";

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

type Submission = {
  id: string;
  student_name: string;
  class_name: string;
  exam_title: string;
  subject: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  status: string;
};

type QuestionAnswer = {
  id: string;
  question_text: string;
  answer_key: string;
  options: string[] | null;
  type: "pilihan_ganda" | "essay";
  student_answer: string;
  is_correct: boolean | null;
  answer_id: string | null;
};

type TeacherInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
  subject: string | null;
};

export default function PenilaianGuru() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Grading Modal State
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [subDetail, setSubDetail] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<QuestionAnswer[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [gradingScores, setGradingScores] = useState<Record<string, boolean>>({}); // answer_id -> is_correct
  const [savingGrade, setSavingGrade] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [modalQuestionFilter, setModalQuestionFilter] = useState<"essay" | "all">("essay");

  const fetchSubmissions = async (teacherId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions?teacher_id=${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out in_progress attempts, only show submitted and graded
        const validSubs = (data.submissions ?? []).filter(
          (sub: Submission) => sub.status === "submitted" || sub.status === "graded"
        );
        setSubmissions(validSubs);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
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
    fetchSubmissions(userObj.id);
  }, [router]);

  const handleOpenGrading = async (subId: string) => {
    setSelectedSubId(subId);
    setLoadingDetail(true);
    setGradingScores({});
    try {
      const res = await fetch(`/api/submissions?submission_id=${subId}`);
      if (res.ok) {
        const data = await res.json();
        setSubDetail(data.submission);
        setQuestions(data.questions);

        // Pre-populate grading states
        const initialGrading: Record<string, boolean> = {};
        data.questions.forEach((q: QuestionAnswer) => {
          if (q.type === "essay" && q.answer_id) {
            initialGrading[q.answer_id] = q.is_correct ?? false;
          }
        });
        setGradingScores(initialGrading);
      }
    } catch {
      alert("Gagal memuat detail jawaban siswa.");
      setSelectedSubId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleGradeToggle = (ansId: string, isCorrect: boolean) => {
    setGradingScores((prev) => ({
      ...prev,
      [ansId]: isCorrect,
    }));
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) return;
    setSavingGrade(true);

    const gradesPayload = Object.entries(gradingScores).map(([answer_id, is_correct]) => ({
      answer_id,
      is_correct,
    }));

    try {
      const res = await fetch("/api/submissions/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: selectedSubId,
          grades: gradesPayload,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Penilaian siswa "${subDetail?.student_name}" berhasil disimpan.`);
        setSelectedSubId(null);
        if (teacher) fetchSubmissions(teacher.id);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        alert("Gagal menyimpan hasil penilaian.");
      }
    } catch {
      alert("Kesalahan koneksi server.");
    } finally {
      setSavingGrade(false);
    }
  };

  if (!teacher) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-headline-lg text-on-surface mb-2 font-black">Penilaian & Koreksi</h1>
        <p className="text-body-lg text-on-surface-variant">
          Periksa hasil ujian santri, lakukan koreksi jawaban essay secara objektif, dan sahkan nilai kelulusan.
        </p>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-primary-fixed/10 border border-primary-fixed/30 text-primary-fixed px-4 py-3 flex items-center gap-2 text-sm font-bold">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {successMsg}
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-surface-container border border-outline-variant overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl animate-spin text-primary-fixed">progress_activity</span>
            <p>Memuat daftar hasil ujian...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl">edit_document</span>
            <div>
              <h4 className="text-headline-md font-bold text-on-surface">Belum ada Lembar Ujian</h4>
              <p className="text-body-sm text-on-surface-variant mt-1">Setelah siswa Anda mulai mengerjakan ujian, nama dan lembar jawaban mereka akan tampil di sini.</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant text-xs uppercase font-bold tracking-wider">
                <th className="text-left p-4">Nama Siswa</th>
                <th className="text-left p-4">Kelas</th>
                <th className="text-left p-4">Nama Ujian</th>
                <th className="text-center p-4">Status</th>
                <th className="text-center p-4">Nilai</th>
                <th className="text-right p-4">Koreksi</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, i) => (
                <tr
                  key={sub.id}
                  className={`border-b border-outline-variant/40 hover:bg-surface-container-high transition-colors ${i % 2 === 0 ? "" : "bg-surface/30"}`}
                >
                  <td className="p-4 font-bold text-on-surface">{sub.student_name}</td>
                  <td className="p-4 text-on-surface-variant">{sub.class_name}</td>
                  <td className="p-4 text-on-surface-variant font-medium">{sub.exam_title}</td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      sub.status === "graded" 
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                    }`}>
                      {sub.status === "graded" ? "Selesai Dinilai" : "Perlu Koreksi"}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-headline-sm">
                    {sub.score !== null && sub.status === "graded" ? (
                      <span className={sub.score >= 60 ? "text-green-400" : "text-error"}>
                        {sub.score}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleOpenGrading(sub.id)}
                      className={`px-4 py-2 font-bold text-xs transition-colors border cursor-pointer ${
                        sub.status === "graded"
                          ? "border-outline-variant text-on-surface-variant hover:border-primary-fixed/50 hover:text-primary-fixed bg-surface-container-high"
                          : "bg-primary-fixed text-on-primary-fixed border-primary-fixed hover:bg-primary-fixed-dim"
                      }`}
                    >
                      {sub.status === "graded" ? "Koreksi Ulang" : "Mulai Penilaian"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ======== MODAL KOREKSI / DETAIL JAWABAN SISWA ======== */}
      {selectedSubId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant shrink-0 bg-surface-container-high">
              <div>
                <span className="bg-primary-fixed/20 text-primary-fixed text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-primary-fixed/30 mb-2 inline-block">
                  Koreksi Lembar Jawaban CBT
                </span>
                <h2 className="text-headline-md text-on-surface font-bold">
                  {subDetail?.student_name} ({subDetail?.class_name})
                </h2>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Ujian: {subDetail?.exam_title}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubId(null)}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                close
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {loadingDetail ? (
                <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
                  <span className="material-symbols-outlined text-4xl animate-spin text-primary-fixed">progress_activity</span>
                  <p>Mengambil lembar jawaban siswa...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Modal Filter Tabs */}
                  <div className="flex border-b border-outline-variant gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setModalQuestionFilter("essay")}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                        modalQuestionFilter === "essay"
                          ? "border-primary-fixed text-primary-fixed bg-primary-fixed/5 font-black"
                          : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">edit_note</span>
                      Hanya Soal Essay ({questions.filter(q => q.type === "essay").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalQuestionFilter("all")}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                        modalQuestionFilter === "all"
                          ? "border-primary-fixed text-primary-fixed bg-primary-fixed/5 font-black"
                          : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">list_alt</span>
                      Semua Soal PG & Essay ({questions.length})
                    </button>
                  </div>

                  <div className="space-y-6">
                    {questions
                      .filter((q) => modalQuestionFilter === "all" || q.type === "essay")
                      .map((q) => {
                        const isEssay = q.type === "essay";
                        const isGradedCorrect = isEssay && q.answer_id ? gradingScores[q.answer_id] === true : q.is_correct === true;
                        const originalIndex = questions.indexOf(q) + 1;
                        
                        return (
                          <div key={q.id} className="bg-surface border border-outline-variant/60 p-5 space-y-4">
                            
                            {/* Number & Type Badge */}
                            <div className="flex justify-between items-center text-xs">
                              <span className="bg-surface-container-highest text-on-surface font-bold px-3 py-1 border border-outline-variant">
                                Soal No. {originalIndex}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] font-black uppercase ${isEssay ? "bg-amber-900/20 text-amber-400" : "bg-blue-900/20 text-blue-400"}`}>
                                {isEssay ? "Essay" : "Pilihan Ganda"}
                              </span>
                            </div>
                            {/* Question Text */}
                            <div 
                              className="text-body-md text-on-surface font-medium leading-relaxed html-question-content space-y-2 [&_img]:max-w-full [&_img]:h-auto [&_img]:border [&_img]:border-outline-variant/60 [&_img]:my-2 [&_table]:border-collapse [&_table]:border [&_table]:border-outline-variant [&_td]:border [&_td]:border-outline-variant [&_td]:p-2 [&_th]:border [&_th]:border-outline-variant [&_th]:p-2"
                              dangerouslySetInnerHTML={{ __html: renderMathInText(q.question_text) }}
                            />

                        {/* Pilihan Ganda Answer Info */}
                        {!isEssay && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="bg-surface-container border border-outline-variant/50 p-3 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-on-surface-variant">Kunci Jawaban Benar:</span>
                              <div className="font-bold text-on-surface flex items-center gap-1.5 text-sm">
                                <span className="w-5 h-5 flex items-center justify-center bg-green-500 text-black font-black text-xs shrink-0">
                                  {q.answer_key}
                                </span>
                                <span 
                                  className="html-option-content [&_img]:max-w-full [&_img]:h-auto"
                                  dangerouslySetInnerHTML={{ __html: renderMathInText(q.options?.[q.answer_key.charCodeAt(0) - 65] || "") }}
                                />
                              </div>
                            </div>
                            <div className={`border p-3 space-y-1 ${
                              q.is_correct 
                                ? "bg-green-900/10 border-green-500/30 text-green-400"
                                : "bg-red-900/10 border-red-500/30 text-red-400"
                            }`}>
                              <span className="text-[10px] uppercase font-bold text-on-surface-variant">Jawaban Siswa:</span>
                              <div className="font-bold flex items-center gap-1.5 text-sm">
                                <span className={`w-5 h-5 flex items-center justify-center font-black text-xs shrink-0 ${
                                  q.is_correct ? "bg-green-500 text-black" : "bg-red-500 text-white"
                                }`}>
                                  {q.student_answer || "—"}
                                </span>
                                {q.student_answer ? (
                                  <span 
                                    className="html-option-content [&_img]:max-w-full [&_img]:h-auto"
                                    dangerouslySetInnerHTML={{ __html: renderMathInText(q.options?.[q.student_answer.charCodeAt(0) - 65] || "") }}
                                  />
                                ) : (
                                  <span>Tidak Dijawab</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                            {/* Essay Grading Editor */}
                            {isEssay && (
                              <div className="space-y-4 pt-2 border-t border-outline-variant/20">
                                {/* Student Answer Panel */}
                                <div className="bg-surface-container border border-outline-variant p-4 space-y-2">
                                  <span className="text-label-sm text-primary-fixed uppercase tracking-wider font-bold block">Jawaban Essay Siswa:</span>
                                  <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-line bg-surface/50 border border-outline-variant/40 p-3 italic">
                                    {q.student_answer || "(Siswa tidak mengisi jawaban)"}
                                  </p>
                                </div>

                                {/* Reference Key */}
                                <div className="bg-surface-container/60 border border-outline-variant/40 p-4 space-y-1 text-xs">
                                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Referensi Jawaban Benar (Guru):</span>
                                  <p className="text-on-surface whitespace-pre-line">{q.answer_key}</p>
                                </div>

                                {/* Grade Buttons Toggle */}
                                {q.answer_id ? (
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-on-surface-variant">Koreksi Guru:</span>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleGradeToggle(q.answer_id!, true)}
                                        className={`px-4 py-2 font-bold text-xs transition-colors border flex items-center gap-1 cursor-pointer ${
                                          isGradedCorrect
                                            ? "bg-green-500 text-black border-green-500"
                                            : "border-outline-variant text-on-surface-variant hover:border-green-500/50 hover:text-green-400"
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        Jawaban Benar / Sesuai
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleGradeToggle(q.answer_id!, false)}
                                        className={`px-4 py-2 font-bold text-xs transition-colors border flex items-center gap-1 cursor-pointer ${
                                          !isGradedCorrect
                                            ? "bg-red-500 text-white border-red-500"
                                            : "border-outline-variant text-on-surface-variant hover:border-red-500/50 hover:text-red-400"
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-sm">cancel</span>
                                        Salah / Kurang Tepat
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs font-bold flex items-center gap-1.5">
                                    <span className="text-on-surface-variant">Hasil Koreksi:</span>
                                    {q.is_correct ? (
                                      <span className="text-green-400 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        Benar / Sesuai
                                      </span>
                                    ) : (
                                      <span className="text-red-400 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">cancel</span>
                                        Salah / Kurang Tepat
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-outline-variant shrink-0 bg-surface-container-high flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedSubId(null)}
                className="flex-1 border border-outline-variant text-on-surface-variant py-3 hover:border-outline hover:text-on-surface transition-colors font-bold text-sm"
                disabled={savingGrade}
              >
                Tutup / Batal
              </button>
              {questions.some(q => q.type === "essay") && (
                <button
                  type="button"
                  onClick={handleSaveGrade}
                  className="flex-1 bg-primary-fixed text-on-primary-fixed py-3 font-bold hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
                  disabled={savingGrade || loadingDetail}
                >
                  {savingGrade ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      Menghitung Skor...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">verified</span>
                      Sahkan & Simpan Nilai
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
