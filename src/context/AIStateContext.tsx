"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { getResumesAction } from "@/app/actions/resume";
import { getPersonalizedJobsAction } from "@/app/actions/career-ai";
import { getCareerArticles } from "@/app/actions/career";
import { toast } from "sonner";

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

  const fetchingRef = useRef({ resume: false, jobs: false, articles: false });

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

  // Prefetch Resume Data in background
  useEffect(() => {
    const fetchResume = async () => {
      if (resumeData || fetchingRef.current.resume) return;
      fetchingRef.current.resume = true;
      try {
        const data = await getResumesAction();
        setResumeData(data);
      } catch (err) {
        console.error("Prefetch resume failed:", err);
      } finally {
        fetchingRef.current.resume = false;
      }
    };
    fetchResume();
  }, [resumeData]);

  // Prefetch Personalized Jobs Data in background (uses Claude AI)
  useEffect(() => {
    const fetchJobs = async () => {
      if (jobsData || fetchingRef.current.jobs) return;
      fetchingRef.current.jobs = true;
      try {
        const data = await getPersonalizedJobsAction();
        setJobsData(data);
      } catch (err) {
        console.error("Prefetch jobs failed:", err);
      } finally {
        fetchingRef.current.jobs = false;
      }
    };
    fetchJobs();
  }, [jobsData]);

  // Prefetch Career Articles in background
  useEffect(() => {
    const fetchArticles = async () => {
      if (careerArticles || fetchingRef.current.articles) return;
      fetchingRef.current.articles = true;
      try {
        const data = await getCareerArticles();
        setCareerArticles(data);
      } catch (err) {
        console.error("Prefetch articles failed:", err);
      } finally {
        fetchingRef.current.articles = false;
      }
    };
    fetchArticles();
  }, [careerArticles]);

  // Listen to the Claude API hit cookie
  useEffect(() => {
    let lastHit: string | null = null;
    
    const getCookie = (name: string) => {
      if (typeof document === "undefined") return null;
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    };

    lastHit = getCookie("claude-api-hit");

    const interval = setInterval(() => {
      const currentHit = getCookie("claude-api-hit");
      if (currentHit && currentHit !== lastHit) {
        lastHit = currentHit;
        // toast.info("Claude API key is hit!");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const prefetchBackgroundData = async () => {
    // No-op: Background fetching is now handled automatically by useEffect hooks
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
