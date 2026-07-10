import { getSavedColleges } from "@/app/actions/colleges";
import { CollegeDashboard } from "./CollegeDashboard";

export const metadata = {
  title: "College Planning",
};

export default async function CollegesPage() {
  const colleges = await getSavedColleges();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto h-full flex flex-col">
      <CollegeDashboard initialColleges={colleges} />
    </div>
  );
}
