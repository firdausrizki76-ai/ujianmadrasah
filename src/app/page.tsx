"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";

function LoginThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center bg-surface-container border border-outline-variant hover:border-primary-fixed/60 shadow-lg transition-all cursor-pointer group"
      title={theme === "dark" ? "Aktifkan Light Mode" : "Aktifkan Dark Mode"}
    >
      <span
        className={`material-symbols-outlined text-xl transition-all duration-300 ${
          theme === "dark"
            ? "text-yellow-400 group-hover:text-yellow-300"
            : "text-blue-500 group-hover:text-blue-400"
        }`}
        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
      >
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [animate, setAnimate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setAnimate(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Login gagal.");
        return;
      }
      // Store session & user info
      localStorage.setItem("session", JSON.stringify(data.session));
      localStorage.setItem("user", JSON.stringify(data.user));
      // Redirect by role
      const role: string = data.user.role;
      if (role === "admin") router.push("/dashboard/admin");
      else if (role === "guru") router.push("/dashboard/guru");
      else router.push("/dashboard/siswa");
    } catch {
      setErrorMsg("Terjadi kesalahan. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden relative">
      {/* Floating Theme Toggle - top right corner */}
      <LoginThemeToggle />
      {/* Left Panel - Premium Cover Image (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 bg-black border-r border-outline-variant/30 overflow-hidden">
        <Image
          src="/revisifotosiswa2.png"
          alt="Ilustrasi Siswa Ujian"
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={`object-cover object-[center_30%] transition-all duration-[1200ms] ease-out ${
            animate ? "translate-y-0 opacity-80" : "translate-y-24 opacity-0"
          }`}
          priority
        />
        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/20" />
        
        {/* Top Logo / Badges */}
        <div className={`relative z-10 flex items-center gap-4 transition-all duration-1000 ease-out ${
          animate ? "translate-y-0 opacity-100" : "-translate-y-12 opacity-0"
        }`}>
          <Image
            src="/Logomadrasah.png"
            alt="Logo Madrasah"
            width={60}
            height={60}
          />
          <div className="flex flex-col">
            <span className="font-headline-md text-primary-fixed text-lg font-bold leading-tight">
              MTs. Al-Insani Teratau
            </span>
            <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
              Madrasah Tsanawiyah
            </span>
          </div>
        </div>

        {/* Bottom Inspirational Text */}
        <div className={`relative z-10 max-w-lg mb-8 transition-all duration-[1200ms] delay-300 ease-out ${
          animate ? "translate-x-0 opacity-100" : "-translate-x-20 opacity-0"
        }`}>
          <div className="flex items-center gap-2 mb-6">
            <span className="bg-primary-fixed text-on-primary-fixed text-[10px] px-3 py-1 font-black rounded-full uppercase tracking-widest">
              Portal Resmi
            </span>
            <span className="border border-outline-variant text-on-surface-variant text-[10px] px-3 py-1 font-black rounded-full uppercase tracking-widest bg-surface/50 backdrop-blur-sm">
              CBT System
            </span>
          </div>
          <h2 className="text-4xl font-headline-md font-bold text-on-surface mb-4 leading-snug">
            Integritas dan Kejujuran <br/> 
            <span className="text-primary-fixed">dalam Genggaman.</span>
          </h2>
          <p className="text-on-surface-variant text-body-lg leading-relaxed">
            Sistem Ujian Madrasah Digital (CBT) MTs. Al-Insani Teratau memfasilitasi pelaksanaan ujian dengan standar keamanan mutakhir, pemantauan real-time, dan kenyamanan akses bagi seluruh santri.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-24 bg-background relative z-10">
        
        {/* Mobile Header (Only visible on small screens) */}
        <header className="mb-12 text-center w-full max-w-[440px] lg:hidden">
          <div className="flex items-center justify-center gap-3 mb-2 flex-col">
            <Image
              src="/Logomadrasah.png"
              alt="Logo Madrasah"
              width={80}
              height={80}
              className="mb-2"
            />
            <div className="flex items-center justify-center gap-3">
              <span className="material-symbols-outlined text-primary-fixed text-headline-lg">
                school
              </span>
              <h1 className="text-headline-md text-primary-fixed tracking-tight text-center font-bold">
                Madrasah Tsanawiyah<br/>
                <span className="text-headline-lg text-on-surface">MTs. Al-Insani Teratau</span>
              </h1>
            </div>
          </div>
          <p className="text-on-surface-variant text-body-md">
            Portal Ujian Terintegrasi
          </p>
        </header>

        {/* Main Login Canvas */}
        <main className={`w-full max-w-[440px] transition-all duration-[1200ms] delay-[450ms] ease-out ${
          animate ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
        }`}>
          <div className="bg-surface-container border border-outline-variant p-padding-card rounded-none shadow-2xl">
            <div className="mb-8">
              <h2 className="text-headline-md text-on-surface mb-2">Masuk ke Akun</h2>
              <div className="h-1 w-12 bg-primary-fixed"></div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="bg-error/10 border border-error/40 text-error text-sm px-4 py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                {errorMsg}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Email Field */}
              <div className="space-y-2">
                <label
                  className="text-label-sm text-on-surface-variant uppercase tracking-wider"
                  htmlFor="email"
                >
                  Email / Nomor Induk
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-4 focus:ring-0 focus:border-primary-fixed outline-none transition-colors text-body-md"
                    id="email"
                    placeholder="contoh@mtsalinsani.sch.id"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">
                    person
                  </span>
                </div>
              </div>
              
              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    className="text-label-sm text-on-surface-variant uppercase tracking-wider"
                    htmlFor="password"
                  >
                    Kata Sandi
                  </label>
                  <a
                    className="text-label-sm text-primary-fixed hover:underline transition-all"
                    href="#"
                  >
                    Lupa Kata Sandi?
                  </a>
                </div>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface p-4 focus:ring-0 focus:border-primary-fixed outline-none transition-colors text-body-md"
                    id="password"
                    placeholder="Masukkan kata sandi"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">
                    lock
                  </span>
                </div>
              </div>
              
              {/* Remember Me */}
              <div className="flex items-center gap-3">
                <input
                  className="w-5 h-5 bg-surface-container-high border-outline-variant rounded-none text-primary-fixed focus:ring-0"
                  id="remember"
                  type="checkbox"
                />
                <label
                  className="text-body-md text-on-surface-variant select-none cursor-pointer"
                  htmlFor="remember"
                >
                  Ingat saya di perangkat ini
                </label>
              </div>
              
              {/* Action Button */}
              <button
                className="w-full bg-primary-fixed text-on-primary-fixed text-headline-md py-4 transition-all active:scale-[0.98] hover:bg-primary-fixed-dim mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    Memverifikasi...
                  </>
                ) : "Masuk"}
              </button>
            </form>
            
            {/* Academic Footer/Notice */}
            <div className="mt-8 pt-8 border-t border-outline-variant flex gap-4 items-start">
              <span className="material-symbols-outlined text-on-surface-variant mt-1">
                info
              </span>
              <p className="text-label-sm text-on-surface-variant leading-relaxed">
                Pastikan Anda menggunakan koneksi internet yang stabil selama sesi
                ujian berlangsung. Hubungi administrator jika Anda mengalami kendala
                saat masuk.
              </p>
            </div>
          </div>
          
          {/* Decorative Academic Background Element (Subtle) */}
          <div className="mt-12 flex justify-center gap-8 opacity-20 grayscale">
            <div className="w-16 h-16 bg-surface-container-highest flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface text-headline-lg">
                history_edu
              </span>
            </div>
            <div className="w-16 h-16 bg-surface-container-highest flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface text-headline-lg">
                auto_stories
              </span>
            </div>
            <div className="w-16 h-16 bg-surface-container-highest flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface text-headline-lg">
                verified
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
