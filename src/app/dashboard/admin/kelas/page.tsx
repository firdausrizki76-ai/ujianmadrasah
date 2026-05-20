"use client";

import { useEffect, useState } from "react";

type ClassItem = {
  id: string;
  name: string;
  level: number | null;
  created_at: string;
  wali_kelas_id: string | null;
  wali_kelas_name: string | null;
  wali_kelas_email: string | null;
};

type Teacher = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
};

export default function AdminKelas() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");

  // Create Class Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newWaliId, setNewWaliId] = useState("");

  // Edit Wali Kelas Modal States
  const [showEditWaliModal, setShowEditWaliModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedWaliId, setSelectedWaliId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // 1. Fetch Classes
      const classesRes = await fetch("/api/classes");
      const classesData = await classesRes.json();
      if (classesRes.ok) {
        setClasses(classesData.classes ?? []);
      } else {
        throw new Error(classesData.error || "Gagal memuat data kelas.");
      }

      // 2. Fetch Users to filter teachers
      const usersRes = await fetch("/api/users");
      const usersData = await usersRes.json();
      if (usersRes.ok) {
        const allUsers = usersData.users ?? [];
        const filteredTeachers = allUsers.filter((u: any) => u.role === "guru");
        setTeachers(filteredTeachers);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setErrorMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClassName,
          wali_kelas_id: newWaliId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Gagal menambahkan kelas.");
        return;
      }

      setSuccessMsg(`Kelas "${newClassName}" berhasil dibuat!`);
      setShowCreateModal(false);
      setNewClassName("");
      setNewWaliId("");
      fetchData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setErrorMsg("Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateWali = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    setErrorMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/classes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedClass.id,
          wali_kelas_id: selectedWaliId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Gagal memperbarui wali kelas.");
        return;
      }

      setSuccessMsg(`Wali kelas "${selectedClass.name}" berhasil diperbarui!`);
      setShowEditWaliModal(false);
      setSelectedClass(null);
      setSelectedWaliId("");
      fetchData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setErrorMsg("Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    const confirmAction = confirm(
      `Apakah Anda yakin ingin menghapus kelas "${className}"?\nSiswa yang berada di kelas ini tidak akan dihapus, tetapi nama kelas pada profil mereka akan kehilangan asosiasi.`
    );
    if (!confirmAction) return;

    setErrorMsg("");
    try {
      const res = await fetch(`/api/classes?class_id=${classId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Gagal menghapus kelas.");
        return;
      }

      setSuccessMsg(`Kelas "${className}" berhasil dihapus.`);
      fetchData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setErrorMsg("Gagal menghubungi server.");
    }
  };

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.wali_kelas_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-2 font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-primary-fixed">meeting_room</span>
            Manajemen Kelas
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Kelola daftar kelas MTs. Al-Insani Teratau dan tetapkan wali kelas untuk masing-masing kelas.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setErrorMsg("");
          }}
          className="w-full sm:w-auto bg-primary-fixed text-on-primary-fixed px-6 py-3 font-bold hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add_home</span>
          Tambah Kelas Baru
        </button>
      </div>

      {/* Success/Error Alerts */}
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

      {/* Filter and Search Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-xl">search</span>
          <input
            className="w-full bg-surface-container border border-outline-variant text-on-surface pl-12 pr-4 py-3 outline-none focus:border-primary-fixed transition-colors text-body-md"
            placeholder="Cari nama kelas atau wali kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-surface-container border border-outline-variant overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl animate-spin text-primary-fixed">progress_activity</span>
            <p>Memuat data kelas...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl">meeting_room</span>
            <p>{search ? "Tidak ada kelas yang cocok." : "Belum ada kelas terdaftar. Kelas akan bertambah otomatis saat pendaftaran siswa baru atau ditambahkan manual."}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant text-xs uppercase font-bold tracking-wider">
                <th className="text-left p-4">Nama Kelas</th>
                <th className="text-left p-4">Wali Kelas</th>
                <th className="text-left p-4">Email Wali Kelas</th>
                <th className="text-right p-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((cls, i) => (
                <tr
                  key={cls.id}
                  className={`border-b border-outline-variant/40 hover:bg-surface-container-high transition-colors ${
                    i % 2 === 0 ? "" : "bg-surface/30"
                  }`}
                >
                  <td className="p-4 font-bold text-on-surface text-base">
                    {cls.name}
                  </td>
                  <td className="p-4">
                    {cls.wali_kelas_name ? (
                      <span className="font-semibold text-primary-fixed bg-primary-fixed/10 px-3 py-1 rounded">
                        {cls.wali_kelas_name}
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-variant bg-surface-container-high border border-outline-variant/30 px-3 py-1 rounded italic font-medium">
                        Belum Ditentukan
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-on-surface-variant font-mono">
                    {cls.wali_kelas_email ?? "—"}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedClass(cls);
                          setSelectedWaliId(cls.wali_kelas_id ?? "");
                          setShowEditWaliModal(true);
                        }}
                        className="px-3 py-1.5 bg-surface-container border border-outline-variant hover:border-primary-fixed/50 hover:text-primary-fixed text-on-surface font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="Atur Wali Kelas"
                      >
                        <span className="material-symbols-outlined text-sm">person_pin</span>
                        Atur Wali Kelas
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                        className="px-3 py-1.5 border border-error/30 text-error hover:bg-error/10 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="Hapus Kelas"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Tambah Kelas Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateClass}
            className="bg-surface-container border border-outline-variant p-8 max-w-[460px] w-full shadow-2xl relative space-y-6"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-primary-fixed"></div>
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
              <h3 className="text-headline-md font-black text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-fixed">add_home</span>
                Tambah Kelas Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                close
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-body-sm font-bold text-on-surface block">Nama Kelas *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas VII-A"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-surface border border-outline-variant text-on-surface px-4 py-3 outline-none focus:border-primary-fixed transition-colors font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-body-sm font-bold text-on-surface block">Wali Kelas (Opsional)</label>
                <select
                  value={newWaliId}
                  onChange={(e) => setNewWaliId(e.target.value)}
                  className="w-full bg-surface border border-outline-variant text-on-surface px-3 py-3 outline-none focus:border-primary-fixed transition-colors font-medium cursor-pointer"
                >
                  <option value="">— Pilih Wali Kelas —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject ?? "Guru"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 border-2 border-outline-variant text-on-surface py-3 font-bold hover:bg-surface-container-high transition-colors cursor-pointer uppercase tracking-wider text-xs"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary-fixed text-on-primary-fixed py-3 font-black hover:bg-primary-fixed-dim transition-all cursor-pointer uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                disabled={submitting}
              >
                {submitting ? "Menyimpan..." : "Simpan Kelas"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Atur Wali Kelas */}
      {showEditWaliModal && selectedClass && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <form
            onSubmit={handleUpdateWali}
            className="bg-surface-container border border-outline-variant p-8 max-w-[460px] w-full shadow-2xl relative space-y-6"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-primary-fixed"></div>
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
              <h3 className="text-headline-md font-black text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-fixed">person_pin</span>
                Atur Wali Kelas
              </h3>
              <button
                type="button"
                onClick={() => setShowEditWaliModal(false)}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">MENGATUR WALI KELAS UNTUK:</p>
                <h4 className="text-xl font-bold text-on-surface mt-1">{selectedClass.name}</h4>
              </div>

              <div className="space-y-2">
                <label className="text-body-sm font-bold text-on-surface block">Pilih Wali Kelas</label>
                <select
                  value={selectedWaliId}
                  onChange={(e) => setSelectedWaliId(e.target.value)}
                  className="w-full bg-surface border border-outline-variant text-on-surface px-3 py-3 outline-none focus:border-primary-fixed transition-colors font-medium cursor-pointer"
                >
                  <option value="">— Tidak Ada / Hapus Wali Kelas —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject ?? "Guru"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowEditWaliModal(false)}
                className="flex-1 border-2 border-outline-variant text-on-surface py-3 font-bold hover:bg-surface-container-high transition-colors cursor-pointer uppercase tracking-wider text-xs"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary-fixed text-on-primary-fixed py-3 font-black hover:bg-primary-fixed-dim transition-all cursor-pointer uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                disabled={submitting}
              >
                {submitting ? "Memproses..." : "Terapkan Wali"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
