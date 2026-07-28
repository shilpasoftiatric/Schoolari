"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Building, Calendar, Star, Heart, ExternalLink, Sparkles } from "lucide-react";
import { JobDetailPanel } from "@/app/(dashboard)/jobs/JobDetailPanel";
import Swal from "@/lib/swal";
import { toast } from "sonner";
import { saveJobToTrackerAction } from "@/app/actions/career-ai";

export function JobsDashboard({ initialJobs, trackedJobMap }: { initialJobs: any[], trackedJobMap: any }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [tracked, setTracked] = useState(trackedJobMap);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveJob = async (e: React.MouseEvent, job: any) => {
    e.stopPropagation();
    if (tracked[job.job_id]) return;

    // Optimistic UI Update: Instantly turn the heart red!
    setTracked((prev: any) => ({ ...prev, [job.job_id]: "Not Started" }));

    try {
      await saveJobToTrackerAction(job);
      toast.success('Saved to Tracker!');
    } catch (error) {
      console.error(error);
      // Revert if the backend fails
      setTracked((prev: any) => {
        const next = { ...prev };
        delete next[job.job_id];
        return next;
      });
      Swal.fire({ title: "Error", text: "Failed to save job.", icon: "error" });
    }
  };

  return (
    <>
      {jobs.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500">No personalized jobs found. Make sure your profile has career interests set.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job, idx) => {
            const isTracked = !!tracked[job.job_id];

            return (
              <Card
                key={job.job_id || idx}
                className="overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 cursor-pointer border-slate-200 group bg-white hover:border-violet-200 flex flex-col h-full relative"
                onClick={() => setSelectedJob(job)}
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-400 to-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardHeader className="px-4 pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:shadow-md transition-shadow">
                      {job.employer_logo ? (
                        <img src={job.employer_logo} alt={job.employer_name} className="w-full h-full object-contain p-2" />
                      ) : (
                        <Building className="w-7 h-7 text-slate-400 group-hover:text-violet-500 transition-colors" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      className={`h-12 w-12 rounded-full transition-all duration-200 p-0 ${isTracked ? 'text-red-500 cursor-default hover:text-red-500 hover:bg-transparent' : 'hover:scale-110 active:scale-95 text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                      onClick={(e) => {
                        if (!isTracked) handleSaveJob(e, job);
                      }}
                    >
                      <Heart className="size-7 transition-all duration-300" fill={isTracked ? "currentColor" : "none"} />
                    </Button>
                  </div>
                  <div className="mt-5 space-y-1">
                    <CardTitle className="text-xl leading-tight group-hover:text-violet-700 transition-colors line-clamp-2">
                      {job.job_title}
                    </CardTitle>
                    <p className="text-sm font-semibold text-slate-500 truncate">{job.employer_name}</p>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4 flex-1">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      <div className="bg-white p-1.5 rounded-md shadow-sm border border-slate-100">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="truncate font-medium">{job.job_city ? `${job.job_city}, ${job.job_state}` : "Remote"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      <div className="bg-white p-1.5 rounded-md shadow-sm border border-slate-100">
                        <Briefcase className="w-4 h-4 text-amber-500" />
                      </div>
                      <span className="truncate font-medium capitalize">{job.job_employment_type?.toLowerCase().replace("_", " ")}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <Badge variant="secondary" className="bg-violet-100 text-violet-700 hover:bg-violet-200 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI Match
                  </Badge>
                  {isTracked && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 shadow-sm">
                      Tracked
                    </Badge>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          isTracked={!!tracked[selectedJob.job_id]}
          onSave={() => {
            setTracked((prev: any) => ({ ...prev, [selectedJob.job_id]: "Not Started" }));
          }}
        />
      )}
    </>
  );
}
