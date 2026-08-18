export function isScholarshipEligible(scholarship: any, profile: any): boolean {
  if (!profile) return true; // If no profile, allow open browsing

  // 1. Gender exclusion
  if (scholarship.eligible_gender && profile.gender) {
    const eligibleGender = scholarship.eligible_gender.toLowerCase().trim();
    const studentGender = profile.gender.toLowerCase().trim();
    if (
      eligibleGender !== "all" &&
      eligibleGender !== "any" &&
      eligibleGender !== "both" &&
      eligibleGender !== "open" &&
      eligibleGender !== "" &&
      !eligibleGender.includes(studentGender)
    ) {
      return false;
    }
  }

  // 2. State exclusion
  if (scholarship.eligible_states && profile.state) {
    const states = scholarship.eligible_states.toLowerCase();
    if (
      !states.includes("all") &&
      !states.includes("national") &&
      !states.includes("any") &&
      !states.includes("no geographic restrictions") &&
      !states.includes("united states") &&
      !states.includes("us") &&
      states.trim() !== "" &&
      !states.includes(profile.state.toLowerCase())
    ) {
      return false;
    }
  }

  // 3. GPA requirement
  if (scholarship.min_gpa_required) {
    const requiredGpa = parseFloat(scholarship.min_gpa_required);
    const studentGpa = parseFloat(profile.unweighted_gpa);
    if (!isNaN(requiredGpa) && (isNaN(studentGpa) || studentGpa < requiredGpa)) {
      return false;
    }
  }

  // 4. Major exclusion
  if (scholarship.eligible_majors && profile.intended_major && profile.intended_major.length > 0) {
    const reqMajors = scholarship.eligible_majors.toLowerCase();
    if (!reqMajors.includes("all") && !reqMajors.includes("any") && !reqMajors.includes("open") && reqMajors.trim() !== "") {
      const matches = profile.intended_major.some((major: string) => reqMajors.includes(major.toLowerCase()));
      if (!matches) return false;
    }
  }

  // 5. Ethnicity exclusion
  if (scholarship.eligible_ethnicities && profile.ethnicity && profile.ethnicity.length > 0) {
    const reqEthnicities = scholarship.eligible_ethnicities.toLowerCase();
    if (!reqEthnicities.includes("all") && !reqEthnicities.includes("any") && reqEthnicities.trim() !== "") {
      const matches = profile.ethnicity.some((eth: string) => reqEthnicities.includes(eth.toLowerCase()));
      if (!matches) return false;
    }
  }

  // 6. Grade level exclusion
  if (scholarship.grade_levels && profile.grade_level) {
    const reqGrades = Array.isArray(scholarship.grade_levels) 
      ? scholarship.grade_levels.map((g: string) => String(g).toLowerCase()) 
      : [String(scholarship.grade_levels).toLowerCase()];
    
    // Check if the student's grade level is anywhere in the required grades array/string
    const matches = reqGrades.some((req: string) => req.includes(profile.grade_level.toLowerCase()) || profile.grade_level.toLowerCase().includes(req));
    if (!matches && !reqGrades.some((req: string) => req.includes("all") || req.includes("any"))) {
      return false;
    }
  }

  return true;
}

export function scoreScholarshipForProfile(scholarship: any, profile: any): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // Major match (+25)
  if (profile.intended_major && scholarship.eligible_majors) {
    const majors = scholarship.eligible_majors.toLowerCase();
    if (majors.includes("any major") || majors.includes(profile.intended_major.toLowerCase())) {
      score += 25;
      reasons.push(`your ${profile.intended_major} major`);
    }
  }

  // State match (+20)
  if (profile.state && scholarship.eligible_states) {
    const states = scholarship.eligible_states.toLowerCase();
    if (states.includes("all") || states.includes(profile.state.toLowerCase())) {
      score += 20;
      reasons.push(`${profile.state} state residency`);
    }
  }

  // Grade level match (+15)
  if (profile.grade_level && scholarship.grade_levels) {
    const levels = Array.isArray(scholarship.grade_levels)
      ? scholarship.grade_levels.map((g: string) => g.toLowerCase())
      : [String(scholarship.grade_levels).toLowerCase()];
    if (levels.some((l: string) => l.includes(profile.grade_level?.toLowerCase() || ""))) {
      score += 15;
      reasons.push(`your grade level`);
    }
  }

  // GPA meets minimum (+15)
  if (profile.unweighted_gpa && scholarship.min_gpa_required) {
    if (Number(profile.unweighted_gpa) >= Number(scholarship.min_gpa_required)) {
      score += 15;
      reasons.push(`your ${profile.unweighted_gpa} GPA`);
    }
  } else if (!scholarship.min_gpa_required) {
    // No GPA requirement — open to all
    score += 10;
  }

  // Deadline urgency boost (+10)
  if (scholarship.deadline) {
    const days = Math.ceil((new Date(scholarship.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days > 0 && days <= 30) score += 10;
  }

  // Career interest keyword match (+10)
  if (profile.career_interest && scholarship.description) {
    if (scholarship.description.toLowerCase().includes(profile.career_interest.toLowerCase())) {
      score += 10;
      reasons.push(`your ${profile.career_interest} career interest`);
    }
  }

  // Featured boost (+5)
  if (scholarship.featured) score += 5;

  const reason = reasons.length > 0
    ? `Matches based on ${reasons.join(", ")}.`
    : "Open scholarship — no specific eligibility restrictions.";

  return { score: Math.min(score, 100), reason };
}
