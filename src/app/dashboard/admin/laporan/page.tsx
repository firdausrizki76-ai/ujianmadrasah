"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Submission {
  id: string;
  exam_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  student_email: string;
  exam_title: string;
  subject: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  status: "in_progress" | "submitted" | "graded";
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  class_name: string;
  type: string;
  start_at: string;
  end_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  class_name: string | null;
}

export default function AdminLaporan() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>("Semua Kelas");
  const [selectedExamId, setSelectedExamId] = useState<string>("Semua Ujian");
  const [activeTab, setActiveTab] = useState<"rekap" | "ranking">("rekap");
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [examColumnSearch, setExamColumnSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // 1. Fetch Submissions
      const subRes = await fetch("/api/submissions");
      let allSubs: Submission[] = [];
      if (subRes.ok) {
        const subData = await subRes.json();
        allSubs = subData.submissions ?? [];
      } else {
        throw new Error("Gagal mengambil data hasil ujian.");
      }

      // Deduplicate submissions (graded > submitted > in_progress)
      const dedupedSubsMap: Record<string, Submission> = {};
      allSubs.forEach((sub) => {
        const key = `${sub.student_id}_${sub.exam_id}`;
        const existing = dedupedSubsMap[key];
        if (!existing) {
          dedupedSubsMap[key] = sub;
        } else {
          const statusPriority = { graded: 3, submitted: 2, in_progress: 1 };
          const currentPrio = statusPriority[sub.status] ?? 0;
          const existingPrio = statusPriority[existing.status] ?? 0;
          if (currentPrio > existingPrio) {
            dedupedSubsMap[key] = sub;
          }
        }
      });
      const finalSubs = Object.values(dedupedSubsMap);
      setSubmissions(finalSubs);

      // 2. Fetch Exams
      const examRes = await fetch("/api/exams");
      if (examRes.ok) {
        const examData = await examRes.json();
        setExams(examData.exams ?? []);
      }

      // 3. Fetch Users (to get all students)
      const userRes = await fetch("/api/users");
      if (userRes.ok) {
        const userData = await userRes.json();
        const allStudents = (userData.users as User[])?.filter((u) => u.role === "siswa") ?? [];
        setStudents(allStudents);
      }
    } catch (err: any) {
      console.error("[Fetch Report Data Error]", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat memuat data laporan.");
    } finally {
      setLoading(false);
    }
  };

  // Get unique list of classes dynamically from both students and exams
  const classList = Array.from(
    new Set([
      ...students.map((s) => s.class_name).filter(Boolean),
      ...exams.map((e) => e.class_name).filter(Boolean),
      ...submissions.map((s) => s.class_name).filter((c) => c && c !== "—"),
    ])
  ).sort() as string[];

  // Filtered lists
  const filteredStudents = students.filter(
    (s) => selectedClass === "Semua Kelas" || s.class_name === selectedClass
  );

  const filteredExams = exams.filter(
    (e) => selectedClass === "Semua Kelas" || e.class_name === selectedClass || e.class_name === "Semua Kelas"
  );

  // Filter columns by column search input & sort (latest start_at date first)
  const searchedExamsForColumns = filteredExams.filter(e =>
    e.title.toLowerCase().includes(examColumnSearch.toLowerCase()) ||
    e.subject.toLowerCase().includes(examColumnSearch.toLowerCase())
  ).sort(
    (a, b) => new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime()
  );

  // If viewing all, limit default columns to the latest 5 to avoid horizontal stretching, with showAll override
  const displayedExams = showAllColumns
    ? searchedExamsForColumns
    : searchedExamsForColumns.slice(0, 5);

  // Generate Report Data
  // Mapping of Student -> Exam -> Score
  const reportRows = filteredStudents.map((student) => {
    const studentSubs = submissions.filter((sub) => sub.student_id === student.id);

    // If a specific exam is selected
    if (selectedExamId !== "Semua Ujian") {
      const targetSub = studentSubs.find((sub) => sub.exam_id === selectedExamId);
      const scoreValue = targetSub && targetSub.status === "graded" ? targetSub.score : null;
      const statusLabel = targetSub ? targetSub.status : "belum_mengerjakan";
      return {
        student,
        scores: {
          [selectedExamId]: {
            score: scoreValue,
            status: statusLabel,
            submission_id: targetSub?.id ?? null,
          },
        },
        average: scoreValue ?? 0,
        completedCount: targetSub && targetSub.status !== "in_progress" ? 1 : 0,
      };
    }

    // If "Semua Ujian" is selected
    const scoresMap: Record<string, { score: number | null; status: string; submission_id: string | null }> = {};
    let totalScore = 0;
    let gradedCount = 0;
    let completedCount = 0;

    filteredExams.forEach((exam) => {
      const sub = studentSubs.find((s) => s.exam_id === exam.id);
      const scoreValue = sub && sub.status === "graded" ? sub.score : null;
      const statusLabel = sub ? sub.status : "belum_mengerjakan";

      scoresMap[exam.id] = {
        score: scoreValue,
        status: statusLabel,
        submission_id: sub?.id ?? null,
      };

      if (scoreValue !== null) {
        totalScore += scoreValue;
        gradedCount++;
      }
      if (sub && sub.status !== "in_progress") {
        completedCount++;
      }
    });

    const averageScore = gradedCount > 0 ? Math.round(totalScore / gradedCount) : 0;

    return {
      student,
      scores: scoresMap,
      average: averageScore,
      completedCount,
    };
  });

  // Calculate statistics for the summary cards
  const activeScores = reportRows
    .map((row) => {
      if (selectedExamId !== "Semua Ujian") {
        return row.scores[selectedExamId]?.score;
      }
      return row.average > 0 ? row.average : null;
    })
    .filter((v): v is number => v !== null && v !== undefined);

  const averageClassScore =
    activeScores.length > 0 ? Math.round(activeScores.reduce((a, b) => a + b, 0) / activeScores.length) : 0;

  const highestScore = activeScores.length > 0 ? Math.max(...activeScores) : 0;
  const lowestScore = activeScores.length > 0 ? Math.min(...activeScores) : 0;

  // Passing criteria (KKTP) is 60
  const passedStudentsCount = activeScores.filter((s) => s >= 60).length;
  const passRate = activeScores.length > 0 ? Math.round((passedStudentsCount / activeScores.length) * 100) : 0;

  // Sorting for Leaderboard (Ranking)
  const rankingRows = [...reportRows].sort((a, b) => b.average - a.average);

  // CSV Export handler
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";

    // Build Headers
    if (selectedExamId !== "Semua Ujian") {
      const examTitle = exams.find((e) => e.id === selectedExamId)?.title ?? "Ujian";
      csvContent += `Nama Siswa,Kelas,Email,Ujian,Skor,Status\n`;
      reportRows.forEach((row) => {
        const item = row.scores[selectedExamId];
        const scoreStr = item?.score !== null && item?.score !== undefined ? item.score : "—";
        const statusStr = item ? item.status : "Belum Mengerjakan";
        csvContent += `"${row.student.name}","${row.student.class_name ?? "—"}","${row.student.email}","${examTitle}",${scoreStr},"${statusStr}"\n`;
      });
    } else {
      // General report header
      let examHeaders = filteredExams.map((e) => `"${e.title}"`).join(",");
      csvContent += `Nama Siswa,Kelas,Email,${examHeaders},Rata-Rata Nilai\n`;
      reportRows.forEach((row) => {
        let studentScores = filteredExams
          .map((e) => {
            const item = row.scores[e.id];
            return item?.score !== null && item?.score !== undefined ? item.score : "—";
          })
          .join(",");
        csvContent += `"${row.student.name}","${row.student.class_name ?? "—"}","${row.student.email}",${studentScores},${row.average}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `Laporan_Ujian_${selectedClass.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in text-on-surface">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-2 font-black">Laporan & Rekap Ujian</h1>
          <p className="text-body-lg text-on-surface-variant">
            Evaluasi nilai, ranking prestasi, dan rekapitulasi ujian per kelas secara real-time.
          </p>
        </div>
        {!loading && !errorMsg && reportRows.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="bg-primary-fixed hover:bg-primary-fixed-dim text-on-primary-fixed px-6 py-3 font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-primary-fixed/20 uppercase tracking-wider text-xs"
          >
            <span className="material-symbols-outlined text-sm">download</span> Export CSV (Excel)
          </button>
        )}
      </div>

      {/* Dynamic Filters Grid */}
      <div className="bg-surface-container border border-outline-variant p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Class Filter */}
        <div className="space-y-2">
          <label className="text-xs uppercase text-primary-fixed font-bold block">Pilih Kelas Target</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedExamId("Semua Ujian"); // Reset selected exam on class change
            }}
            className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 font-bold focus:outline-none focus:border-primary-fixed"
          >
            <option value="Semua Kelas">Semua Kelas</option>
            {classList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Exam Filter */}
        <div className="space-y-2">
          <label className="text-xs uppercase text-primary-fixed font-bold block">Pilih Ujian Khusus</label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 font-bold focus:outline-none focus:border-primary-fixed"
          >
            <option value="Semua Ujian">Semua Ujian (Rangkuman Rata-Rata)</option>
            {filteredExams.map((e) => (
              <option key={e.id} value={e.id}>
                [{e.class_name}] {e.title} - {e.subject}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/60">
        <button
          onClick={() => setActiveTab("rekap")}
          className={`px-6 py-3 font-black uppercase tracking-wider text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "rekap"
              ? "border-primary-fixed text-primary-fixed bg-primary-fixed/5"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-sm">table_chart</span> Rekap Nilai Siswa
        </button>
        <button
          onClick={() => setActiveTab("ranking")}
          className={`px-6 py-3 font-black uppercase tracking-wider text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "ranking"
              ? "border-primary-fixed text-primary-fixed bg-primary-fixed/5"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-sm">leaderboard</span> Peringkat & Juara Kelas
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-5xl animate-spin text-primary-fixed">progress_activity</span>
          <p className="font-bold">Memproses database dan merekapitulasi laporan nilai...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-error/10 border border-error/30 p-6 text-center text-error space-y-3">
          <span className="material-symbols-outlined text-4xl">error</span>
          <p className="font-bold">{errorMsg}</p>
          <button
            onClick={fetchData}
            className="bg-error text-white px-6 py-2 text-xs font-bold uppercase tracking-wider"
          >
            Coba Lagi
          </button>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-surface-container border border-outline-variant p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-5xl text-outline">group_off</span>
          <h3 className="text-title-lg font-bold text-on-surface">Tidak Ada Siswa Terdaftar</h3>
          <p className="text-body-md text-on-surface-variant max-w-sm">
            Tidak ada siswa terdaftar untuk kelas <strong>{selectedClass}</strong> saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Statistics Recap Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Avg Card */}
            <div className="bg-surface-container border border-outline-variant p-5 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase text-outline font-black block">Rata-Rata Kelas</span>
                <span className="text-headline-md font-black text-on-surface mt-1 block">
                  {averageClassScore} <span className="text-body-sm font-normal text-outline">/ 100</span>
                </span>
              </div>
              <span className="material-symbols-outlined text-primary-fixed/40 text-3xl">insights</span>
            </div>

            {/* High Card */}
            <div className="bg-surface-container border border-outline-variant p-5 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase text-outline font-black block">Nilai Tertinggi</span>
                <span className="text-headline-md font-black text-on-surface mt-1 block text-green-400">
                  {highestScore}
                </span>
              </div>
              <span className="material-symbols-outlined text-green-400/40 text-3xl">emoji_events</span>
            </div>

            {/* Low Card */}
            <div className="bg-surface-container border border-outline-variant p-5 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase text-outline font-black block">Nilai Terendah</span>
                <span className="text-headline-md font-black text-on-surface mt-1 block text-error">
                  {lowestScore}
                </span>
              </div>
              <span className="material-symbols-outlined text-error/40 text-3xl">trending_down</span>
            </div>

            {/* Pass Rate Card */}
            <div className="bg-surface-container border border-outline-variant p-5 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase text-outline font-black block">Kelulusan KKTP</span>
                <span className="text-headline-md font-black text-on-surface mt-1 block text-primary-fixed">
                  {passRate}%
                </span>
              </div>
              <span className="material-symbols-outlined text-primary-fixed/40 text-3xl">check_circle</span>
            </div>
          </div>

          {/* TAB 1: Rekap Nilai Siswa */}
          {activeTab === "rekap" && (
            <div className="space-y-4">
              {/* Premium Column Control Banner */}
              {selectedExamId === "Semua Ujian" && searchedExamsForColumns.length > 5 && (
                <div className="bg-primary-fixed/5 border border-primary-fixed/20 p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
                  <div className="flex items-center gap-2 text-primary-fixed font-bold">
                    <span className="material-symbols-outlined text-sm">info</span>
                    <span>
                      Terdapat <strong className="text-on-surface">{searchedExamsForColumns.length}</strong> kolom ujian terdaftar. Menampilkan <strong className="text-on-surface">{displayedExams.length}</strong> kolom terbaru agar tampilan tetap rapi.
                    </span>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <input
                      type="text"
                      placeholder="Cari kolom ujian..."
                      value={examColumnSearch}
                      onChange={(e) => setExamColumnSearch(e.target.value)}
                      className="bg-surface-container-high border border-outline-variant text-on-surface px-3 py-1.5 font-bold focus:outline-none focus:border-primary-fixed text-xs flex-1 md:w-44 md:flex-none"
                    />
                    <button
                      onClick={() => setShowAllColumns(!showAllColumns)}
                      className="bg-primary-fixed text-on-primary-fixed px-3 py-1.5 font-black uppercase tracking-wider text-[10px] hover:bg-primary-fixed-dim transition-colors cursor-pointer"
                    >
                      {showAllColumns ? "Tampilkan Lebih Sedikit" : "Tampilkan Semua"}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-surface-container border border-outline-variant overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-high border-b border-outline-variant text-xs font-bold uppercase tracking-wider text-outline">
                        <th className="p-4">Identitas Siswa</th>
                        <th className="p-4">Kelas</th>
                        {selectedExamId !== "Semua Ujian" ? (
                          <>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-center">Skor Ujian</th>
                          </>
                        ) : (
                          <>
                            {displayedExams.map((e) => (
                              <th key={e.id} className="p-4 text-center text-[10px] max-w-[120px] truncate" title={e.title}>
                                {e.title}
                              </th>
                            ))}
                            <th className="p-4 text-center bg-primary-fixed/5 text-primary-fixed font-black">Rata-Rata</th>
                          </>
                        )}
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {reportRows.map((row) => (
                      <tr key={row.student.id} className="hover:bg-surface-container-high/30 transition-colors">
                        {/* Student Details */}
                        <td className="p-4">
                          <div className="font-bold text-on-surface text-body-md">{row.student.name}</div>
                          <div className="text-xs text-on-surface-variant font-mono mt-0.5">{row.student.email}</div>
                        </td>

                        {/* Class */}
                        <td className="p-4 text-body-sm text-on-surface-variant font-semibold">
                          {row.student.class_name ?? "—"}
                        </td>

                        {/* Specific Exam Score */}
                        {selectedExamId !== "Semua Ujian" ? (
                          <>
                            <td className="p-4 text-center">
                              {(() => {
                                const item = row.scores[selectedExamId];
                                if (!item || item.status === "belum_mengerjakan") {
                                  return (
                                    <span className="inline-block px-2.5 py-0.5 text-[9px] font-bold border border-outline-variant text-outline bg-surface-container uppercase">
                                      Belum Mengambil
                                    </span>
                                  );
                                }
                                if (item.status === "in_progress") {
                                  return (
                                    <span className="inline-block px-2.5 py-0.5 text-[9px] font-bold bg-warning/10 text-warning border border-warning/30 uppercase animate-pulse">
                                      Sedang Ujian
                                    </span>
                                  );
                                }
                                if (item.status === "submitted") {
                                  return (
                                    <span className="inline-block px-2.5 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                                      Belum Dinilai
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-block px-2.5 py-0.5 text-[9px] font-bold bg-success-container/20 text-on-success-container border border-success/30 uppercase">
                                    Selesai
                                  </span>
                                );
                              })()}
                            </td>

                            <td className="p-4 text-center">
                              {(() => {
                                const item = row.scores[selectedExamId];
                                if (!item || item.score === null) {
                                  return <span className="text-outline font-bold italic text-xs">—</span>;
                                }
                                return (
                                  <span
                                    className={`px-3 py-1 font-mono text-xs font-black ${
                                      item.score >= 80
                                        ? "text-primary-fixed bg-primary-fixed/10"
                                        : item.score >= 60
                                        ? "text-warning bg-warning/10"
                                        : "text-error bg-error/10"
                                    }`}
                                  >
                                    {item.score}
                                  </span>
                                );
                              })()}
                            </td>
                          </>
                        ) : (
                          // All Exams Scores
                          <>
                            {displayedExams.map((exam) => {
                              const item = row.scores[exam.id];
                              if (!item || item.status === "belum_mengerjakan") {
                                return (
                                  <td key={exam.id} className="p-4 text-center text-xs text-outline/40 font-bold">
                                    —
                                  </td>
                                );
                              }
                              if (item.status === "in_progress") {
                                return (
                                  <td key={exam.id} className="p-4 text-center text-xs text-warning/70 font-bold animate-pulse">
                                    Aktif
                                  </td>
                                );
                              }
                              if (item.score === null) {
                                return (
                                  <td key={exam.id} className="p-4 text-center text-[10px] text-blue-400 font-bold italic">
                                    Koreksi
                                  </td>
                                );
                              }
                              return (
                                <td key={exam.id} className="p-4 text-center font-mono text-body-sm font-semibold">
                                  {item.score}
                                </td>
                              );
                            })}
                            {/* Student average */}
                            <td className="p-4 text-center bg-primary-fixed/5 font-mono text-body-md font-black text-primary-fixed">
                              {row.average}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}

          {/* TAB 2: Peringkat & Juara Kelas */}
          {activeTab === "ranking" && (
            <div className="max-w-3xl mx-auto space-y-6">
              {rankingRows.map((row, idx) => {
                const rankNum = idx + 1;
                // Style cards differently for podium finishes
                const isGold = rankNum === 1;
                const isSilver = rankNum === 2;
                const isBronze = rankNum === 3;

                return (
                  <div
                    key={row.student.id}
                    className={`bg-surface-container border p-5 flex items-center justify-between gap-4 transition-transform hover:-translate-y-0.5 relative ${
                      isGold
                        ? "border-amber-400/50 bg-amber-400/5 shadow-amber-400/5 shadow-lg"
                        : isSilver
                        ? "border-slate-300/40 bg-slate-300/5"
                        : isBronze
                        ? "border-amber-700/40 bg-amber-700/5"
                        : "border-outline-variant"
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-12 h-12 flex items-center justify-center font-black text-xl rounded-full border ${
                          isGold
                            ? "bg-amber-400 text-black border-amber-400"
                            : isSilver
                            ? "bg-slate-300 text-black border-slate-300"
                            : isBronze
                            ? "bg-amber-700 text-white border-amber-700"
                            : "bg-surface-container-high text-on-surface-variant border-outline-variant"
                        }`}
                      >
                        {rankNum}
                      </div>

                      {/* Student Info */}
                      <div>
                        <div className="font-bold text-on-surface text-body-lg flex items-center gap-2">
                          {row.student.name}
                          {isGold && (
                            <span className="material-symbols-outlined text-amber-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                              emoji_events
                            </span>
                          )}
                          {(isSilver || isBronze) && (
                            <span className="material-symbols-outlined text-slate-400 text-base">emoji_events</span>
                          )}
                        </div>
                        <div className="text-xs text-on-surface-variant flex items-center gap-2 mt-1">
                          <span className="font-mono">{row.student.email}</span>
                          <span>•</span>
                          <span className="font-bold">{row.student.class_name ?? "—"}</span>
                          <span>•</span>
                          <span className="text-outline">Mengerjakan {row.completedCount} Ujian</span>
                        </div>
                      </div>
                    </div>

                    {/* Rank Score */}
                    <div className="text-right">
                      <span className="text-xs text-outline block uppercase tracking-wider font-bold">Skor Rata-Rata</span>
                      <span
                        className={`text-headline-md font-black font-mono block mt-1 ${
                          isGold ? "text-amber-400" : isSilver ? "text-slate-300" : "text-on-surface"
                        }`}
                      >
                        {row.average}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
