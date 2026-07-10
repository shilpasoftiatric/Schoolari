import { getSiteSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";
import { Settings } from "lucide-react";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-violet-600" />
          Global Settings
        </h1>
        <p className="text-slate-500 mt-1">
          Manage platform configuration, site name, and support details. Changes here apply immediately across the entire app.
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
