import { getSiteSettings } from "@/lib/settings";
import { GraduationCap } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return { title: `${settings.site_name} — Sign In` };
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-extrabold text-white tracking-tight">{settings.site_name}</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Your Student Success <br />Operating System
            </h1>
            <p className="text-purple-200 text-lg leading-relaxed max-w-sm">
              Find scholarships, track applications, build your college portfolio, and start earning — all in one place.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "500+", label: "Scholarships" },
              { value: "$2M+", label: "Available Funds" },
              { value: "10k+", label: "Students Helped" },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-4 text-center">
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-xs text-purple-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <p className="text-white text-sm leading-relaxed italic">
              "{settings.site_name} helped me find 3 scholarships I never would have found on my own. I won $5,000 in my first semester!"
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                J
              </div>
              <div>
                <p className="text-white font-semibold text-xs">Jordan M.</p>
                <p className="text-purple-200 text-xs">College Freshman</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-extrabold text-slate-900">
              {settings.site_name}
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
