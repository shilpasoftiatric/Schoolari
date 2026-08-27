import Link from "next/link";
import { GraduationCap, ArrowLeft, MessageSquare, Shield, HelpCircle, PhoneCall } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Terms & Conditions | Schoolari",
  description: "Review Schoolari's SMS communication terms, message frequency, opt-out instructions, and carrier guidelines.",
};

export default function SmsTermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-sm shadow-violet-200">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">Schoolari</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/terms" className="text-slate-600 hover:text-violet-600 transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="text-slate-600 hover:text-violet-600 transition-colors">
              Privacy Policy
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 lg:p-14 shadow-sm space-y-10">
          
          {/* Header Banner */}
          <div className="border-b border-slate-100 pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold uppercase tracking-wider mb-4">
              <MessageSquare className="w-3.5 h-3.5" /> SMS Communications &amp; Compliance
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Schoolari SMS Terms &amp; Conditions
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Last Updated: August 2026 • A2P 10DLC Program Terms
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-4">
              These SMS Terms &amp; Conditions govern the text messaging and mobile communication services provided by Schoolari (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) to registered students, parents, and guardians.
            </p>
          </div>

          {/* SMS Terms Content Cards */}
          <div className="space-y-6 text-sm sm:text-base text-slate-700 leading-relaxed">
            
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-extrabold">1</span>
                Program Description
              </h2>
              <p className="text-sm text-slate-600 pl-8 leading-relaxed">
                Schoolari SMS service provides real-time notifications, application deadline alerts, scholarship match reminders, account security verification codes, and task updates to enrolled students and parents.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-extrabold">2</span>
                Message Frequency
              </h2>
              <p className="text-sm text-slate-600 pl-8 leading-relaxed">
                Message frequency varies based on your college application timelines, scholarship deadlines, and user activity. You may receive recurring messages related to your account milestones and deadline reminders.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-extrabold">3</span>
                Message and Data Rates
              </h2>
              <p className="text-sm text-slate-600 pl-8 leading-relaxed">
                Standard message and data rates may apply depending on your mobile carrier and wireless plan. Please consult your wireless provider for pricing details.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-extrabold">4</span>
                How to Opt-Out (Unsubscribe)
              </h2>
              <p className="text-sm text-slate-600 pl-8 leading-relaxed">
                You can cancel the SMS service at any time. Simply text <strong className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">STOP</strong> in reply to any message. After you send the SMS message STOP to us, you will receive a confirmation message that you have been unsubscribed. No further messages will be sent unless you re-subscribe.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-extrabold">5</span>
                Help and Support
              </h2>
              <p className="text-sm text-slate-600 pl-8 leading-relaxed">
                For assistance, text <strong className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">HELP</strong> to any message or contact our support team at <a href="mailto:support@schoolari.com" className="text-violet-600 font-semibold underline">support@schoolari.com</a> or <a href="mailto:students@dormoney.com" className="text-violet-600 font-semibold underline">students@dormoney.com</a>.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-extrabold">6</span>
                Carriers &amp; Liability
              </h2>
              <p className="text-sm text-slate-600 pl-8 leading-relaxed">
                Mobile carriers (including AT&amp;T, T-Mobile, Verizon, Sprint, Boost, Cricket, and others) are not liable for delayed or undelivered messages.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-extrabold">7</span>
                Privacy of Phone Numbers
              </h2>
              <p className="text-sm text-slate-600 pl-8 leading-relaxed">
                Your mobile phone number and opt-in consent will not be sold, rented, or shared with third parties for marketing or promotional purposes. Review our full <Link href="/privacy" className="text-violet-600 font-semibold underline">Privacy Policy</Link> for additional details on data protection.
              </p>
            </div>

          </div>

          {/* Footer Navigation */}
          <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 Schoolari. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-violet-600 transition-colors">Terms of Service</Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-violet-600 transition-colors">Privacy Policy</Link>
              <span>•</span>
              <Link href="/login" className="hover:text-violet-600 transition-colors">Sign In</Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
