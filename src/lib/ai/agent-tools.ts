import { createAdminClient } from "@/lib/supabase/server";
import { isScholarshipEligible, scoreScholarshipForProfile } from "@/lib/scholarship-matching";
import { getStudentDashboardData } from "@/services/data-fetcher";
import {
  calculateWorkflowStates,
  generatePrioritiesAndGoals,
  generateWeeklyGoals,
  generateUpcomingDeadlines,
  calculateOverallProgress,
  getNextMilestone,
} from "@/services/task-engine";

export interface StudentProfileContext {
  id: string;
  name: string;
  gradeLevel?: string;
  highSchoolName?: string;
  schoolType?: string;
  state?: string;
  unweightedGpa?: string;
  weightedGpa?: string;
  gpaRange?: string;
  satScoreRange?: string;
  actScoreRange?: string;
  expectedGraduationYear?: string;
  intendedMajors: string[];
  careerInterests: string[];
  dreamSchools: string[];
  preferredCollegeTypes: string[];
  ethnicity: string[];
  gender?: string;
  firstGeneration?: string;
  financialNeed?: string;
  militaryFamily?: string;
  extracurriculars: string[];
  leadership: string[];
  volunteering: string[];
  goals: string[];
  biggestChallenge?: string;
  knownFields: string[];
  missingFields: string[];
}

/**
 * Fetch and structure the authenticated student's full profile context.
 */
export async function getStudentProfileContext(userId: string): Promise<StudentProfileContext | null> {
  // Get master profile (handles linked parent / student)
  const { profile: rawProfile, masterId } = await getStudentDashboardData(userId);
  if (!rawProfile) return null;

  const name = [rawProfile.student_first_name, rawProfile.student_last_name].filter(Boolean).join(" ") ||
    rawProfile.first_name || "Student";

  const majors = [
    ...(Array.isArray(rawProfile.intended_major) ? rawProfile.intended_major : []),
    ...(Array.isArray(rawProfile.fields_of_study) ? rawProfile.fields_of_study : []),
  ].filter(Boolean);

  const interests = [
    ...(Array.isArray(rawProfile.career_interest) ? rawProfile.career_interest : rawProfile.career_interest ? [rawProfile.career_interest] : []),
    ...(Array.isArray(rawProfile.career_interests) ? rawProfile.career_interests : []),
  ].filter(Boolean);

  const ethnicity = [
    ...(Array.isArray(rawProfile.ethnicity) ? rawProfile.ethnicity : []),
    ...(Array.isArray(rawProfile.ethnicity_tags) ? rawProfile.ethnicity_tags : []),
  ].filter(Boolean);

  const knownFields: string[] = [];
  const missingFields: string[] = [];

  if (name) knownFields.push(`Name: ${name}`);
  if (rawProfile.grade_level) knownFields.push(`Grade Level: ${rawProfile.grade_level}`); else missingFields.push("Grade Level");
  if (rawProfile.state) knownFields.push(`State: ${rawProfile.state}`); else missingFields.push("State of Residence");
  if (rawProfile.unweighted_gpa) knownFields.push(`Unweighted GPA: ${rawProfile.unweighted_gpa}`);
  else if (rawProfile.gpa_range) knownFields.push(`GPA Range: ${rawProfile.gpa_range}`);
  else missingFields.push("GPA");

  if (majors.length > 0) knownFields.push(`Intended Major(s): ${majors.join(", ")}`); else missingFields.push("Intended Major");
  if (interests.length > 0) knownFields.push(`Career Interests: ${interests.join(", ")}`);
  if (ethnicity.length > 0) knownFields.push(`Ethnicity: ${ethnicity.join(", ")}`);
  if (rawProfile.gender) knownFields.push(`Gender: ${rawProfile.gender}`);
  if (rawProfile.sat_score_range) knownFields.push(`SAT Score Range: ${rawProfile.sat_score_range}`);
  if (rawProfile.act_score_range) knownFields.push(`ACT Score Range: ${rawProfile.act_score_range}`);
  if (rawProfile.first_generation_college_student) knownFields.push(`First-Gen Student: ${rawProfile.first_generation_college_student}`);
  if (rawProfile.financial_need) knownFields.push(`Financial Need: ${rawProfile.financial_need}`);
  if (Array.isArray(rawProfile.extracurricular_activities) && rawProfile.extracurricular_activities.length > 0) {
    knownFields.push(`Extracurriculars: ${rawProfile.extracurricular_activities.join(", ")}`);
  }
  if (Array.isArray(rawProfile.schoolari_goals) && rawProfile.schoolari_goals.length > 0) {
    knownFields.push(`Goals: ${rawProfile.schoolari_goals.join(", ")}`);
  }

  return {
    id: masterId,
    name,
    gradeLevel: rawProfile.grade_level || undefined,
    highSchoolName: rawProfile.high_school_name || undefined,
    schoolType: rawProfile.school_type || undefined,
    state: rawProfile.state || undefined,
    unweightedGpa: rawProfile.unweighted_gpa || undefined,
    weightedGpa: rawProfile.weighted_gpa || undefined,
    gpaRange: rawProfile.gpa_range || undefined,
    satScoreRange: rawProfile.sat_score_range || undefined,
    actScoreRange: rawProfile.act_score_range || undefined,
    expectedGraduationYear: rawProfile.expected_graduation_year || undefined,
    intendedMajors: Array.from(new Set(majors)),
    careerInterests: Array.from(new Set(interests)),
    dreamSchools: Array.isArray(rawProfile.top_3_schools) ? rawProfile.top_3_schools : [],
    preferredCollegeTypes: Array.isArray(rawProfile.preferred_college_type) ? rawProfile.preferred_college_type : [],
    ethnicity: Array.from(new Set(ethnicity)),
    gender: rawProfile.gender || undefined,
    firstGeneration: rawProfile.first_generation_college_student || undefined,
    financialNeed: rawProfile.financial_need || undefined,
    militaryFamily: rawProfile.military_family || undefined,
    extracurriculars: Array.isArray(rawProfile.extracurricular_activities) ? rawProfile.extracurricular_activities : [],
    leadership: Array.isArray(rawProfile.leadership_experience) ? rawProfile.leadership_experience : [],
    volunteering: Array.isArray(rawProfile.volunteer_experience) ? rawProfile.volunteer_experience : [],
    goals: Array.isArray(rawProfile.schoolari_goals) ? rawProfile.schoolari_goals : [],
    biggestChallenge: rawProfile.biggest_challenge || undefined,
    knownFields,
    missingFields,
  };
}

