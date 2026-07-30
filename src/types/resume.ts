export type GradeLevel =
  | "9th Grade (Freshman)"
  | "10th Grade (Sophomore)"
  | "11th Grade (Junior)"
  | "12th Grade (Senior)"
  | "College Freshman"
  | "College Sophomore"
  | "College Junior"
  | "College Senior"
  | "Graduate Student";

export type AwardLevel = "School" | "Regional" | "State" | "National";

export type ResumeTemplateTheme = "classic" | "modern" | "executive" | "college" | "internship";

export interface ResumeHeader {
  first_name: string;
  last_name: string;
  email: string;
  phone: string; // US format +1 (XXX) XXX-XXXX
  city_state: string; // e.g. "Chicago, IL"
  linkedin_url?: string;
  portfolio_url?: string;
  summary?: string; // Concise US student professional summary
  target_job_or_internship?: string; // Professional Resume field
  college_or_career_goals?: string; // Academic Resume field
}

export interface ResumeEducationItem {
  id: string;
  institution: string;
  grade_level_or_degree: string;
  graduation_year: string;
  gpa_unweighted?: string; // 4.0 Scale
  gpa_weighted?: string; // 5.0+ Scale
  honors_coursework?: string; // AP, IB, Dual Enrollment, Honors
  location: string;
}

export interface ResumeExperienceItem {
  id: string;
  title: string; // Job Title or Leadership Role
  organization: string;
  location: string;
  start_date: string; // Month Year e.g. "Jun 2025"
  end_date: string; // Month Year or "Present"
  is_current: boolean;
  bullets: string[]; // STAR method bullet points
}

export interface ResumeExtracurricularItem {
  id: string;
  activity: string; // Activity / Club / Organization name
  role: string; // e.g. Member, President, Captain
  start_date: string;
  end_date: string;
  hours_per_week?: string;
  bullets: string[];
}

export interface ResumeAwardItem {
  id: string;
  title: string;
  issuer: string;
  year: string;
  level: AwardLevel;
  description?: string;
}

export interface ResumeSkillsSection {
  technical: string[]; // Hard / Technical skills
  soft: string[]; // Leadership & interpersonal skills
  languages: string[]; // Spoken / written languages
  certifications: string[]; // e.g., Google Data Analytics, CPR, Biliteracy Seal
}

export interface ResumeDocument {
  id: string;
  title: string; // e.g. "General Academic Resume", "Tech Internship Resume"
  resume_type?: "academic" | "professional" | "both"; // Step 1: Choose Resume Type
  target_role?: string;
  target_keywords?: string[];
  template_theme: ResumeTemplateTheme;
  header: ResumeHeader;
  education: ResumeEducationItem[];
  experience: ResumeExperienceItem[];
  extracurriculars: ResumeExtracurricularItem[];
  awards: ResumeAwardItem[];
  skills: ResumeSkillsSection;
  student_experience_level?: string;
  missing_information?: string[];
  last_modified: string;
}

export interface UserResumesPayload {
  resumes: ResumeDocument[];
  active_resume_id: string;
}

export interface StarBulletVariations {
  actionFocused: string;
  metricFocused: string;
  leadershipFocused: string;
}

export interface ATSTailorResult {
  ats_score: number; // 0 - 100
  matched_keywords: string[];
  missing_keywords: string[];
  suggestions: Array<{
    section: "experience" | "extracurriculars" | "skills" | "summary";
    item_id?: string;
    advice: string;
    suggested_text?: string;
  }>;
}
