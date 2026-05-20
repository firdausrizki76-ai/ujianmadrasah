export default function DashboardAdmin() {
  return (
    <div>
      <h1 className="text-headline-lg text-on-surface mb-2">Dashboard Admin</h1>
      <p className="text-body-lg text-on-surface-variant mb-8">Ringkasan sistem dan manajemen pengguna.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-surface-container border border-outline-variant p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-headline-md text-on-surface">Manajemen User</h3>
              <p className="text-body-md text-on-surface-variant mt-1">300 Siswa, 20 Guru</p>
            </div>
            <span className="material-symbols-outlined text-primary-fixed text-3xl">manage_accounts</span>
          </div>
          <a href="/dashboard/admin/users" className="mt-4 bg-surface-container-high text-on-surface py-3 text-center rounded text-body-md font-bold transition-all hover:bg-surface-container-highest">
            Kelola User
          </a>
        </div>

        <div className="bg-surface-container border border-outline-variant p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-headline-md text-on-surface">Laporan Sistem</h3>
              <p className="text-body-md text-on-surface-variant mt-1">Status: Normal</p>
            </div>
            <span className="material-symbols-outlined text-primary-fixed text-3xl">analytics</span>
          </div>
          <a href="/dashboard/admin/laporan" className="mt-4 bg-surface-container-high text-on-surface py-3 text-center rounded text-body-md font-bold transition-all hover:bg-surface-container-highest">
            Lihat Laporan
          </a>
        </div>
      </div>
    </div>
  );
}
