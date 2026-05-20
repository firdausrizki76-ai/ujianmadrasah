"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Exam = {
  id: string;
  title: string;
  subject: string;
  type: string;
  duration_minutes: number;
  total_questions: number;
  start_at: string;
  end_at: string;
  created_at: string;
  class_name?: string;
  instructions?: string;
  session_id?: string | null;
  exam_sessions?: { name: string; start_time: string; end_time: string } | null;
};

type TeacherInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
  subject: string | null;
};

export default function PaketUjianGuru() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [showSessionSettingsModal, setShowSessionSettingsModal] = useState(false);
  const [sessionFormState, setSessionFormState] = useState<any[]>([]);
  const [updatingSessions, setUpdatingSessions] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  const [form, setForm] = useState({
    title: "",
    subject: "",
    type: "Ujian Akhir",
    duration_minutes: 60,
    class_name: "Semua Kelas",
    instructions: "",
  });

  const fetchExams = async (teacherId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams?teacher_id=${teacherId}`);
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

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        const users = data.users ?? [];
        const classes = Array.from(
          new Set(
            users
              .filter((u: any) => u.role === "siswa" && u.class_name)
              .map((u: any) => u.class_name.trim())
          )
        ) as string[];
        classes.sort();
        setAvailableClasses(classes);
      }
    } catch {
      // silently fail
    }
  };

  const handleOpenEdit = (exam: Exam) => {
    setErrorMsg("");
    setEditingExamId(exam.id);
    
    const formatLocalDate = (dateStr: string) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const formatLocalTime = (dateStr: string) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    setStartDate(formatLocalDate(exam.start_at));
    setStartTime(formatLocalTime(exam.start_at));
    setEndDate(formatLocalDate(exam.end_at));
    setEndTime(formatLocalTime(exam.end_at));
    setSelectedSessionId(exam.session_id || "");

    setForm({
      title: exam.title,
      subject: exam.subject,
      type: exam.type === "tugas" ? "Tugas" : exam.type === "ujian" ? "Ujian Akhir" : exam.type,
      duration_minutes: exam.duration_minutes,
      class_name: exam.class_name || "Semua Kelas",
      instructions: exam.instructions || "",
    });
    setShowModal(true);
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
    setForm((prev) => ({
      ...prev,
      subject: userObj.subject ?? "Umum",
      class_name: "Semua Kelas",
    }));
    const fetchSessions = async () => {
      try {
        const res = await fetch("/api/sessions");
        if (res.ok) {
          const data = await res.json();
          const list = data.sessions ?? [];
          setSessions(list);
          setSessionFormState(
            list.map((s: any) => ({
              id: s.id,
              name: s.name,
              start_time: s.start_time.substring(0, 5),
              end_time: s.end_time.substring(0, 5),
            }))
          );
        }
      } catch {
        // silently fail
      }
    };

    fetchExams(userObj.id);
    fetchClasses();
    fetchSessions();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
    setErrorMsg("");
    setSubmitting(true);

    const dbType = form.type === "Tugas" ? "tugas" : "ujian";
    const isEdit = !!editingExamId;

    try {
      // Construct local datetime-local ISO equivalent using browser timezone
      const localStartStr = `${startDate}T${startTime || "00:00"}`;
      const localEndStr = `${endDate}T${endTime || "00:00"}`;

      const res = await fetch("/api/exams", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          start_at: new Date(localStartStr).toISOString(),
          end_at: new Date(localEndStr).toISOString(),
          type: dbType,
          created_by: teacher.id,
          id: editingExamId || undefined,
          session_id: selectedSessionId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? `Gagal ${isEdit ? "memperbarui" : "membuat"} ujian.`);
        return;
      }

      setSuccessMsg(isEdit ? `Sesi ujian "${form.title}" berhasil diperbarui!` : `Sesi ujian "${form.title}" berhasil dijadwalkan!`);
      setShowModal(false);
      setEditingExamId(null);
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setForm({
        title: "",
        subject: teacher.subject ?? "Umum",
        type: "Ujian Akhir",
        duration_minutes: 60,
        class_name: "Semua Kelas",
        instructions: "",
      });
      setSelectedSessionId("");
      fetchExams(teacher.id);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setErrorMsg("Terjadi kesalahan server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus paket ujian "${title}"? Semua soal dan data ujian siswa terkait akan hilang.`)) return;
    try {
      const res = await fetch(`/api/exams?exam_id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuccessMsg(`Paket ujian "${title}" berhasil dihapus.`);
        if (teacher) fetchExams(teacher.id);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        alert("Gagal menghapus ujian.");
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const handleSaveSessions = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingSessions(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions: sessionFormState }),
      });
      if (res.ok) {
        setSuccessMsg("Waktu sesi ujian berhasil diperbarui.");
        setShowSessionSettingsModal(false);
        if (teacher) {
          fetchExams(teacher.id);
        }
        try {
          const resSess = await fetch("/api/sessions");
          if (resSess.ok) {
            const dataSess = await resSess.json();
            const list = dataSess.sessions ?? [];
            setSessions(list);
            setSessionFormState(
              list.map((s: any) => ({
                id: s.id,
                name: s.name,
                start_time: s.start_time.substring(0, 5),
                end_time: s.end_time.substring(0, 5),
              }))
            );
          }
        } catch {}
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const data = await res.json();
        setErrorMsg(data.error ?? "Gagal menyimpan perubahan sesi.");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan server saat menyimpan sesi.");
    } finally {
      setUpdatingSessions(false);
    }
  };

  if (!teacher) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-2 font-black">Sesi & Paket Ujian</h1>
          <p className="text-body-lg text-on-surface-variant">
            Jadwalkan sesi ujian baru, atur waktu pelaksanaan, dan terbitkan lembar pengerjaan soal.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              setErrorMsg("");
              setShowSessionSettingsModal(true);
            }}
            className="flex-1 sm:flex-none border border-outline-variant hover:border-primary-fixed/50 hover:text-primary-fixed text-on-surface-variant px-6 py-3 font-bold transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">settings</span> Kelola Waktu Sesi
          </button>
          <button
            onClick={() => {
              setErrorMsg("");
              setEditingExamId(null);
              setStartDate("");
              setStartTime("");
              setEndDate("");
              setEndTime("");
              setForm({
                title: "",
                subject: teacher.subject ?? "Umum",
                type: "Ujian Akhir",
                duration_minutes: 60,
                class_name: "Semua Kelas",
                instructions: "",
              });
              setSelectedSessionId("");
              setShowModal(true);
            }}
            className="flex-1 sm:flex-none bg-primary-fixed text-on-primary-fixed px-6 py-3 font-bold hover:bg-primary-fixed-dim transition-colors flex items-center gap-2 justify-center"
          >
            <span className="material-symbols-outlined">add</span> Buat Ujian Baru
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-primary-fixed/10 border border-primary-fixed/30 text-primary-fixed px-4 py-3 flex items-center gap-2 text-sm font-bold">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {successMsg}
        </div>
      )}

      {/* Exams Grid */}
      {loading ? (
        <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4 bg-surface-container border border-outline-variant">
          <span className="material-symbols-outlined text-5xl animate-spin text-primary-fixed">progress_activity</span>
          <p>Memuat daftar paket ujian...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4 bg-surface-container border border-outline-variant">
          <span className="material-symbols-outlined text-5xl">assignment</span>
          <div>
            <h4 className="text-headline-md font-bold text-on-surface">Belum ada Paket Ujian</h4>
            <p className="text-body-sm text-on-surface-variant mt-1">Klik tombol 'Buat Ujian Baru' untuk menjadwalkan sesi ujian perdana Anda.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {exams.map((exam) => {
            const isLive = new Date(exam.start_at) <= new Date() && new Date(exam.end_at) >= new Date();
            const isPast = new Date(exam.end_at) < new Date();

            return (
              <div key={exam.id} className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between hover:border-primary-fixed/40 transition-all group relative">
                
                {/* Live Status Badge */}
                <div className="absolute top-6 right-6">
                  {isLive && (
                    <span className="bg-green-900/20 text-green-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-green-500/20 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                      Berlangsung
                    </span>
                  )}
                  {isPast && (
                    <span className="bg-surface-container-highest text-on-surface-variant text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-outline-variant">
                      Selesai
                    </span>
                  )}
                  {!isLive && !isPast && (
                    <span className="bg-blue-900/20 text-blue-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-blue-500/20">
                      Mendatang
                    </span>
                  )}
                </div>

                <div>
                  {/* Subject Badge */}
                  <span className="bg-primary-fixed/10 text-primary-fixed text-[10px] px-2.5 py-1 font-bold uppercase tracking-wider border border-primary-fixed/20 mb-4 inline-block">
                    {exam.subject}
                  </span>

                  <h3 className="text-headline-md text-on-surface font-bold line-clamp-1 group-hover:text-primary-fixed transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant font-medium mt-1">
                    Jenis: {exam.type === "tugas" ? "Tugas / PR" : exam.type === "ujian" ? "Ujian Utama" : exam.type}
                  </p>

                  <hr className="my-4 border-outline-variant/30" />

                  {/* Timing & Details */}
                  <div className="space-y-2 text-xs font-medium text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">school</span>
                      <span>Target Kelas: <strong className="text-on-surface">{exam.class_name ?? "Semua Kelas"}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>Durasi: {exam.duration_minutes} Menit</span>
                    </div>
                    {exam.exam_sessions?.name && (
                      <div className="flex items-center gap-2 text-primary-fixed">
                        <span className="material-symbols-outlined text-sm">alarm</span>
                        <span>Sesi Ujian: <strong className="text-primary-fixed">{exam.exam_sessions.name} ({exam.exam_sessions.start_time.substring(0, 5)} - {exam.exam_sessions.end_time.substring(0, 5)})</strong></span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">menu_book</span>
                      <span>Jumlah Soal: <strong className="text-on-surface">{exam.total_questions} butir</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">event</span>
                      <span>Mulai: {new Date(exam.start_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">event_busy</span>
                      <span>Selesai: {new Date(exam.end_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-outline-variant/40 flex items-center justify-between gap-3">
                  <button
                    onClick={() => router.push(`/dashboard/guru/bank-soal?exam_id=${exam.id}`)}
                    className="flex-1 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant hover:border-primary-fixed/50 py-2.5 font-bold text-xs text-on-surface transition-all flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">quiz</span>
                    Kelola Soal
                  </button>
                  <button
                    onClick={() => handleOpenEdit(exam)}
                    className="p-2 hover:bg-primary-fixed/10 text-on-surface-variant hover:text-primary-fixed transition-all border border-outline-variant hover:border-primary-fixed/30"
                    title="Edit Sesi Ujian"
                  >
                    <span className="material-symbols-outlined text-sm block">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id, exam.title)}
                    className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error transition-all border border-outline-variant hover:border-error/30"
                    title="Hapus Sesi Ujian"
                  >
                    <span className="material-symbols-outlined text-sm block">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======== MODAL BUAT UJIAN BARU ======== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant">
              <div>
                <h2 className="text-headline-md text-on-surface font-bold">
                  {editingExamId ? "Edit Jadwal Ujian" : "Jadwalkan Ujian Baru"}
                </h2>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  {editingExamId ? "Perbarui informasi dan waktu pelaksanaan ujian." : "Atur waktu pelaksanaan ujian bagi santri Anda."}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                close
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-error/10 border border-error/40 text-error text-sm px-4 py-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {errorMsg}
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Judul Ujian *</label>
                <input
                  className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md"
                  placeholder="Contoh: Ujian Fiqh Akhir Semester Genap"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Mata Pelajaran *</label>
                  <input
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md font-bold"
                    placeholder="Contoh: Fiqh, Nahwu, Shorof, dll."
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Durasi (Menit) *</label>
                  <input
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md"
                    type="number"
                    min={5}
                    max={240}
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Kelas Target */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Ditujukan Untuk Kelas *</label>
                <select
                  className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md font-bold"
                  value={form.class_name}
                  onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  required
                  disabled={submitting}
                >
                  <option value="Semua Kelas">Semua Kelas</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kategori Sesi */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Kategori Sesi</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Ujian Harian", "Ujian Akhir", "Tugas"].map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setForm({ ...form, type: t })}
                      className={`py-2 text-xs font-bold border transition-colors ${
                        form.type === t
                           ? "bg-primary-fixed text-on-primary-fixed border-primary-fixed"
                           : "border-outline-variant text-on-surface-variant hover:border-primary-fixed/50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Petunjuk Ujian */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Petunjuk / Aturan Ujian</label>
                <textarea
                  className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md h-20 resize-y"
                  placeholder="Contoh: Berdoalah sebelum mengerjakan. Kerjakan secara mandiri dan jujur."
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  disabled={submitting}
                />
              </div>

              {/* Sesi Pelaksanaan Dropdown */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Sesi Pelaksanaan</label>
                <select
                  className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md cursor-pointer"
                  value={selectedSessionId}
                  onChange={(e) => {
                    const sessId = e.target.value;
                    setSelectedSessionId(sessId);
                    if (sessId) {
                      const sess = sessions.find((s) => s.id === sessId);
                      if (sess) {
                        const startHM = sess.start_time.substring(0, 5);
                        const endHM = sess.end_time.substring(0, 5);
                        setStartTime(startHM);
                        setEndTime(endHM);
                      }
                    }
                  }}
                  disabled={submitting}
                >
                  <option value="">-- Tanpa Sesi (Kustom Waktu) --</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-on-surface-variant">
                  * Memilih Sesi akan otomatis mengisi jam mulai dan berakhir. Pastikan tanggal pelaksanaan disesuaikan.
                </p>
              </div>

              {/* Start Date & Time */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Waktu Mulai Akses *</label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md font-mono cursor-pointer"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      e.target.blur(); // Auto-close calendar popover by losing focus
                    }}
                    required
                    disabled={submitting}
                  />
                  <input
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md font-mono"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* End Date & Time */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">Batas Akhir Akses *</label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md font-mono cursor-pointer"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      e.target.blur(); // Auto-close calendar popover by losing focus
                    }}
                    required
                    disabled={submitting}
                  />
                  <input
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md font-mono"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-outline-variant text-on-surface-variant py-3 hover:border-outline hover:text-on-surface transition-colors font-bold"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-fixed text-on-primary-fixed py-3 font-bold hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
                      {editingExamId ? "Simpan Perubahan" : "Jadwalkan"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======== MODAL KELOLA WAKTU SESI ======== */}
      {showSessionSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant">
              <div>
                <h2 className="text-headline-md text-on-surface font-bold">Kelola Waktu Sesi</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">Ubah rentang waktu standar untuk Sesi 1, 2, dan 3.</p>
              </div>
              <button
                onClick={() => setShowSessionSettingsModal(false)}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                close
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSessions} className="p-6 space-y-5">
              {errorMsg && (
                <div className="bg-error/10 border border-error/40 text-error text-sm px-4 py-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                {sessionFormState.map((sess, index) => (
                  <div key={sess.id} className="bg-surface-container-high/40 p-4 border border-outline-variant/30 space-y-3">
                    <h4 className="text-body-md font-bold text-primary-fixed">{sess.name}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-on-surface-variant uppercase tracking-wider block">Jam Mulai</label>
                        <input
                          type="time"
                          className="w-full bg-surface-container border border-outline-variant text-on-surface p-2.5 outline-none focus:border-primary-fixed transition-colors text-body-md font-mono cursor-pointer"
                          value={sess.start_time}
                          onChange={(e) => {
                            const updated = [...sessionFormState];
                            updated[index].start_time = e.target.value;
                            setSessionFormState(updated);
                          }}
                          required
                          disabled={updatingSessions}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-on-surface-variant uppercase tracking-wider block">Jam Selesai</label>
                        <input
                          type="time"
                          className="w-full bg-surface-container border border-outline-variant text-on-surface p-2.5 outline-none focus:border-primary-fixed transition-colors text-body-md font-mono cursor-pointer"
                          value={sess.end_time}
                          onChange={(e) => {
                            const updated = [...sessionFormState];
                            updated[index].end_time = e.target.value;
                            setSessionFormState(updated);
                          }}
                          required
                          disabled={updatingSessions}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSessionSettingsModal(false)}
                  className="flex-1 border border-outline-variant text-on-surface-variant py-3 hover:border-outline hover:text-on-surface transition-colors font-bold text-sm"
                  disabled={updatingSessions}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-fixed text-on-primary-fixed py-3 font-bold hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                  disabled={updatingSessions}
                >
                  {updatingSessions ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      Simpan Perubahan
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
