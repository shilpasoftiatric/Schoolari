import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

export type SiteSettings = {
  site_name: string;
  support_email: string;
  support_phone: string;
};

const defaultSettings: SiteSettings = {
  site_name: "Schoolari",
  support_email: "support@schoolari.com",
  support_phone: "1-800-SCHOOLARI",
};

// Fetching directly with Supabase JS so it doesn't complain about missing cookies in unstable_cache
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching site settings, falling back to defaults:", error.message);
        return defaultSettings;
      }
      
      return data as SiteSettings;
    } catch (e) {
      console.error("Exception fetching site settings:", e);
      return defaultSettings;
    }
  },
  ["site-settings"],
  { tags: ["site-settings"] }
);
