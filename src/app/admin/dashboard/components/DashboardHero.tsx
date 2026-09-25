import Image from "next/image";
import { CalendarDays } from "lucide-react";

interface DashboardHeroProps {
  displayName: string;
  todayLabel: string;
  greeting: string;
}

export function DashboardHero({ displayName, todayLabel, greeting }: DashboardHeroProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#ebf3ff] via-[#f0f4ff] to-[#f8faff] border border-blue-100/70 shadow-sm min-h-[140px] sm:min-h-[175px] flex items-center">

      {/* Decorative background ambient glows */}
      <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 right-1/4 w-36 h-36 rounded-full bg-violet-300/15 blur-2xl pointer-events-none" />

      {/* ── Right illustration — responsive positioning & opacity ─── */}
      <div className="absolute right-0 top-0 bottom-0 w-36 sm:w-[45%] md:w-[50%] lg:w-[55%] pointer-events-none select-none opacity-20 sm:opacity-100 transition-opacity">
        {/* Left-to-right gradient fade — blends image into hero card background */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(to right, #f0f4ff 0%, rgba(240,244,255,0.4) 40%, rgba(240,244,255,0) 100%)",
          }}
        />
        <Image
          src="/images/admin-dashboard-hero.jpg"
          alt="Admin dashboard illustration"
          fill
          className="object-cover object-right-bottom sm:object-left-bottom"
          priority
          sizes="(max-width: 640px) 150px, (max-width: 1024px) 50vw, 640px"
        />
      </div>

      {/* ── Left / Main: text content ─────────────────────────────────── */}
      <div className="relative z-20 flex-1 p-5 sm:p-7 w-full max-w-full sm:max-w-md lg:max-w-lg">
        {/* Small greeting */}
        <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 mb-1">
          <span>{greeting}</span>
          <span>👋</span>
        </div>

        {/* Main heading */}
        <h1 className="text-xl sm:text-2xl lg:text-[26px] font-extrabold text-slate-800 leading-snug tracking-tight">
          Welcome back,{" "}
          <span className="text-indigo-600">{displayName}</span>
        </h1>

        {/* Sub-text */}
        <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-3.5 sm:mb-4 max-w-sm sm:max-w-none">
          Here&apos;s what&apos;s happening with your platform today.
        </p>

        {/* Date chip */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/90 border border-slate-200/80 shadow-xs backdrop-blur-sm">
          <CalendarDays className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="text-[11px] sm:text-xs font-semibold text-slate-600 tracking-tight">
            {todayLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
