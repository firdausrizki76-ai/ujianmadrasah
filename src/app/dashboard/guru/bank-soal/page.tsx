"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseDocxQuestions } from "@/lib/docxParser";
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

type Exam = {
  id: string;
  title: string;
  subject: string;
};

type Question = {
  id: string;
  exam_id: string;
  question_text: string;
  answer_key: string;
  order_index: number;
  options: string[] | null;
  type: "pilihan_ganda" | "essay";
  created_at: string;
};

type TeacherInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
  subject: string | null;
};

function BankSoalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Editor Form State
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "pilihan_ganda" as "pilihan_ganda" | "essay",
    question_text: "",
    answer_key: "A",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
  });

  const fetchExams = async (teacherId: string) => {
    setLoadingExams(true);
    try {
      const res = await fetch(`/api/exams?teacher_id=${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        const examsList = data.exams ?? [];
        setExams(examsList);
        
        // Handle initial selection from query param or first exam
        const queryExamId = searchParams.get("exam_id");
        if (queryExamId && examsList.some((e: any) => e.id === queryExamId)) {
          setSelectedExamId(queryExamId);
          fetchQuestions(queryExamId);
        } else if (examsList.length > 0) {
          setSelectedExamId(examsList[0].id);
          fetchQuestions(examsList[0].id);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchQuestions = async (examId: string) => {
    if (!examId) return;
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/questions?exam_id=${examId}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingQuestions(false);
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
  }, [router, searchParams]);

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    fetchQuestions(examId);
    // update URL quietly
    router.replace(`/dashboard/guru/bank-soal?exam_id=${examId}`);
  };

  const handleOpenAdd = () => {
    setErrorMsg("");
    setEditingQuestionId(null);
    setForm({
      type: "pilihan_ganda",
      question_text: "",
      answer_key: "A",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (q: Question) => {
    setErrorMsg("");
    setEditingQuestionId(q.id);
    setForm({
      type: q.type,
      question_text: q.question_text,
      answer_key: q.answer_key,
      optionA: q.options?.[0] ?? "",
      optionB: q.options?.[1] ?? "",
      optionC: q.options?.[2] ?? "",
      optionD: q.options?.[3] ?? "",
    });
    setShowModal(true);
  };

  const handleDelete = async (qId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus soal ini?")) return;
    try {
      const res = await fetch(`/api/questions?question_id=${qId}&exam_id=${selectedExamId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuccessMsg("Soal berhasil dihapus.");
        fetchQuestions(selectedExamId);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        alert("Gagal menghapus soal.");
      }
    } catch {
      alert("Kesalahan koneksi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;
    setErrorMsg("");
    setSubmitting(true);

    const options = 
      form.type === "pilihan_ganda" 
        ? [form.optionA.trim(), form.optionB.trim(), form.optionC.trim(), form.optionD.trim()] 
        : [];

    if (form.type === "pilihan_ganda" && options.some(opt => opt === "")) {
      setErrorMsg("Semua pilihan jawaban A, B, C, dan D wajib diisi untuk pilihan ganda.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingQuestionId || undefined,
          exam_id: selectedExamId,
          question_text: form.question_text,
          answer_key: form.type === "pilihan_ganda" ? form.answer_key : form.answer_key.trim(),
          options,
          type: form.type,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Gagal menyimpan soal.");
        return;
      }

      setSuccessMsg(editingQuestionId ? "Soal berhasil diperbarui!" : "Soal baru berhasil ditambahkan!");
      setShowModal(false);
      fetchQuestions(selectedExamId);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setErrorMsg("Terjadi kesalahan server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedExamId) return;

    setImporting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const buffer = await file.arrayBuffer();
      const parsedQuestions = await parseDocxQuestions(buffer);

      if (parsedQuestions.length === 0) {
        setErrorMsg("Tidak ada butir soal terdeteksi di dokumen Word. Pastikan format penulisan benar.");
        return;
      }

      const payload = parsedQuestions.map((q) => ({
        exam_id: selectedExamId,
        question_text: q.title,
        answer_key: q.correct_answer,
        options: q.options,
        type: q.type,
      }));

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Gagal menyimpan soal ke database.");
        return;
      }

      setSuccessMsg(`Berhasil meng-import ${data.count} butir soal dari file Word!`);
      fetchQuestions(selectedExamId);
      e.target.value = "";
    } catch (err: any) {
      console.error("[Docx Import Error]", err);
      setErrorMsg(err.message || "Gagal meng-import file Word.");
    } finally {
      setImporting(false);
    }
  };

  const activeExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div className="max-w-container-max-width mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-headline-lg text-on-surface font-black">Manajemen Bank Soal</h2>
          <p className="text-body-lg text-on-surface-variant mt-1">
            Kelola, susun, dan edit butir pertanyaan untuk setiap paket ujian madrasah.
          </p>
        </div>
        {selectedExamId && (
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Import Word .docx Button */}
            <label className="bg-surface-container border border-outline-variant hover:border-primary-fixed text-on-surface px-6 py-3 font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 select-none w-full sm:w-auto">
              <span className="material-symbols-outlined text-primary-fixed">
                {importing ? "progress_activity" : "description"}
              </span>
              <span>{importing ? "Meng-import..." : "Import Word (.docx)"}</span>
              <input
                type="file"
                accept=".docx"
                className="hidden"
                onChange={handleImportDocx}
                disabled={importing}
              />
            </label>

            <button
              onClick={handleOpenAdd}
              className="bg-primary-fixed text-on-primary-fixed px-6 py-3 font-bold hover:bg-primary-fixed-dim transition-colors flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
              disabled={importing}
            >
              <span className="material-symbols-outlined">add_circle</span>
              Tambah Soal Baru
            </button>
          </div>
        )}
      </div>

      {/* Word format guidelines container */}
      {selectedExamId && (
        <div className="bg-surface-container-low border border-outline-variant p-6 space-y-4">
          <div className="flex items-center gap-3 text-primary-fixed">
            <span className="material-symbols-outlined">info</span>
            <h4 className="text-body-lg font-bold text-on-surface">Panduan Format Import Soal Word (.docx)</h4>
          </div>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            Sistem kami mendukung import soal secara langsung dari file Word. Silakan tulis soal Anda mengikuti format penulisan berikut:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="bg-surface border border-outline-variant/40 p-4 space-y-2 text-xs">
              <span className="bg-primary-fixed/20 text-primary-fixed px-2.5 py-0.5 font-bold uppercase tracking-wider rounded">Contoh Soal Pilihan Ganda:</span>
              <pre className="font-mono text-on-surface leading-relaxed mt-2 text-[11px] whitespace-pre-wrap bg-surface-container-high p-3 border border-outline-variant">
{`[SOAL]
Tentukan himpunan penyelesaian dari persamaan kuadrat $$x^2 - 5x + 6 = 0$$!
[A] {2, 3}
[B] {-2, 3}
[C] {2, -3}
[D] {-2, -3}
[KUNCI] A`}
              </pre>
            </div>

            <div className="bg-surface border border-outline-variant/40 p-4 space-y-2 text-xs">
              <span className="bg-secondary-fixed/20 text-on-surface px-2.5 py-0.5 font-bold uppercase tracking-wider rounded">Contoh Soal Essay / Uraian:</span>
              <pre className="font-mono text-on-surface leading-relaxed mt-2 text-[11px] whitespace-pre-wrap bg-surface-container-high p-3 border border-outline-variant">
{`[SOAL]
Jelaskan perbedaan antara hukum bacaan Idzhar Halqi dan Idgham Bighunnah beserta contohnya masing-masing!
[KUNCI] Idzhar dibaca jelas (contoh: man amana), sedangkan Idgham Bighunnah dibaca melebur dengan dengung (contoh: miy yaqul).`}
              </pre>
            </div>
          </div>
          <div className="text-xs text-on-surface-variant flex items-center gap-2 pt-2">
            <span className="material-symbols-outlined text-base text-primary-fixed">verified</span>
            <span><strong>Catatan:</strong> Rumus matematika dapat ditulis menggunakan standard <strong>LaTeX / KaTeX</strong> diapit simbol $$ (contoh: $$x^2$$). Gambar dan tabel yang ditempel di Word akan otomatis diekstrak!</span>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-primary-fixed/10 border border-primary-fixed/30 text-primary-fixed px-4 py-3 flex items-center gap-2 text-sm font-bold">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {successMsg}
        </div>
      )}

      {/* Exam Selector Panel */}
      <div className="bg-surface-container border border-outline-variant p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 flex-1 w-full">
          <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Pilih Paket Ujian Target</label>
          {loadingExams ? (
            <div className="h-12 w-full max-w-md bg-surface-container-high animate-pulse border border-outline-variant"></div>
          ) : exams.length === 0 ? (
            <p className="text-body-md text-error font-bold">Belum ada paket ujian dibuat. Buat paket ujian dulu di menu Ujian!</p>
          ) : (
            <select
              value={selectedExamId}
              onChange={(e) => handleExamChange(e.target.value)}
              className="w-full max-w-md bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors font-bold"
            >
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} ({exam.subject})
                </option>
              ))}
            </select>
          )}
        </div>

        {activeExam && (
          <div className="text-right shrink-0 bg-surface border border-outline-variant/60 p-4 min-w-[200px] text-center md:text-right">
            <span className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">Butir Pertanyaan</span>
            <p className="text-headline-md text-primary-fixed font-black mt-1">{questions.length} Soal</p>
          </div>
        )}
      </div>

      {/* Questions List & Editor Area */}
      {selectedExamId ? (
        <div className="space-y-6">
          <h3 className="text-headline-md text-on-surface font-bold">Butir Soal Ujian</h3>

          {loadingQuestions ? (
            <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4 bg-surface-container border border-outline-variant">
              <span className="material-symbols-outlined text-5xl animate-spin text-primary-fixed">progress_activity</span>
              <p>Memuat butir pertanyaan...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant border border-dashed border-outline-variant flex flex-col items-center justify-center gap-4 bg-surface-container">
              <span className="material-symbols-outlined text-5xl text-primary-fixed/40">quiz</span>
              <div>
                <h4 className="text-headline-md font-bold text-on-surface">Paket Ujian Masih Kosong</h4>
                <p className="text-body-sm text-on-surface-variant mt-1">Belum ada butir soal. Klik 'Tambah Soal Baru' untuk mengisi lembar ujian ini.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="bg-surface-container border border-outline-variant p-6 hover:border-primary-fixed/30 transition-colors flex flex-col justify-between gap-4 relative group"
                >
                  <div className="space-y-3">
                    {/* Header: Question Number & Badges */}
                    <div className="flex items-center justify-between">
                      <span className="bg-primary-fixed text-on-primary-fixed text-xs font-black px-3 py-1 uppercase tracking-wider">
                        Soal No. {index + 1}
                      </span>
                      <span className="bg-surface-container-highest text-on-surface-variant text-[10px] font-black uppercase px-2.5 py-1 border border-outline-variant">
                        {q.type === "pilihan_ganda" ? "Pilihan Ganda" : "Essay"}
                      </span>
                    </div>

                    {/* Question Text */}
                    <div 
                      className="text-body-lg text-on-surface font-medium leading-relaxed html-question-content space-y-2 [&_img]:max-w-full [&_img]:h-auto [&_img]:border [&_img]:border-outline-variant/60 [&_img]:my-2 [&_table]:border-collapse [&_table]:border [&_table]:border-outline-variant [&_td]:border [&_td]:border-outline-variant [&_td]:p-2 [&_th]:border [&_th]:border-outline-variant [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                      dangerouslySetInnerHTML={{ __html: renderMathInText(q.question_text) }}
                    />

                    {/* Options (for Multiple Choice) */}
                    {q.type === "pilihan_ganda" && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {["A", "B", "C", "D"].map((letter, idx) => {
                          const optionText = q.options?.[idx] || "";
                          const isCorrect = q.answer_key === letter;
                          return (
                            <div
                              key={letter}
                              className={`p-3 border flex gap-3 items-center text-xs font-medium transition-all ${
                                isCorrect
                                  ? "bg-green-900/10 border-green-500/40 text-green-400"
                                  : "bg-surface/50 border-outline-variant/40 text-on-surface-variant"
                              }`}
                            >
                              <span className={`w-6 h-6 flex items-center justify-center font-bold text-xs shrink-0 ${
                                isCorrect ? "bg-green-500 text-black" : "bg-surface-container-highest text-on-surface-variant"
                              }`}>
                                {letter}
                              </span>
                              <span 
                                className={`html-option-content [&_img]:max-w-full [&_img]:h-auto ${isCorrect ? "font-bold text-on-surface" : ""}`}
                                dangerouslySetInnerHTML={{ __html: renderMathInText(optionText) }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Expected answer for essay */}
                    {q.type === "essay" && (
                      <div className="bg-surface/50 border border-outline-variant/40 p-4 text-xs font-medium text-on-surface-variant space-y-1">
                        <strong className="text-primary-fixed text-[10px] uppercase tracking-wider block">Kunci / Referensi Penilaian Essay:</strong>
                        <p className="text-on-surface leading-relaxed whitespace-pre-line">{q.answer_key}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-between gap-3 text-xs">
                    <div>
                      {q.type === "pilihan_ganda" && (
                        <span className="text-green-400 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Kunci Jawaban Benar: {q.answer_key}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEdit(q)}
                        className="bg-surface-container-high border border-outline-variant hover:border-primary-fixed/50 hover:text-primary-fixed px-4 py-2 font-bold transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Edit Soal
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="bg-surface-container-high border border-outline-variant hover:border-error/50 hover:text-error px-3 py-2 font-bold transition-all flex items-center gap-1 text-on-surface-variant"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        !loadingExams && (
          <div className="p-12 text-center text-on-surface-variant bg-surface-container border border-outline-variant flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-5xl">school</span>
            <p>Jadwalkan atau pilih paket ujian untuk mengelola butir soal.</p>
          </div>
        )
      )}

      {/* ======== MODAL EDITOR SOAL ======== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant shrink-0">
              <div>
                <h2 className="text-headline-md text-on-surface font-bold">
                  {editingQuestionId ? "Edit Pertanyaan" : "Tambah Pertanyaan Baru"}
                </h2>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Atur soal ujian ({activeExam?.title}) dengan detail pilihan jawaban atau referensi kunci.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                close
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
              {errorMsg && (
                <div className="bg-error/10 border border-error/40 text-error text-sm px-4 py-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {errorMsg}
                </div>
              )}

              {/* Question Type Selection */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Tipe Pertanyaan</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: "pilihan_ganda", label: "Pilihan Ganda" },
                    { val: "essay", label: "Essay / Esai" },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.val}
                      onClick={() => setForm({ ...form, type: t.val as any })}
                      className={`py-3 text-xs font-bold border transition-colors ${
                        form.type === t.val
                          ? "bg-primary-fixed text-on-primary-fixed border-primary-fixed"
                          : "border-outline-variant text-on-surface-variant hover:border-primary-fixed/50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Teks Pertanyaan *</label>
                <textarea
                  rows={4}
                  className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md whitespace-pre-wrap leading-relaxed"
                  placeholder="Masukkan kalimat pertanyaan di sini..."
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Options Fields (Only for Pilihan Ganda) */}
              {form.type === "pilihan_ganda" && (
                <div className="space-y-3 pt-2 border-t border-outline-variant/30">
                  <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Pilihan Jawaban</label>
                  
                  {["A", "B", "C", "D"].map((letter) => {
                    const fieldName = `option${letter}` as "optionA" | "optionB" | "optionC" | "optionD";
                    return (
                      <div key={letter} className="flex items-center gap-3">
                        <span className="w-8 h-8 flex items-center justify-center font-bold text-xs bg-surface-container-highest border border-outline-variant text-on-surface-variant">
                          {letter}
                        </span>
                        <input
                          className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface p-2.5 outline-none focus:border-primary-fixed transition-colors text-body-sm"
                          placeholder={`Jawaban untuk Pilihan ${letter}`}
                          value={form[fieldName]}
                          onChange={(e) => setForm({ ...form, [fieldName]: e.target.value })}
                          required={form.type === "pilihan_ganda"}
                          disabled={submitting}
                        />
                      </div>
                    );
                  })}

                  {/* Correct Key Selection */}
                  <div className="space-y-2 pt-2">
                    <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Kunci Jawaban Benar *</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["A", "B", "C", "D"].map((letter) => (
                        <button
                          type="button"
                          key={letter}
                          onClick={() => setForm({ ...form, answer_key: letter })}
                          className={`py-3 text-xs font-bold border transition-colors ${
                            form.answer_key === letter
                              ? "bg-green-500 text-black border-green-500"
                              : "border-outline-variant text-on-surface-variant hover:border-primary-fixed/50"
                          }`}
                        >
                          Pilihan {letter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Essay Answer Key Reference (Only for Essay) */}
              {form.type === "essay" && (
                <div className="space-y-2 pt-2 border-t border-outline-variant/30">
                  <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Referensi Kunci Jawaban Benar *</label>
                  <textarea
                    rows={4}
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md"
                    placeholder="Masukkan uraian jawaban benar / kisi-kisi penilaian essay..."
                    value={form.answer_key}
                    onChange={(e) => setForm({ ...form, answer_key: e.target.value })}
                    required={form.type === "essay"}
                    disabled={submitting}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-outline-variant text-on-surface-variant py-3 hover:border-outline hover:text-on-surface transition-colors font-bold text-sm"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-fixed text-on-primary-fixed py-3 font-bold hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">check</span>
                      Simpan Soal
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BankSoalGuru() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl animate-spin text-primary-fixed">
          progress_activity
        </span>
        <p className="text-body-lg font-medium">Memuat data Bank Soal...</p>
      </div>
    }>
      <BankSoalContent />
    </Suspense>
  );
}
