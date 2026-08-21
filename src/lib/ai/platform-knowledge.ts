/**
 * Schoolari Platform Knowledge Base (Ultra Token-Efficient)
 * Provides concise, authoritative reference guides for Schoolari features.
 */

export interface SchoolariFeatureInfo {
  id: string;
  name: string;
  route: string;
  plan: string;
  summary: string;
  keywords: string[];
}

export const SCHOOLARI_FEATURES: Record<string, SchoolariFeatureInfo> = {
  income: {
    id: "income",
    name: "Earn While You Learn",
    route: "/income",
    plan: "Scholar/Elite Plan",
    summary: "Video masterclass hub for building marketable skills (freelance, tech, campus gigs) and unlocking paid micro-tasks & stipends.",
    keywords: ["earn income", "earn while you learn", "income", "make money", "paid tasks", "earn money", "stipends", "micro-tasks", "freelance"],
  },

  jobs: {
    id: "jobs",
    name: "Jobs & Internships",
    route: "/jobs",
    plan: "Scholar/Elite Plan",
    summary: "AI-matched internships, Federal Work-Study, and entry-level positions from JSearch/USAJOBS with 1-click Tracker saving.",
    keywords: ["job", "jobs", "internship", "internships", "career", "work-study", "part-time", "summer program", "employment", "hire", "recruiting"],
  },

  coaching: {
    id: "coaching",
    name: "College Coach & 1-on-1 Advisory",
    route: "/coaching",
    plan: "Elite Plan",
    summary: "Live 1-on-1 video sessions & group workshops with admissions counselors, Zoom/Meet links, 2-way messaging, and action item assignments.",
    keywords: ["coach", "coaching", "counselor", "1-on-1", "one on one", "group session", "advisor", "live session", "zoom", "meeting", "workshop"],
  },

  resume: {
    id: "resume",
    name: "Resume Builder",
    route: "/resume",
    plan: "All Plans",
    summary: "Step-by-step academic resume generator (Education, Extracurriculars, Leadership, Honors) with one-click PDF download.",
    keywords: ["resume", "cv", "resume builder", "extracurriculars", "brag sheet", "activities list"],
  },

  scholarships: {
    id: "scholarships",
    name: "Scholarships Search",
    route: "/scholarships",
    plan: "All Plans",
    summary: "Verified US scholarship database with automatic eligibility verification and Match Score % based on GPA, state, and grade level.",
    keywords: ["scholarship", "scholarships", "grants", "free money", "financial aid", "merit aid", "match score"],
  },

  colleges: {
    id: "colleges",
    name: "Colleges & Strategy",
    route: "/colleges",
    plan: "All Plans",
    summary: "Search 2,000+ US universities, admissions criteria, acceptance rates, and categorize into Safeties, Targets, and Reaches.",
    keywords: ["college", "colleges", "university", "universities", "safeties", "targets", "reaches", "admissions"],
  },

  essays: {
    id: "essays",
    name: "Essays Hub",
    route: "/essays",
    plan: "All Plans",
    summary: "Common App and supplemental essay prompts, draft tracking, and narrative outline structure guidance.",
    keywords: ["essay", "essays", "common app", "personal statement", "supplement", "supplemental essay", "prompt"],
  },

  documents: {
    id: "documents",
    name: "Document Vault",
    route: "/documents",
    plan: "All Plans",
    summary: "Secure cloud storage for high school transcripts, SAT/ACT scores, recommendation letters, and FAFSA financial forms.",
    keywords: ["document", "documents", "vault", "transcript", "test score", "sat score", "act score", "recommendation letter", "fafsa form"],
  },

  tracker: {
    id: "tracker",
    name: "Application Tracker",
    route: "/tracker",
    plan: "All Plans",
    summary: "Central pipeline managing application stages (Researching, In Progress, Submitted, Accepted) and deadline countdowns.",
    keywords: ["tracker", "application tracker", "pipeline", "status", "deadline countdown", "submitted", "accepted"],
  },

  dashboard: {
    id: "dashboard",
    name: "Dashboard",
    route: "/dashboard",
    plan: "All Plans",
    summary: "Admissions readiness progress score (0–100%), Today's Top 3 Priorities, and upcoming deadline calendar.",
    keywords: ["dashboard", "home", "progress", "priorities", "today", "milestone", "score"],
  },
};

/**
 * Finds up to 1-2 relevant platform features strictly matching user query.
 */
export function getRelevantPlatformKnowledge(userQuery: string): SchoolariFeatureInfo[] {
  const q = userQuery.toLowerCase().trim();
  const matched: SchoolariFeatureInfo[] = [];

  for (const feature of Object.values(SCHOOLARI_FEATURES)) {
    const isExactMatch = feature.keywords.some((k) => {
      // Avoid single-word short matches like "to" or "in"
      const regex = new RegExp(`\\b${k}\\b`, "i");
      return regex.test(q);
    });
    if (isExactMatch) {
      matched.push(feature);
      if (matched.length >= 2) break; // Hard cap to prevent multi-feature token bloat
    }
  }

  return matched;
}

/**
 * Ultra-compact platform knowledge prompt formatter (~40-80 tokens per feature).
 */
export function formatPlatformKnowledgeForPrompt(features: SchoolariFeatureInfo[]): string {
  if (features.length === 0) return "";

  const lines = features.map(
    (f) => `* **${f.name}** (${f.route}, ${f.plan}): ${f.summary}`
  );

  return `[SCHOOLARI PLATFORM FEATURE]:\n${lines.join("\n")}`;
}
