"use client";

import { useState, useTransition } from "react";
import { updateSiteSettings } from "@/app/actions/admin";
import type { SiteSettings } from "@/lib/settings";
import { Save, Loader2, Globe, Mail, Phone } from "lucide-react";
import { PhoneInput } from "@/components/ui/input";

export function SettingsForm({ initialSettings }: { initialSettings: SiteSettings }) {
  const [isPending, startTransition] = useTransition();
  const [siteName, setSiteName] = useState(initialSettings.site_name || "Schoolari");
  const [supportEmail, setSupportEmail] = useState(initialSettings.support_email || "support@schoolari.com");
  const [supportPhone, setSupportPhone] = useState(initialSettings.support_phone || "1-800-SCHOOLARI");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    startTransition(async () => {
      try {
        await updateSiteSettings({
          site_name: siteName,
          support_email: supportEmail,
          support_phone: supportPhone,
        });
        setSuccessMsg("Settings saved successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (error: any) {
        alert(error.message || "Failed to update settings");
      }
    });
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            <span className="flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /> Site Name</span>
          </label>
          <input
            type="text"
            required
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
          />
          <p className="text-xs text-slate-500 mt-1">This will update the brand name displayed across the entire platform.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> Support Email</span>
          </label>
          <input
            type="email"
            required
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> Support Phone</span>
          </label>
          <PhoneInput
            required
            value={supportPhone}
            onChange={setSupportPhone}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm font-medium text-emerald-600 h-5">
          {successMsg}
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all disabled:opacity-70"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </form>
  );
}
