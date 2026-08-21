// ─────────────────────────────────────────────────────────────
// US Education System & Scholarship Matching Engine
// ─────────────────────────────────────────────────────────────

function isGradeEligible(reqGrades: string[], studentGrade: string | undefined | null): boolean {
  if (!studentGrade) return true; // If student grade level not specified, allow browsing
  const sg = studentGrade.toLowerCase().trim();

  // Normalize student category according to US Grade Level Architecture
  let studentCategory: "high_school" | "undergraduate" | "graduate" = "undergraduate";
  if (
    sg.includes("9th") || 
    sg.includes("10th") || 
    sg.includes("11th") || 
    sg.includes("12th") || 
    sg.includes("high school")
  ) {
    studentCategory = "high_school";
  } else if (
    (sg.includes("grad") && !sg.includes("undergrad")) ||
    sg.includes("master") || 
    sg.includes("phd") || 
    sg.includes("doctorate")
  ) {
    studentCategory = "graduate";
  } else {
    studentCategory = "undergraduate";
  }

  for (const rawReq of reqGrades) {
    const req = rawReq.toLowerCase().trim();
    if (req === "all" || req === "any" || req === "open" || req === "" || req.includes("all")) return true;

    // Check high school requirements
    if (req.includes("high school") || req.includes("9th") || req.includes("10th") || req.includes("11th") || req.includes("12th")) {
      if (studentCategory === "high_school") return true;
    }

    // Check undergraduate requirements
    if (
      req.includes("undergrad") || 
      req.includes("college") || 
      req.includes("university") || 
      req.includes("associate") || 
      req.includes("bachelor")
    ) {
      if (studentCategory === "undergraduate") return true;
    }

    // Check graduate requirements (carefully avoid matching "undergraduate")
    const isGraduateReq = (req.includes("graduate") && !req.includes("undergraduate")) || req.includes("master") || req.includes("phd") || req.includes("doctorate");
    if (isGraduateReq) {
      if (studentCategory === "graduate") return true;
    }
  }

  return false;
}

function parseGpa(gpaStr: string | number | undefined | null): number {
  if (gpaStr === undefined || gpaStr === null || gpaStr === "") return NaN;
  if (typeof gpaStr === "number") return gpaStr;
  const str = String(gpaStr).trim();
  const matches = str.match(/([0-9]+(\.[0-9]+)?)/g);
  if (matches && matches.length > 0) {
    return parseFloat(matches[0]);
  }
  return NaN;
}

export function isScholarshipEligible(scholarship: any, profile: any): boolean {
  if (!profile) return true; // If no profile, allow open browsing

  // 1. Gender check
  if (scholarship.eligible_gender && profile.gender) {
    const sGender = scholarship.eligible_gender.toLowerCase().trim();
    const pGender = profile.gender.toLowerCase().trim();
    const openGenders = ["all", "any", "both", "open", "all genders", "co-ed", "coed", ""];
    if (!openGenders.includes(sGender) && !sGender.includes(pGender) && !pGender.includes(sGender)) {
      return false;
    }
  }

  // 2. State check
  if (scholarship.eligible_states && profile.state) {
    const sStates = scholarship.eligible_states.toLowerCase().trim();
    const pState = profile.state.toLowerCase().trim();
    
    // Check if scholarship is open nationally / geographically unrestricted
    const isOpenState = 
      scholarship.state_eligibility_all === true ||
      sStates === "" ||
      sStates === "all" ||
      sStates === "all states" ||
      sStates === "all 50 states" ||
      sStates === "national" ||
      sStates === "nationwide" ||
      sStates === "united states" ||
      sStates === "us" ||
      sStates.includes("no geographic restrictions") ||
      sStates.includes("all 50 states");

    if (!isOpenState) {
      const stateList = sStates.split(",").map((s: string) => s.trim());
      const stateMatches = stateList.some((s: string) => s === pState || s.includes(pState) || pState.includes(s));
      if (!stateMatches) {
        return false;
      }
    }
  }

  // 3. GPA requirement
  if (scholarship.min_gpa_required) {
    const requiredGpa = parseFloat(scholarship.min_gpa_required);
    const studentGpa = parseGpa(profile.unweighted_gpa || profile.weighted_gpa || profile.gpa);
    if (!isNaN(requiredGpa) && !isNaN(studentGpa) && studentGpa < requiredGpa) {
      return false;
    }
  }

  // 4. Major check
  if (scholarship.eligible_majors) {
    const sMajors = scholarship.eligible_majors.toLowerCase().trim();
    const openMajors = ["all", "any", "any major", "open", "all majors", "open to all", "general", ""];
    const isOpenMajor = 
      openMajors.includes(sMajors) || 
      sMajors.includes("any major") || 
      sMajors.includes("all majors") || 
      sMajors.includes("open to all");
    
    if (!isOpenMajor) {
      const studentMajors = [
        ...(Array.isArray(profile.intended_major) ? profile.intended_major : (profile.intended_major ? [profile.intended_major] : [])),
        ...(Array.isArray(profile.fields_of_study) ? profile.fields_of_study : (profile.fields_of_study ? [profile.fields_of_study] : [])),
        ...(Array.isArray(profile.career_interest) ? profile.career_interest : (profile.career_interest ? [profile.career_interest] : [])),
        ...(Array.isArray(profile.career_interests) ? profile.career_interests : (profile.career_interests ? [profile.career_interests] : []))
      ].map(m => String(m).toLowerCase().trim());

      if (studentMajors.length > 0) {
        const matchesMajor = studentMajors.some(sm => sMajors.includes(sm) || sm.split(" ").some(word => word.length > 3 && sMajors.includes(word)));
        if (!matchesMajor) return false;
      }
    }
  }

  // 5. Ethnicity check
  if (scholarship.eligible_ethnicities && profile.ethnicity) {
    const sEth = scholarship.eligible_ethnicities.toLowerCase().trim();
    const openEth = ["all", "any", "open", "all ethnicities", "all races", ""];
    const isOpenEth = openEth.includes(sEth) || sEth.includes("all");
    if (!isOpenEth) {
      const studentEths = (Array.isArray(profile.ethnicity) ? profile.ethnicity : [profile.ethnicity])
        .map(e => String(e).toLowerCase().trim());
      if (studentEths.length > 0) {
        const matchesEth = studentEths.some(se => sEth.includes(se) || se.split(" ").some(word => word.length > 3 && sEth.includes(word)));
        if (!matchesEth) return false;
      }
    }
  }

  // 6. Grade level check
  if (scholarship.grade_levels && profile.grade_level) {
    const reqGrades = Array.isArray(scholarship.grade_levels)
      ? scholarship.grade_levels.map((g: string) => String(g))
      : [String(scholarship.grade_levels)];

    if (!isGradeEligible(reqGrades, profile.grade_level)) {
      return false;
    }
  }

  return true;
}

