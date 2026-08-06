"use client";

import React, { createContext, useContext, useState } from "react";
import { getResumesAction } from "@/app/actions/resume";
import { getPersonalizedJobsAction } from "@/app/actions/career-ai";
import { getCareerArticles } from "@/app/actions/career";

export interface EssayCacheItem {
  brainstorm: string;
  brainstormTopic: string;
  review: string;
  reviewContent: string;
  lastMode: "brainstorm" | "review" | null;
}

interface AIStateContextType {
  dashboardData: any | null;
  setDashboardData: (data: any | null) => void;
  essayCache: Record<string, EssayCacheItem>;
  updateEssayCache: (essayId: string, updates: Partial<EssayCacheItem>) => void;
  
  // Background pre-fetched fields
  resumeData: any | null;
  setResumeData: (data: any | null) => void;
  jobsData: any[] | null;
  setJobsData: (data: any[] | null) => void;
  careerArticles: any[] | null;
  setCareerArticles: (data: any[] | null) => void;
  isBackgroundPrefetching: boolean;
  prefetchBackgroundData: () => Promise<void>;
}

const AIStateContext = createContext<AIStateContextType | undefined>(undefined);

export function AIStateProvider({ children }: { children: React.ReactNode }) {
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [essayCache, setEssayCache] = useState<Record<string, EssayCacheItem>>({});

  const [resumeData, setResumeData] = useState<any | null>(null);
  const [jobsData, setJobsData] = useState<any[] | null>(null);
  const [careerArticles, setCareerArticles] = useState<any[] | null>(null);
  const [isBackgroundPrefetching, setIsBackgroundPrefetching] = useState(false);

  const updateEssayCache = (essayId: string, updates: Partial<EssayCacheItem>) => {
    setEssayCache((prev) => {
      const existing = prev[essayId] || {
        brainstorm: "",
        brainstormTopic: "",
        review: "",
        reviewContent: "",
        lastMode: null,
      };
      return {
        ...prev,
        [essayId]: {
          ...existing,
          ...updates,
        },
      };
    });
  };

  const prefetchBackgroundData = async () => {
    if (resumeData && jobsData && careerArticles) return; // Already pre-fetched
    setIsBackgroundPrefetching(true);
    try {
      const [resume, jobs, articles] = await Promise.allSettled([
        getResumesAction(),
        getPersonalizedJobsAction(),
        getCareerArticles()
      ]);

      if (resume.status === "fulfilled") setResumeData(resume.value);
      if (jobs.status === "fulfilled") setJobsData(jobs.value);
      if (articles.status === "fulfilled") setCareerArticles(articles.value);
    } catch (err) {
      console.error("Background prefetch failed:", err);
    } finally {
      setIsBackgroundPrefetching(false);
    }
  };

  return (
    <AIStateContext.Provider
      value={{
        dashboardData,
        setDashboardData,
        essayCache,
        updateEssayCache,
        resumeData,
        setResumeData,
        jobsData,
        setJobsData,
        careerArticles,
        setCareerArticles,
        isBackgroundPrefetching,
        prefetchBackgroundData
      }}
    >
      {children}
    </AIStateContext.Provider>
  );
}

export function useAIState() {
  const context = useContext(AIStateContext);
  if (context === undefined) {
    throw new Error("useAIState must be used within an AIStateProvider");
  }
  return context;
}
