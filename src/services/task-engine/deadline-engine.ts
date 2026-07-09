export interface DashboardDeadline {
  name: string;
  date: string;
  urgent: boolean;
}

export function generateUpcomingDeadlines(
  dbData: {
    applications: any[];
    savedColleges: any[];
  }
): {
  scholarships: DashboardDeadline[];
  essays: DashboardDeadline[];
  colleges: DashboardDeadline[];
} {
  const scholarships: DashboardDeadline[] = [];
  const essays: DashboardDeadline[] = [];
  const colleges: DashboardDeadline[] = [];

  const formatDaysRemaining = (deadlineDateStr: string) => {
    const diff = new Date(deadlineDateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return { label: "Expired", urgent: false };
    if (days === 1) return { label: "1 Day", urgent: true };
    return { label: `${days} Days`, urgent: days <= 7 };
  };

  // 1. Process Scholarships & Essays deadlines
  dbData.applications.forEach(app => {
    if (app.scholarships?.deadline) {
      const { label, urgent } = formatDaysRemaining(app.scholarships.deadline);
      scholarships.push({
        name: app.scholarships.name,
        date: label,
        urgent
      });

      // Essays deadlines tied to scholarships applications
      essays.push({
        name: `${app.scholarships.name} Essay`,
        date: label,
        urgent
      });
    }
  });

  // 2. Process College deadlines
  dbData.savedColleges.forEach(col => {
    if (col.deadline) {
      const { label, urgent } = formatDaysRemaining(col.deadline);
      colleges.push({
        name: col.college_name,
        date: label,
        urgent
      });
    }
  });

  return {
    scholarships: scholarships.slice(0, 3),
    essays: essays.slice(0, 3),
    colleges: colleges.slice(0, 3)
  };
}