export function scoreScholarshipForProfile(scholarship: any, profile: any): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  if (!profile) {
    return { score: 50, reason: "Open scholarship — no profile data." };
  }

  // Major match (+30)
  const studentMajors = [
    ...(Array.isArray(profile.intended_major) ? profile.intended_major : (profile.intended_major ? [profile.intended_major] : [])),
    ...(Array.isArray(profile.fields_of_study) ? profile.fields_of_study : (profile.fields_of_study ? [profile.fields_of_study] : []))
  ].filter(Boolean);

  if (studentMajors.length > 0 && scholarship.eligible_majors) {
    const majors = scholarship.eligible_majors.toLowerCase();
    const matches = studentMajors.some((m: string) => majors.includes(m.toLowerCase()));
    if (majors.includes("any major") || majors.includes("all majors") || matches) {
      score += 30;
      reasons.push(studentMajors[0] ? `your ${studentMajors[0]} major` : "major alignment");
    }
  }

  // State match (+20)
  if (profile.state && scholarship.eligible_states) {
    const states = scholarship.eligible_states.toLowerCase();
    if (states.includes("all") || states.includes("national") || states.includes("no geographic restrictions") || states.includes(profile.state.toLowerCase())) {
      score += 20;
      reasons.push(`${profile.state} state eligibility`);
    }
  }

  // Grade level match (+20)
  if (profile.grade_level && scholarship.grade_levels) {
    const reqGrades = Array.isArray(scholarship.grade_levels)
      ? scholarship.grade_levels.map((g: string) => String(g))
      : [String(scholarship.grade_levels)];
    if (isGradeEligible(reqGrades, profile.grade_level)) {
      score += 20;
      reasons.push(`${profile.grade_level} standing`);
    }
  }

  // GPA meets minimum (+15)
  if (scholarship.min_gpa_required) {
    const req = parseFloat(scholarship.min_gpa_required);
    const studentGpa = parseGpa(profile.unweighted_gpa || profile.weighted_gpa || profile.gpa);
    if (!isNaN(req) && !isNaN(studentGpa) && studentGpa >= req) {
      score += 15;
      reasons.push(`your GPA`);
    }
  } else {
    // No GPA restriction
    score += 10;
  }

  // Deadline urgency boost (+10)
  if (scholarship.deadline) {
    const days = Math.ceil((new Date(scholarship.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days > 0 && days <= 30) score += 10;
  }

  // Featured boost (+5)
  if (scholarship.featured) score += 5;

  const reason = reasons.length > 0
    ? `Matches based on ${reasons.join(", ")}.`
    : "Open scholarship — verified for your profile.";

  return { score: Math.min(score, 100), reason };
}

