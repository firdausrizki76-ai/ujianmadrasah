"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: "siswa" | "guru" | "admin";
  nisn: string | null;
  class_name: string | null;
  subject: string | null;
  session_id: string | null;
  created_at: string;
};

type FormData = {
  name: string;
  email: string;
  password: string;
  role: "siswa" | "guru" | "admin";
  nisn: string;
  class_name: string;
  subject: string;
  session_id: string;
};

const ROLE_LABEL: Record<string, string> = {
  siswa: "Siswa",
  guru: "Guru",
  admin: "Admin",
};

const ROLE_BADGE: Record<string, string> = {
  siswa: "bg-blue-500/20 text-blue-400",
  guru: "bg-primary-fixed/20 text-primary-fixed",
  admin: "bg-error/20 text-error",
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("semua");

  // File Import State (CSV / Excel)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importError, setImportError] = useState("");
  const [bulkResult, setBulkResult] = useState<any>(null);

  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    role: "siswa",
    nisn: "",
    class_name: "",
    subject: "",
    session_id: "",
  });
  const [sessions, setSessions] = useState<any[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchUsers();
    fetchSessions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Gagal membuat akun.");
        return;
      }
      setSuccessMsg(`Akun "${form.name}" berhasil dibuat!`);
      setShowModal(false);
      setForm({ name: "", email: "", password: "", role: "siswa", nisn: "", class_name: "", subject: "", session_id: "" });
      fetchUsers();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setErrorMsg("Terjadi kesalahan server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Unified File Change Handler with lazy loading for Excel/CSV
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError("");
    setBulkResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(fileExt || "")) {
      setImportError("File harus berformat Excel (.xlsx, .xls) atau CSV (.csv)");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();

    if (fileExt === "csv") {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        parseCsvText(text);
      };
      reader.readAsText(file);
    } else {
      // Dynamically load SheetJS on demand to keep initial Vercel bundle tiny!
      try {
        const XLSX = await import("xlsx");
        reader.onload = (event) => {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          try {
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (json.length <= 1) {
              setImportError("File Excel kosong atau hanya berisi header.");
              return;
            }

            const headers = json[0].map((h: any) => String(h).trim().toLowerCase());
            
            const parsed: any[] = [];
            for (let i = 1; i < json.length; i++) {
              const row = json[i];
              if (row.length === 0 || row.every((cell: any) => cell === null || cell === "")) continue;

              const rowData: any = {};
              headers.forEach((header: string, index: number) => {
                rowData[header] = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : "";
              });

              const role = rowData.role?.toLowerCase() || "siswa";
              const finalRole = ["siswa", "guru", "admin"].includes(role) ? role : "siswa";

              parsed.push({
                name: rowData.nama || rowData.name || "",
                email: rowData.email || "",
                password: rowData.password || "password123",
                role: finalRole,
                nisn: rowData.nisn || "",
                class_name: rowData.kelas || rowData.class_name || "",
                subject: rowData.mapel || rowData.subject || "",
              });
            }

            setParsedData(parsed);
          } catch (err) {
            setImportError("Gagal membaca file Excel. Pastikan file tidak rusak.");
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (err) {
        setImportError("Gagal memuat parser Excel.");
      }
    }
  };

  // CSV Parsing fallback
  const parseCsvText = (text: string) => {
    const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length <= 1) {
      setImportError("File CSV kosong atau hanya berisi header.");
      return;
    }

    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());

    const parsed: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
      const rowData: any = {};
      headers.forEach((header, index) => {
        rowData[header] = cols[index] || "";
      });

      const role = rowData.role?.toLowerCase() || "siswa";
      const finalRole = ["siswa", "guru", "admin"].includes(role) ? role : "siswa";

      parsed.push({
        name: rowData.nama || rowData.name || "",
        email: rowData.email || "",
        password: rowData.password || "password123",
        role: finalRole,
        nisn: rowData.nisn || "",
        class_name: rowData.kelas || rowData.class_name || "",
        subject: rowData.mapel || rowData.subject || "",
      });
    }

    setParsedData(parsed);
  };

  const handleBulkSubmit = async () => {
    if (parsedData.length === 0) return;
    setBulkSubmitting(true);
    setImportError("");
    setBulkResult(null);

    try {
      const res = await fetch("/api/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: parsedData }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Gagal memproses impor massal.");
        return;
      }

      setBulkResult(data.results);
      setSuccessMsg(`Berhasil mengimpor massal! ${data.results.successCount} akun terdaftar.`);
      setParsedData([]);
      setSelectedFile(null);
      fetchUsers();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch {
      setImportError("Terjadi kesalahan server saat upload.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const downloadTemplateExcel = async () => {
    try {
      // Dynamic import SheetJS to keep Vercel bundle small
      const XLSX = await import("xlsx");
      const wsData = [
        ["nama", "email", "password", "role", "nisn", "kelas", "mapel"],
        ["Ahmad Dani", "dani@mtsalinsani.sch.id", "santri123", "siswa", "0098765432", "Kelas IX-A", ""],
        ["Ustadzah Laili", "laili@mtsalinsani.sch.id", "guru123", "guru", "", "", "Bahasa Arab"],
        ["Admin Madrasah", "admin2@mtsalinsani.sch.id", "admin1234", "admin", "", "", ""]
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Template Import");
      XLSX.writeFile(wb, "template_import_user.xlsx");
    } catch {
      alert("Gagal men-download template. Coba lagi.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchRole = filterRole === "semua" || u.role === filterRole;
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.nisn ?? "").includes(search) ||
      (u.class_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.subject ?? "").toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-2">Manajemen User</h1>
          <p className="text-body-lg text-on-surface-variant">
            Kelola data akun siswa, guru, dan admin madrasah secara manual maupun impor massal Excel/CSV.
          </p>
        </div>
        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => { setShowBulkModal(true); setImportError(""); setBulkResult(null); }}
            className="flex-1 sm:flex-none border border-outline-variant hover:border-primary-fixed/50 hover:text-primary-fixed text-on-surface-variant px-6 py-3 font-bold transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">upload_file</span>
            Impor Massal (Excel / CSV)
          </button>
          <button
            onClick={() => { setShowModal(true); setErrorMsg(""); }}
            className="flex-1 sm:flex-none bg-primary-fixed text-on-primary-fixed px-6 py-3 font-bold hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">person_add</span>
            Tambah User
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="bg-primary-fixed/10 border border-primary-fixed/30 text-primary-fixed px-4 py-3 flex items-center gap-2 text-sm font-bold">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {successMsg}
        </div>
      )}

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-xl">search</span>
          <input
            className="w-full bg-surface-container border border-outline-variant text-on-surface pl-12 pr-4 py-3 outline-none focus:border-primary-fixed transition-colors text-body-md"
            placeholder="Cari nama, email, NISN, kelas, mapel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {["semua", "siswa", "guru", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-4 py-3 text-body-md font-bold capitalize transition-colors border shrink-0 ${
                filterRole === r
                  ? "bg-primary-fixed text-on-primary-fixed border-primary-fixed"
                  : "border-outline-variant text-on-surface-variant hover:border-primary-fixed/50"
              }`}
            >
              {r === "semua" ? "Semua" : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Siswa", role: "siswa", icon: "school" },
          { label: "Total Guru", role: "guru", icon: "person_book" },
          { label: "Total Admin", role: "admin", icon: "admin_panel_settings" },
        ].map((s) => (
          <div key={s.role} className="bg-surface-container border border-outline-variant p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-on-surface-variant uppercase font-bold">{s.label}</span>
              <p className="text-headline-md text-on-surface font-black mt-1">
                {users.filter((u) => u.role === s.role).length}
              </p>
            </div>
            <span className="material-symbols-outlined text-primary-fixed/50 text-4xl">{s.icon}</span>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-surface-container border border-outline-variant overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl animate-spin">progress_activity</span>
            <p>Memuat data user...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl">manage_accounts</span>
            <p>{search ? "Tidak ada user yang cocok." : "Belum ada user. Klik 'Tambah User' atau 'Impor Massal' untuk mulai."}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant text-xs uppercase font-bold tracking-wider">
                <th className="text-left p-4">Nama</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">NISN / ID</th>
                <th className="text-left p-4">Detail Info</th>
                <th className="text-left p-4">Role</th>
                <th className="text-left p-4">Terdaftar</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => (
                <tr
                  key={u.id}
                  className={`border-b border-outline-variant/40 hover:bg-surface-container-high transition-colors ${i % 2 === 0 ? "" : "bg-surface/30"}`}
                >
                  <td className="p-4 font-medium text-on-surface">{u.name}</td>
                  <td className="p-4 text-on-surface-variant">{u.email}</td>
                  <td className="p-4 text-on-surface-variant font-mono text-xs">{u.nisn ?? "—"}</td>
                  <td className="p-4 text-on-surface font-bold text-xs space-y-1">
                    {u.role === "siswa" && (
                      <>
                        <span className="text-blue-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">door_sliding</span>
                          {u.class_name ?? "Belum ada Kelas"}
                        </span>
                        {u.session_id && (
                          <span className="text-primary-fixed flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">alarm</span>
                            {sessions.find((s) => s.id === u.session_id)?.name ?? "Sesi Lain"}
                          </span>
                        )}
                      </>
                    )}
                    {u.role === "guru" && (
                      <span className="text-primary-fixed flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">menu_book</span>
                        {u.subject ?? "Umum / Belum Set"}
                      </span>
                    )}
                    {u.role === "admin" && <span className="text-on-surface-variant font-normal">—</span>}
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${ROLE_BADGE[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="p-4 text-on-surface-variant">
                    {new Date(u.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ======== MODAL IMPOOR MASSAL (EXCEL / CSV) ======== */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant shrink-0">
              <div>
                <h2 className="text-headline-md text-on-surface font-bold">Impor Massal via Excel / CSV</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">Daftarkan ratusan akun siswa & guru secara instan sekali unggah.</p>
              </div>
              <button
                onClick={() => { setShowBulkModal(false); setParsedData([]); setSelectedFile(null); }}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                close
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {importError && (
                <div className="bg-error/10 border border-error/40 text-error text-sm px-4 py-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {importError}
                </div>
              )}

              {/* Step 1: Download Template */}
              <div className="bg-surface border border-outline-variant/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-body-md font-bold text-on-surface">1. Unduh Template Excel (.xlsx)</h4>
                  <p className="text-xs text-on-surface-variant">Gunakan struktur kolom yang tepat agar tidak terjadi kesalahan impor.</p>
                </div>
                <button
                  onClick={downloadTemplateExcel}
                  className="bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/80 px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  Template_Impor.xlsx
                </button>
              </div>

              {/* Step 2: Upload Area */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block">2. Unggah File Excel / CSV</label>
                <div className="border-2 border-dashed border-outline-variant/80 hover:border-primary-fixed/50 transition-colors p-8 text-center flex flex-col items-center justify-center relative cursor-pointer group">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={bulkSubmitting}
                  />
                  <span className="material-symbols-outlined text-primary-fixed/60 group-hover:text-primary-fixed text-5xl mb-2 transition-colors">
                    cloud_upload
                  </span>
                  <p className="text-body-md font-bold text-on-surface">
                    {selectedFile ? selectedFile.name : "Klik atau seret file Excel/CSV ke sini"}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {selectedFile ? `Ukuran: ${(selectedFile.size / 1024).toFixed(1)} KB` : "Menerima format file .xlsx, .xls, atau .csv"}
                  </p>
                </div>
              </div>

              {/* Bulk Results Summary */}
              {bulkResult && (
                <div className="bg-surface border border-outline-variant p-4 space-y-3">
                  <h4 className="text-body-md font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-fixed">task_alt</span>
                    Hasil Impor Massal
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div className="bg-primary-fixed/15 text-primary-fixed p-3 text-center border border-primary-fixed/20">
                      {bulkResult.successCount} Sukses
                    </div>
                    <div className="bg-error/15 text-error p-3 text-center border border-error/20">
                      {bulkResult.failedCount} Gagal
                    </div>
                  </div>
                  {bulkResult.errors.length > 0 && (
                    <div className="pt-2 border-t border-outline-variant/30 space-y-1 max-h-32 overflow-y-auto">
                      <p className="text-xs font-bold text-error">Detail Kegagalan:</p>
                      {bulkResult.errors.map((e: any, idx: number) => (
                        <p key={idx} className="text-[11px] text-on-surface-variant font-mono">
                          ❌ {e.email}: {e.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Parsed Data Preview */}
              {parsedData.length > 0 && (
                <div className="space-y-2 shrink-0">
                  <div className="flex justify-between items-center text-label-sm text-on-surface-variant uppercase tracking-wider">
                    <span>3. Pratinjau Data ({parsedData.length} Baris Terdeteksi)</span>
                    <span className="text-primary-fixed font-bold">Siap diimpor</span>
                  </div>
                  <div className="border border-outline-variant overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead className="bg-surface-container text-on-surface-variant uppercase font-bold sticky top-0">
                        <tr>
                          <th className="text-left p-2">Nama</th>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Role</th>
                          <th className="text-left p-2">Info Khusus</th>
                          <th className="text-left p-2">NISN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 10).map((p, idx) => (
                          <tr key={idx} className="border-b border-outline-variant/30">
                            <td className="p-2 font-medium text-on-surface">{p.name}</td>
                            <td className="p-2 text-on-surface-variant">{p.email}</td>
                            <td className="p-2 text-on-surface-variant capitalize">{p.role}</td>
                            <td className="p-2 text-primary-fixed font-bold">
                              {p.role === "siswa" ? `Kelas: ${p.class_name || "—"}` : ""}
                              {p.role === "guru" ? `Mapel: ${p.subject || "—"}` : ""}
                            </td>
                            <td className="p-2 text-on-surface-variant font-mono">{p.nisn || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.length > 10 && (
                      <div className="p-2 text-center text-[10px] text-on-surface-variant bg-surface/80 border-t border-outline-variant/30">
                        Menampilkan 10 dari {parsedData.length} baris data...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-outline-variant shrink-0 bg-surface-container/30 flex gap-3">
              <button
                type="button"
                onClick={() => { setShowBulkModal(false); setParsedData([]); setSelectedFile(null); }}
                className="flex-1 border border-outline-variant text-on-surface-variant py-3 hover:border-outline hover:text-on-surface transition-colors font-bold text-sm"
                disabled={bulkSubmitting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                className="flex-1 bg-primary-fixed text-on-primary-fixed py-3 font-bold hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                disabled={bulkSubmitting || parsedData.length === 0}
              >
                {bulkSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    Memproses {parsedData.length} Akun...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">upload_file</span>
                    Impor Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======== MODAL TAMBAH USER (MANUAL) ======== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant w-full max-w-lg shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant">
              <div>
                <h2 className="text-headline-md text-on-surface font-bold">Tambah Akun Baru</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">Akun dapat langsung digunakan untuk login.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                close
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {errorMsg && (
                <div className="bg-error/10 border border-error/40 text-error text-sm px-4 py-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {errorMsg}
                </div>
              )}

              {/* Role Selector */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Role Akun</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["siswa", "guru", "admin"] as const).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setForm({ ...form, role: r })}
                      className={`py-3 text-sm font-bold capitalize border transition-colors ${
                        form.role === r
                          ? "bg-primary-fixed text-on-primary-fixed border-primary-fixed"
                          : "border-outline-variant text-on-surface-variant hover:border-primary-fixed/50"
                      }`}
                    >
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Nama Lengkap *</label>
                <input
                  className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md"
                  placeholder="Contoh: Ahmad Dani Pratama"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Email *</label>
                <input
                  className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md"
                  placeholder="contoh@mtsalinsani.sch.id"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>

              {/* NISN (only for siswa) */}
              {form.role === "siswa" && (
                <div className="space-y-2">
                  <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">NISN</label>
                  <input
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md font-mono"
                    placeholder="0012345678"
                    value={form.nisn}
                    onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                    disabled={submitting}
                  />
                </div>
              )}

              {/* Class Name (only for siswa) */}
              {form.role === "siswa" && (
                <div className="space-y-2">
                  <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Kelas *</label>
                  <input
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md"
                    placeholder="Contoh: Kelas IX-A"
                    value={form.class_name}
                    onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>
              )}

              {/* Session Selection (only for siswa) */}
              {form.role === "siswa" && (
                <div className="space-y-2">
                  <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Sesi Ujian</label>
                  <select
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md cursor-pointer"
                    value={form.session_id}
                    onChange={(e) => setForm({ ...form, session_id: e.target.value })}
                    disabled={submitting}
                  >
                    <option value="">-- Tanpa Sesi (Semua Sesi) --</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject (only for guru) */}
              {form.role === "guru" && (
                <div className="space-y-2">
                  <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Guru Mapel *</label>
                  <input
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md"
                    placeholder="Contoh: Bahasa Arab, Fikih, Sejarah"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Password *</label>
                <input
                  className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-3 outline-none focus:border-primary-fixed transition-colors text-body-md"
                  placeholder="Minimal 8 karakter"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  disabled={submitting}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
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
                      Buat Akun
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
