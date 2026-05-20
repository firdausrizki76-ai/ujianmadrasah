"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/ThemeProvider";

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle light/dark mode"
      className="relative w-9 h-9 rounded-full flex items-center justify-center bg-surface-container border border-outline-variant hover:border-primary-fixed/50 hover:bg-surface-container-high transition-all cursor-pointer group"
      title={theme === "dark" ? "Aktifkan Light Mode" : "Aktifkan Dark Mode"}
    >
      <span
        className={`material-symbols-outlined text-xl transition-all duration-300 ${
          theme === "dark"
            ? "text-yellow-400 group-hover:text-yellow-300 rotate-0"
            : "text-blue-500 group-hover:text-blue-400 rotate-180"
        }`}
        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
      >
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  const [userName, setUserName] = useState("User");
  const [roleTitle, setRoleTitle] = useState("Portal Ujian");
  const [userAvatar, setUserAvatar] = useState(
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD7U6BKj_c3SDSPjw4fbAJqLA3PEPRZvWcWowBC-AY1-eQrmriUI-TIqqwsyhFY0cGjgbYrI9whZIfEmQeyCfz3mt5lU7lYNGVwxk1zY7HN7kD8qfM5z2xeMSA29h5kWp5Z-r90EGGC5XECMK1QgS9Bvrq1Qnd-rzf_H9iPWPZUWbaiVuCBy4NdQ4yYhut-cuL7ZDWyJ-vo4j_X1usWsh5WPfXHNit9IYKw13R47l1Hs-aHK-hc0CJh2jMxit8nM3srxn9BU8fi4yEM"
  );

  // Determine role from pathname (e.g. /dashboard/guru -> guru) for menu routing
  let role = "siswa";
  if (pathname.startsWith("/dashboard/guru")) {
    role = "guru";
  } else if (pathname.startsWith("/dashboard/admin")) {
    role = "admin";
  }

  useEffect(() => {
    setAnimate(true);
    
    // Load dynamic user info from localStorage to prevent hydration mismatch
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        if (userObj.name) {
          setUserName(userObj.name);
        }
        if (userObj.role) {
          const roleMap: Record<string, string> = {
            admin: "Super Admin",
            guru: userObj.subject ? `Guru ${userObj.subject}` : "Ustadz / Guru",
            siswa: userObj.class_name ? `Siswa ${userObj.class_name}` : "Siswa MTs",
          };
          setRoleTitle(roleMap[userObj.role] || "Portal Ujian");
        }
        if (userObj.avatar) {
          setUserAvatar(userObj.avatar);
        } else {
          // Fallback avatar based on role
          if (userObj.role === "siswa") {
            setUserAvatar("https://lh3.googleusercontent.com/aida-public/AB6AXuC-CHk0ttelZ9gXqgeDfYt3m-5UBquDXMlKx0oiiLwhbx6AeDA-dFwmUTQvv-1mC-niFieuRAU2An8asVLL6c4KUrkEXI5u_LfZadEe0PxSNtYnSL_d9BqqK39_h0d74DAeyEiuQyrvpSTMg8sQ7V7pTVbeMI65oWoVj7HioW6vvb-KgBCIKyalyYxn8Adfrgpy7HBkQpnquXLSWo2HGRP2o17U93phz4XmwyTVZWxlxcJV75bs08XHK8Y46QudNxMtKCV1rJBP5V7D");
          } else {
            setUserAvatar("https://lh3.googleusercontent.com/aida-public/AB6AXuD7U6BKj_c3SDSPjw4fbAJqLA3PEPRZvWcWowBC-AY1-eQrmriUI-TIqqwsyhFY0cGjgbYrI9whZIfEmQeyCfz3mt5lU7lYNGVwxk1zY7HN7kD8qfM5z2xeMSA29h5kWp5Z-r90EGGC5XECMK1QgS9Bvrq1Qnd-rzf_H9iPWPZUWbaiVuCBy4NdQ4yYhut-cuL7ZDWyJ-vo4j_X1usWsh5WPfXHNit9IYKw13R47l1Hs-aHK-hc0CJh2jMxit8nM3srxn9BU8fi4yEM");
          }
        }
      } catch (e) {
        console.error("Error parsing user from localStorage:", e);
      }
    }

    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const getMenu = () => {
    switch (role) {
      case "admin":
        return [
          { name: "Dashboard", icon: "dashboard", href: "/dashboard/admin" },
          { name: "Manajemen User", icon: "manage_accounts", href: "/dashboard/admin/users" },
          { name: "Manajemen Kelas", icon: "meeting_room", href: "/dashboard/admin/kelas" },
          { name: "Laporan Ujian", icon: "analytics", href: "/dashboard/admin/laporan" },
        ];
      case "guru":
        return [
          { name: "Dashboard", icon: "dashboard", href: "/dashboard/guru" },
          { name: "Bank Soal", icon: "library_books", href: "/dashboard/guru/bank-soal" },
          { name: "Paket Ujian", icon: "assignment", href: "/dashboard/guru/ujian" },
          { name: "Monitor Ujian", icon: "monitoring", href: "/dashboard/guru/monitor" },
          { name: "Penilaian Essay", icon: "edit_document", href: "/dashboard/guru/penilaian" },
        ];
      case "siswa":
      default:
        return [
          { name: "Dashboard", icon: "dashboard", href: "/dashboard/siswa" },
          { name: "Ujian dan Tugas", icon: "assignment", href: "/dashboard/siswa/ujian-tugas" },
          { name: "Riwayat Ujian", icon: "history", href: "/dashboard/siswa/riwayat" },
        ];
    }
  };

  const menuItems = getMenu();

  return (
    <div className="h-screen bg-background text-on-background w-full flex flex-col overflow-hidden">
      {/* Real-time Running Text Announcement Bar */}
      <div className="bg-primary-fixed/10 border-b border-primary-fixed/20 text-primary-fixed text-xs font-bold py-2 px-4 overflow-hidden relative w-full shrink-0 select-none flex items-center gap-3">
        <span className="bg-primary-fixed text-on-primary-fixed text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0 animate-pulse">
          INFO MTs
        </span>
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-marquee-css whitespace-nowrap">
            📢 PENGUMUMAN CBT: Selamat datang di Portal Ujian Digital Resmi MTs. Al-Insani Teratau. Pelaksanaan CBT semester ini didukung oleh sistem keamanan tinggi (Anti-Cheat & Tab-Switch Tracking) demi mewujudkan kelulusan yang jujur, berintegritas, dan berkah. &nbsp;&nbsp;•&nbsp;&nbsp; Bagi para santri, harap pastikan koneksi internet stabil sebelum memulai ujian. &nbsp;&nbsp;•&nbsp;&nbsp; Hubungi tim Helpdesk di menu samping jika menemui kendala teknis. &nbsp;&nbsp;•&nbsp;&nbsp; Sukses selalu untuk seluruh santri MTs. Al-Insani Teratau!
          </div>
        </div>
      </div>
      {/* Top Navigation Bar */}
      <header className="bg-surface-container-lowest border-b border-outline-variant p-4 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden text-on-surface hover:text-primary-fixed cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-3">
            <Image
              src="/Logomadrasah.png"
              alt="Logo Madrasah"
              width={40}
              height={40}
            />
            <div className="flex flex-col">
              <span className="font-headline-md text-primary-fixed text-base font-bold leading-tight">
                MTs. Al-Insani Teratau
              </span>
              <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">
                Madrasah Tsanawiyah
              </span>
            </div>
          </div>
        </div>
        
        {/* Top Right Profile Widget */}
        <div className="flex items-center gap-6">
          {/* Theme Toggle Button */}
          <ThemeToggleButton />
          <button className="text-on-surface-variant hover:text-primary-fixed transition-colors cursor-pointer">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="flex items-center gap-3">
            <img 
              alt={userName} 
              className="w-9 h-9 rounded-full object-cover border border-outline" 
              src={userAvatar}
            />
            <div className="hidden sm:flex flex-col text-left">
              <p className="text-label-sm font-bold text-on-surface leading-none">{userName}</p>
              <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5">{roleTitle}</p>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div 
            className="absolute inset-0 bg-black/50 z-10 md:hidden" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside 
          className={`absolute md:static top-0 left-0 h-full w-64 bg-surface border-r border-outline-variant p-6 flex flex-col justify-between z-20 transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {/* Inner Content Wrapper - Stays static after mount transition to prevent layout artifacts */}
          <div className={
            animationComplete
              ? "h-full flex flex-col justify-between"
              : `h-full flex flex-col justify-between transition-all duration-[800ms] ease-out transform ${
                  animate ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"
                }`
          }>
            {/* Menu Items Container with elegant top padding to prevent crowding */}
            <nav className="space-y-2 pt-4">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`p-3 rounded flex items-center gap-3 transition-colors duration-150 border-l-4 ${
                      isActive 
                        ? "bg-primary-container text-on-primary-container font-bold border-primary-fixed" 
                        : "text-on-surface-variant hover:bg-surface-variant hover:text-primary-fixed border-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            
            {/* Logout Button placed elegantly at the very bottom of the sidebar */}
            <Link 
              href="/" 
              className="p-3 rounded text-error flex items-center gap-3 hover:bg-error/10 hover:text-error transition-colors duration-150 border border-dashed border-error/20 mt-auto"
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Keluar</span>
            </Link>
          </div>
        </aside>

        {/* Main Content (Scrolls independently with high performance initial mount transition) */}
        <main className={
          animationComplete
            ? "flex-grow p-4 md:p-8 overflow-y-auto bg-surface-dim custom-scrollbar"
            : `flex-grow p-4 md:p-8 overflow-y-auto bg-surface-dim custom-scrollbar transition-all duration-[1000ms] delay-[200ms] ease-out transform ${
                animate ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`
        }>
          {children}
        </main>
      </div>
    </div>
  );
}