export interface MatchedScholarshipResult {
  id: string;
  name: string;
  organization: string;
  awardAmount: string;
  deadline: string;
  matchScore: number;
  matchReason: string;
  category: string;
  link: string;
  isSpecificMatch: boolean;
}

/**
 * Executes authoritative scholarship search using the exact same US eligibility engine (isScholarshipEligible and scoreScholarshipForProfile)
 */
export async function searchScholarshipsTool(
  userId: string,
  searchQuery?: string
): Promise<{
  totalEligibleFound: number;
  results: MatchedScholarshipResult[];
  isFallback: boolean;
}> {
  const supabaseAdmin = await createAdminClient();
  const { profile: rawProfile, masterId } = await getStudentDashboardData(userId);

  // Get user's already tracked scholarship applications to filter out
  const { data: apps } = await supabaseAdmin
    .from("applications")
    .select("scholarship_id")
    .eq("user_id", masterId);

  const appliedIds = new Set((apps || []).map((a: any) => a.scholarship_id));

  // Fetch active scholarships
  let query = supabaseAdmin
    .from("scholarships")
    .select("id, name, organization_name, award_amount, deadline, category, link, eligible_states, eligible_majors, min_gpa_required, grade_levels, featured")
    .eq("is_active", true);

  if (searchQuery && searchQuery.trim().length > 2) {
    const q = `%${searchQuery.trim()}%`;
    query = query.or(`name.ilike.${q},category.ilike.${q},organization_name.ilike.${q},eligible_majors.ilike.${q}`);
  }

  const { data: allScholarships, error } = await query.limit(500);

  if (error || !allScholarships) {
    console.error("[searchScholarshipsTool] Error fetching scholarships:", error);
    return { totalEligibleFound: 0, results: [], isFallback: false };
  }

  // 1. Run strict eligibility filtering
  const eligible = allScholarships
    .filter((s) => !appliedIds.has(s.id))
    .filter((s) => isScholarshipEligible(s, rawProfile));

  // 2. Score and rank eligible scholarships
  const scored: MatchedScholarshipResult[] = eligible
    .map((s) => {
      const { score, reason } = scoreScholarshipForProfile(s, rawProfile);
      return {
        id: s.id,
        name: s.name,
        organization: s.organization_name || "Scholarship Sponsor",
        awardAmount: s.award_amount || "Varies",
        deadline: s.deadline || "Ongoing / Rolling",
        matchScore: score,
        matchReason: reason,
        category: s.category || "General",
        link: s.link || "#",
        isSpecificMatch: score > 20,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  if (scored.length > 0) {
    return {
      totalEligibleFound: scored.length,
      results: scored.slice(0, 6),
      isFallback: false,
    };
  }

  // Fallback: If 0 specifically scored matches, return top featured open scholarships clearly labeled as general
  const fallback: MatchedScholarshipResult[] = allScholarships
    .filter((s) => !appliedIds.has(s.id))
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .slice(0, 4)
    .map((s) => ({
      id: s.id,
      name: s.name,
      organization: s.organization_name || "Scholarship Sponsor",
      awardAmount: s.award_amount || "Varies",
      deadline: s.deadline || "Rolling Deadline",
      matchScore: 10,
      matchReason: "Open scholarship available to all eligible students.",
      category: s.category || "General",
      link: s.link || "#",
      isSpecificMatch: false,
    }));

  return {
    totalEligibleFound: fallback.length,
    results: fallback,
    isFallback: true,
  };
}

export interface DashboardPrioritiesResult {
  progressPercentage: number;
  milestoneTitle: string;
  todayPriorities: { title: string; done: boolean; category: string }[];
  weeklyGoals: { scholarships: string[]; colleges: string[]; essays: string[] };
  upcomingDeadlines: { title: string; date: string; daysLeft: number; type: string }[];
}

/**
 * Executes dashboard task and priority compilation for the student.
 */
export async function getDashboardPrioritiesTool(userId: string): Promise<DashboardPrioritiesResult | null> {
  try {
    const dbData = await getStudentDashboardData(userId);
    if (!dbData || !dbData.profile) return null;

    const states = calculateWorkflowStates(dbData);
    const allPriorities = generatePrioritiesAndGoals(states, dbData);
    const weeklyGoals = generateWeeklyGoals(states);
    const deadlines = generateUpcomingDeadlines(dbData);
    const progressScore = calculateOverallProgress(states, dbData.profile);
    const milestone = getNextMilestone(states, progressScore);

    const priorities = (allPriorities || []).slice(0, 5).map((p: any) => ({
      title: p.title,
      done: !!p.done,
      category: p.category || "task",
    }));

    const deadlineList: { title: string; date: string; daysLeft: number; type: string }[] = [];
    if (deadlines.scholarships) {
      deadlines.scholarships.forEach((d: any) => {
        deadlineList.push({
          title: d.title || d.scholarshipName || "Scholarship Deadline",
          date: d.date || d.deadline || "Upcoming",
          daysLeft: typeof d.daysLeft === "number" ? d.daysLeft : 7,
          type: "scholarship",
        });
      });
    }
    if (deadlines.colleges) {
      deadlines.colleges.forEach((d: any) => {
        deadlineList.push({
          title: d.title || d.collegeName || "College Deadline",
          date: d.date || d.deadline || "Upcoming",
          daysLeft: typeof d.daysLeft === "number" ? d.daysLeft : 14,
          type: "college",
        });
      });
    }

    return {
      progressPercentage: progressScore || 0,
      milestoneTitle: milestone || "Stay on track",
      todayPriorities: priorities,
      weeklyGoals: weeklyGoals || { scholarships: [], colleges: [], essays: [] },
      upcomingDeadlines: deadlineList.slice(0, 5),
    };
  } catch (err) {
    console.error("[getDashboardPrioritiesTool] Error:", err);
    return null;
  }
}

/**
 * Retrieves tracked applications and items for the student.
 */
export async function getApplicationStatusTool(userId: string): Promise<{
  trackedScholarships: { name: string; status: string; deadline?: string }[];
  savedColleges: { name: string; status: string; deadline?: string }[];
  totalTracked: number;
}> {
  try {
    const supabaseAdmin = await createAdminClient();
    const { masterId } = await getStudentDashboardData(userId);

    const [appsRes, collegesRes] = await Promise.all([
      supabaseAdmin
        .from("applications")
        .select("status, scholarships(name, deadline)")
        .eq("user_id", masterId),
      supabaseAdmin
        .from("saved_colleges")
        .select("college_name, status, deadline")
        .eq("user_id", masterId),
    ]);

    const trackedScholarships = (appsRes.data || []).map((a: any) => ({
      name: a.scholarships?.name || "Scholarship Application",
      status: a.status || "In Progress",
      deadline: a.scholarships?.deadline || undefined,
    }));

    const savedColleges = (collegesRes.data || []).map((c: any) => ({
      name: c.college_name,
      status: c.status || "Researching",
      deadline: c.deadline || undefined,
    }));

    return {
      trackedScholarships,
      savedColleges,
      totalTracked: trackedScholarships.length + savedColleges.length,
    };
  } catch (err) {
    console.error("[getApplicationStatusTool] Error:", err);
    return { trackedScholarships: [], savedColleges: [], totalTracked: 0 };
  }
}

/**
 * Retrieves live coaching sessions and status for the student.
 */
export async function getLiveCoachingContext(userId: string): Promise<{
  upcomingSessions: { title: string; sessionType: string; date: string; meetingLink?: string; isEnrolled: boolean }[];
  enrolledCount: number;
}> {
  try {
    const supabaseAdmin = await createAdminClient();
    const { masterId } = await getStudentDashboardData(userId);

    const [sessionsRes, enrollmentsRes] = await Promise.all([
      supabaseAdmin
        .from("coaching_sessions")
        .select("id, title, session_type, session_date, meeting_link")
        .gte("session_date", new Date().toISOString())
        .order("session_date", { ascending: true })
        .limit(5),
      supabaseAdmin
        .from("coaching_enrollments")
        .select("session_id")
        .eq("student_id", masterId),
    ]);

    const enrolledSet = new Set((enrollmentsRes.data || []).map((e: any) => e.session_id));

    const upcomingSessions = (sessionsRes.data || []).map((s: any) => ({
      title: s.title,
      sessionType: s.session_type === "individual" ? "1-on-1 Session" : "Group Workshop",
      date: new Date(s.session_date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      meetingLink: s.meeting_link || undefined,
      isEnrolled: enrolledSet.has(s.id),
    }));

    return {
      upcomingSessions,
      enrolledCount: enrollmentsRes.data?.length || 0,
    };
  } catch (err) {
    console.error("[getLiveCoachingContext] Error:", err);
    return { upcomingSessions: [], enrolledCount: 0 };
  }
}

/**
 * Retrieves live Earn While You Learn categories and progress.
 */
export async function getLiveIncomeContext(userId: string): Promise<{
  categories: string[];
  totalVideos: number;
  completedCount: number;
}> {
  try {
    const supabaseAdmin = await createAdminClient();
    const { masterId } = await getStudentDashboardData(userId);

    const [catRes, vidRes, progRes] = await Promise.all([
      supabaseAdmin.from("earn_categories").select("name").order("sort_order", { ascending: true }),
      supabaseAdmin.from("earn_videos").select("id").eq("is_published", true),
      supabaseAdmin.from("student_video_progress").select("id").eq("user_id", masterId).eq("status", "completed"),
    ]);

    return {
      categories: (catRes.data || []).map((c: any) => c.name),
      totalVideos: vidRes.data?.length || 0,
      completedCount: progRes.data?.length || 0,
    };
  } catch (err) {
    console.error("[getLiveIncomeContext] Error:", err);
    return { categories: [], totalVideos: 0, completedCount: 0 };
  }
}

/**
 * Retrieves tracked jobs & career status for the student.
 */
export async function getLiveJobsContext(userId: string): Promise<{
  savedJobs: { title: string; company?: string; status: string }[];
  totalSaved: number;
}> {
  try {
    const supabaseAdmin = await createAdminClient();
    const { masterId } = await getStudentDashboardData(userId);

    const { data: trackerItems } = await supabaseAdmin
      .from("tracker_items")
      .select("title, organization, status")
      .eq("user_id", masterId)
      .eq("reference_type", "job")
      .limit(5);

    const savedJobs = (trackerItems || []).map((item: any) => ({
      title: item.title,
      company: item.organization || "Company",
      status: item.status || "Saved",
    }));

    return {
      savedJobs,
      totalSaved: savedJobs.length,
    };
  } catch (err) {
    console.error("[getLiveJobsContext] Error:", err);
    return { savedJobs: [], totalSaved: 0 };
  }
}

