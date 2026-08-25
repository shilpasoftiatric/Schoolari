"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import Swal from "@/lib/swal";
import { toast } from "sonner";
import {
  ResumeDocument,
  ResumeTemplateTheme,
  ATSTailorResult
} from "@/types/resume";
import {
  Printer,
  Download,
  Copy,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
  Maximize2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResumePreviewProps {
  resume: ResumeDocument;
  theme: ResumeTemplateTheme;
  onThemeChange: (theme: ResumeTemplateTheme) => void;
  atsResult?: ATSTailorResult | null;
  onSaveToVault: () => void;
  isSavingVault: boolean;
}

function FullscreenPortal({ isFullscreen, onClose, children }: { isFullscreen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (isFullscreen && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-md flex justify-center items-start overflow-y-auto p-4 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="fixed top-6 right-6 w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-900 hover:bg-slate-200 z-[60] shadow-2xl transition-transform hover:scale-110"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>,
      document.body
    );
  }
  return <div className="relative">{children}</div>;
}

export function ResumePreview({
  resume,
  theme,
  onThemeChange,
  atsResult,
  onSaveToVault,
  isSavingVault
}: ResumePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalBulletsCount =
    (resume.experience?.reduce((acc, e) => acc + (e.bullets?.length || 0), 0) || 0) +
    (resume.extracurriculars?.reduce((acc, e) => acc + (e.bullets?.length || 0), 0) || 0);

  const isOverOnePageWarning =
    totalBulletsCount > 15 ||
    (resume.experience?.length || 0) + (resume.extracurriculars?.length || 0) > 6;

  const handlePrintPdf = () => {
    const typeText = resume.resume_type === "academic" ? "Academic" : resume.resume_type === "professional" ? "Professional" : "Resume";
    const firstName = resume.header?.first_name || "Student";
    const lastName = resume.header?.last_name || "";
    const fileName = lastName ? `${firstName} ${lastName} - ${typeText} Resume` : `${firstName} - ${typeText} Resume`;
    
    const originalTitle = document.title;
    document.title = fileName;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const handleCopyPlaintext = () => {
    const text = generatePlaintextResume(resume);
    navigator.clipboard.writeText(text);
    toast.success("Plaintext resume copied to clipboard!");
  };

  const handleDownloadDocs = () => {
    const { header, education, experience, extracurriculars, awards, skills } = resume;

    const row = (left: string, right: string) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:4px; border:none; padding:0;">
        <tr>
          <td style="text-align:left; vertical-align:top; border:none; padding:0; color:#000;">${left}</td>
          <td style="text-align:right; vertical-align:top; border:none; padding:0; color:#000;">${right}</td>
        </tr>
      </table>
    `;

    const links = [header.city_state, header.phone, header.email, header.linkedin_url, header.portfolio_url].filter(Boolean).join(" &nbsp;&bull;&nbsp; ");

    let htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Resume Export</title>
  <style>
    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; line-height: 1.3; margin: 0; padding: 0; }
    h1 { font-size: 24pt; font-weight: bold; text-align: center; margin: 0 0 6px 0; text-transform: uppercase; color: #000; }
    h2 { font-size: 13pt; font-weight: bold; border-bottom: 1px solid #000; margin: 16px 0 8px 0; padding-bottom: 2px; text-transform: uppercase; color: #000; }
    p { margin: 0 0 4px 0; color: #000; }
    ul { margin: 4px 0 8px 0; padding-left: 24px; color: #000; }
    li { margin-bottom: 3px; color: #000; }
    .header-links { text-align: center; font-size: 10.5pt; margin-bottom: 16px; color: #000; }
  </style>
</head>
<body>
  <h1>${header.first_name || "Student"} ${header.last_name || "Name"}</h1>
  <div class="header-links">
    ${links}
  </div>
`;

    if (header.summary) {
      htmlContent += `<h2>Summary</h2><p>${header.summary}</p>`;
    }

    if (education && education.length > 0) {
      htmlContent += `<h2>Education</h2>`;
      education.forEach(edu => {
        htmlContent += row(
          `<b>${edu.institution}</b> &ndash; ${edu.location}`,
          `Expected: ${edu.graduation_year}`
        );
        htmlContent += row(
          `<i>${edu.grade_level_or_degree}</i>`,
          `GPA: ${edu.gpa_unweighted || "N/A"}${edu.gpa_weighted ? ` / ${edu.gpa_weighted} Weighted` : ""}`
        );
        if (edu.honors_coursework) {
          htmlContent += `<p style="margin-top:2px;"><b>Honors Coursework:</b> ${edu.honors_coursework}</p>`;
        }
      });
    }

    if (experience && experience.length > 0) {
      htmlContent += `<h2>Professional & Leadership Experience</h2>`;
      experience.forEach(exp => {
        htmlContent += row(
          `<b>${exp.title}</b> &mdash; <i>${exp.organization}</i>`,
          `${exp.start_date} &ndash; ${exp.is_current ? "Present" : exp.end_date} | ${exp.location}`
        );
        if (exp.bullets && exp.bullets.length > 0) {
          htmlContent += `<ul>${exp.bullets.map(b => `<li>${b}</li>`).join("")}</ul>`;
        }
      });
    }

    if (extracurriculars && extracurriculars.length > 0) {
      htmlContent += `<h2>Extracurricular Activities & Community Service</h2>`;
      extracurriculars.forEach(ext => {
        htmlContent += row(
          `<b>${ext.role}</b> &mdash; <i>${ext.activity}</i>`,
          `${ext.start_date} &ndash; ${ext.end_date}${ext.hours_per_week ? ` (${ext.hours_per_week} hrs/wk)` : ""}`
        );
        if (ext.bullets && ext.bullets.length > 0) {
          htmlContent += `<ul>${ext.bullets.map(b => `<li>${b}</li>`).join("")}</ul>`;
        }
      });
    }

    if (awards && awards.length > 0) {
      htmlContent += `<h2>Honors & Awards</h2>`;
      awards.forEach(aw => {
        htmlContent += row(
          `<b>${aw.title}</b> (${aw.issuer})`,
          `${aw.year} &ndash; ${aw.level} Level`
        );
        if (aw.description) {
          htmlContent += `<p style="margin-top:2px;"><i>${aw.description}</i></p>`;
        }
      });
    }

    const allSkills = [];
    if (skills?.technical?.length) allSkills.push(`<b>Technical:</b> ${skills.technical.join(", ")}`);
    if (skills?.soft?.length) allSkills.push(`<b>Interpersonal:</b> ${skills.soft.join(", ")}`);
    if (skills?.languages?.length) allSkills.push(`<b>Languages:</b> ${skills.languages.join(", ")}`);
    if (skills?.certifications?.length) allSkills.push(`<b>Certifications:</b> ${skills.certifications.join(", ")}`);

    if (allSkills.length > 0) {
      htmlContent += `<h2>Skills, Languages & Certifications</h2><ul style="margin-top:4px;">`;
      allSkills.forEach(s => {
        htmlContent += `<li>${s}</li>`;
      });
      htmlContent += `</ul>`;
    }

    htmlContent += `</body></html>`;

    const blob = new Blob(['\ufeff', htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const typeText = resume.resume_type === "academic" ? "academic" : resume.resume_type === "professional" ? "professional" : "resume";
    const firstName = (resume.header?.first_name || "student").toLowerCase();
    const lastName = (resume.header?.last_name || "").toLowerCase();
    const fileName = lastName ? `${firstName}_${lastName}_${typeText}_resume` : `${firstName}_${typeText}_resume`;
    link.download = `${fileName}.doc`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Resume downloaded as Docs!");
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Controls Bar (Hidden in Print) */}
      <div className="print:hidden bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm text-slate-800 overflow-hidden">
        {/* Main Row: Template Selector & Primary Action */}
        <div className="p-3 sm:p-3.5 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 border-b border-slate-100/80">
          {/* Template Dropdown Selector */}
          <div className="flex items-center gap-2.5">
            <label htmlFor="resume-template-select" className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              Template:
            </label>
            <Select
              value={theme}
              onValueChange={(val) => onThemeChange(val as ResumeTemplateTheme)}
            >
              <SelectTrigger id="resume-template-select" className="h-9 w-[180px] rounded-full border-2 border-violet-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:border-violet-300 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all">
                <SelectValue placeholder="Select template">
                  {theme === "classic" ? "Classic Professional" : theme === "modern" ? "Modern Clean" : theme === "executive" ? "Executive Standard" : theme === "college" ? "College Ready" : theme === "internship" ? "Internship Ready" : "Classic Professional"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} sideOffset={5} className="rounded-xl border border-slate-200 bg-white shadow-xl">
                <SelectItem value="classic" className="cursor-pointer py-2.5 px-3 font-semibold text-slate-700 focus:bg-slate-50 focus:text-violet-700">Classic Professional</SelectItem>
                <SelectItem value="modern" className="cursor-pointer py-2.5 px-3 font-semibold text-slate-700 focus:bg-slate-50 focus:text-violet-700">Modern Clean</SelectItem>
                <SelectItem value="executive" className="cursor-pointer py-2.5 px-3 font-semibold text-slate-700 focus:bg-slate-50 focus:text-violet-700">Executive Standard</SelectItem>
                <SelectItem value="college" className="cursor-pointer py-2.5 px-3 font-semibold text-slate-700 focus:bg-slate-50 focus:text-violet-700">College Ready</SelectItem>
                <SelectItem value="internship" className="cursor-pointer py-2.5 px-3 font-semibold text-slate-700 focus:bg-slate-50 focus:text-violet-700">Internship Ready</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Primary Print / Save PDF Button */}
          <Button
            type="button"
            onClick={handlePrintPdf}
            className="h-9.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20 whitespace-nowrap w-full xl:w-auto"
          >
            <Printer className="w-4 h-4 mr-1.5" /> Print / Save PDF
          </Button>
        </div>

        {/* Secondary Utility Row: Copy Text, TXT, Save to Vault */}
        <div className="px-3 sm:px-3.5 py-2.5 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              onClick={handleCopyPlaintext}
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-xl text-xs font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Copy Plain Text
            </Button>
            <Button
              type="button"
              onClick={handleDownloadDocs}
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-xl text-xs font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Export to Docs
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={onSaveToVault}
              disabled={isSavingVault}
              variant="outline"
              size="sm"
              className="h-8 px-3.5 rounded-xl text-xs font-bold bg-emerald-50 border-emerald-200/80 text-emerald-700 hover:bg-emerald-100/80 shadow-2xs whitespace-nowrap"
            >
              <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Save to Vault
            </Button>
          </div>
        </div>
      </div>

      {/* 1-Page Overflow Warning */}
      {isOverOnePageWarning && (
        <div className="print:hidden p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-800 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            ⚠️ Your resume is quite detailed ({totalBulletsCount} bullets). In Student ATS formatting, keep to 1 page by condensing older items or using AI concise wording.
          </span>
        </div>
      )}

      {/* ATS Match Score Meter Banner (if present) */}
      {atsResult && (
        <div className="print:hidden p-4 rounded-3xl bg-gradient-to-r from-violet-900 to-indigo-900 text-white shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-black tracking-wide">
                ATS JOB & SCHOLARSHIP MATCH ANALYSIS
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-slate-300 uppercase">
                Match Score:
              </span>
              <span
                className={`text-lg font-black px-3 py-0.5 rounded-full ${atsResult.ats_score >= 80
                  ? "bg-emerald-500 text-white"
                  : atsResult.ats_score >= 60
                    ? "bg-amber-500 text-slate-950"
                    : "bg-red-500 text-white"
                  }`}
              >
                {atsResult.ats_score}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
              <span className="font-extrabold text-emerald-300 block mb-1">
                ✅ Matched ATS Keywords
              </span>
              <div className="flex flex-wrap gap-1">
                {atsResult.matched_keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-200 text-[10px] font-bold"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
              <span className="font-extrabold text-amber-300 block mb-1">
                ⚠️ Missing Keywords to Incorporate
              </span>
              <div className="flex flex-wrap gap-1">
                {atsResult.missing_keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-200 text-[10px] font-bold"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {atsResult.suggestions && atsResult.suggestions.length > 0 && (
            <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-1.5">
              <span className="text-xs font-extrabold text-yellow-300 block">
                💡 AI Tailoring Recommendations:
              </span>
              {atsResult.suggestions.map((sug, i) => (
                <div key={i} className="text-xs text-slate-200">
                  <span className="font-bold">[{sug.section.toUpperCase()}]</span>{" "}
                  {sug.advice}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Resume Type Badge (Hidden when printing) */}
      <div className="print:hidden flex items-center justify-between bg-white/80 border border-slate-200/80 rounded-2xl gap-4 px-4 py-2.5 max-w-[850px] mx-auto w-full shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-700">Resume Type:</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold border border-violet-200/80">
            {resume.resume_type === "academic"
              ? "Academic Resume"
              : resume.resume_type === "professional"
                ? "Professional Resume"
                : "Academic & Professional Resume"}
          </span>
        </div>
        {/* <span className="text-[10px] font-bold text-slate-500">
          {resume.resume_type === "academic"
            ? "Optimized for College & Scholarship Applications"
            : resume.resume_type === "professional"
              ? "Optimized for Jobs & Internships"
              : "Comprehensive 1-Page Student Architecture"}
        </span> */}
      </div>

      {/* 
        Printable Resume Document Paper 
        Uses standard 8.5 x 11 inch proportions, clean typography, ATS readable
      */}
      <FullscreenPortal isFullscreen={isFullscreen} onClose={() => setIsFullscreen(false)}>
        <div
          id="print-resume-area"
          className={`bg-white text-slate-900 rounded-3xl border border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] p-8 sm:p-12 lg:p-14 print:border-none print:shadow-none print:w-full print:max-w-none print:min-h-0 print:m-0 print:rounded-none max-w-[850px] w-full mx-auto min-h-[1056px] flex flex-col justify-between transition-all relative group ${
            theme === "classic" ? "font-serif text-slate-950" :
            theme === "college" ? "font-serif text-slate-900" :
            theme === "modern" ? "font-sans text-slate-900" :
            theme === "internship" ? "font-sans text-slate-800" :
            "font-sans tracking-tight text-slate-900"
          }`}
        >
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="print:hidden absolute top-6 right-6 p-2.5 rounded-xl bg-slate-100/80 hover:bg-violet-100 text-slate-500 hover:text-violet-700 transition-colors opacity-0 group-hover:opacity-100 z-10 shadow-sm"
              title="Full Preview"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          )}
          <div className="space-y-6">
            {/* Header Section */}
            <header
              className={`space-y-1.5 ${
                theme === "classic" ? "text-center border-b-2 border-slate-900 pb-4" :
                theme === "college" ? "text-left border-b-4 border-slate-800 pb-3" :
                theme === "modern" ? "text-left pb-4" :
                theme === "internship" ? "text-left border-b border-slate-300 pb-3" :
                "text-center pb-4 border-b border-slate-300"
              }`}
            >
              <h1
                className={`tracking-tight ${
                  theme === "classic" ? "text-3xl sm:text-4xl uppercase font-black" :
                  theme === "college" ? "text-4xl font-serif font-semibold text-slate-900" :
                  theme === "modern" ? "text-4xl text-slate-950 font-extrabold" :
                  theme === "internship" ? "text-3xl text-slate-900 font-black" :
                  "text-2xl uppercase tracking-[0.2em] font-medium text-slate-800"
                }`}
              >
                {resume.header.first_name || "STUDENT"}{" "}
                {resume.header.last_name || "NAME"}
              </h1>
              <div
                className={`flex flex-wrap items-center gap-2 text-xs text-slate-600 ${["modern", "college", "internship"].includes(theme) ? "justify-start" : "justify-center"
                  }`}
              >
                {resume.header.city_state && <span>{resume.header.city_state}</span>}
                {resume.header.phone && (
                  <>
                    <span>•</span>
                    <span>{resume.header.phone}</span>
                  </>
                )}
                {resume.header.email && (
                  <>
                    <span>•</span>
                    <span>{resume.header.email}</span>
                  </>
                )}
                {resume.header.linkedin_url && (
                  <>
                    <span>•</span>
                    <span>{resume.header.linkedin_url}</span>
                  </>
                )}
              </div>
              {resume.header.summary && (
                <p
                  className={`text-xs text-slate-700 pt-2 ${["classic", "college"].includes(theme) ? "italic" : ""
                    }`}
                >
                  {resume.header.summary}
                </p>
              )}
            </header>

            {/* Education Section */}
            {resume.education && resume.education.length > 0 && (
              <section className="space-y-2">
                <h2
                  className={`text-xs uppercase tracking-widest ${
                    theme === "classic" ? "font-extrabold border-b-2 border-slate-900 pb-1 text-slate-900" :
                    theme === "college" ? "font-bold font-serif italic border-b border-slate-300 pb-0.5 text-slate-800" :
                    theme === "modern" ? "font-extrabold text-violet-700 pb-0.5 border-b-2 border-violet-100" :
                    theme === "internship" ? "font-black text-slate-900 pb-0.5 border-b border-slate-300" :
                    "font-semibold tracking-[0.15em] border-t border-b border-slate-200 py-1 text-slate-700 text-center w-full block mb-2"
                  }`}
                >
                  Education
                </h2>
                <div className="space-y-3">
                  {resume.education.map((edu) => (
                    <div key={edu.id} className="text-xs space-y-0.5">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900">{edu.institution}</span>
                        <span className="text-slate-600">
                          {edu.location} | Expected: {edu.graduation_year}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>{edu.grade_level_or_degree}</span>
                        <span>
                          {edu.gpa_unweighted && `GPA: ${edu.gpa_unweighted}/4.0 Unweighted`}
                          {edu.gpa_weighted && ` (${edu.gpa_weighted}/5.0+ Weighted)`}
                        </span>
                      </div>
                      {edu.honors_coursework && (
                        <div className="text-[11px] text-slate-600 italic">
                          Honors / AP / IB Coursework: {edu.honors_coursework}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Experience Section */}
            {resume.experience && resume.experience.length > 0 && (
              <section className="space-y-2">
                <h2
                  className={`text-xs uppercase tracking-widest ${
                    theme === "classic" ? "font-extrabold border-b-2 border-slate-900 pb-1 text-slate-900" :
                    theme === "college" ? "font-bold font-serif italic border-b border-slate-300 pb-0.5 text-slate-800" :
                    theme === "modern" ? "font-extrabold text-violet-700 pb-0.5 border-b-2 border-violet-100" :
                    theme === "internship" ? "font-black text-slate-900 pb-0.5 border-b border-slate-300" :
                    "font-semibold tracking-[0.15em] border-t border-b border-slate-200 py-1 text-slate-700 text-center w-full block mb-2"
                  }`}
                >
                  Professional & Leadership Experience
                </h2>
                <div className="space-y-4">
                  {resume.experience.map((exp) => (
                    <div key={exp.id} className="text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900">
                          {exp.title} —{" "}
                          <span className="font-semibold text-slate-700">
                            {exp.organization}
                          </span>
                        </span>
                        <span className="text-slate-600">
                          {exp.location} | {exp.start_date} – {exp.end_date}
                        </span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700 pl-1">
                        {exp.bullets.map((b, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Extracurriculars & Volunteer Work */}
            {resume.extracurriculars && resume.extracurriculars.length > 0 && (
              <section className="space-y-2">
                <h2
                  className={`text-xs uppercase tracking-widest ${
                    theme === "classic" ? "font-extrabold border-b-2 border-slate-900 pb-1 text-slate-900" :
                    theme === "college" ? "font-bold font-serif italic border-b border-slate-300 pb-0.5 text-slate-800" :
                    theme === "modern" ? "font-extrabold text-violet-700 pb-0.5 border-b-2 border-violet-100" :
                    theme === "internship" ? "font-black text-slate-900 pb-0.5 border-b border-slate-300" :
                    "font-semibold tracking-[0.15em] border-t border-b border-slate-200 py-1 text-slate-700 text-center w-full block mb-2"
                  }`}
                >
                  Extracurricular Activities & Community Service
                </h2>
                <div className="space-y-4">
                  {resume.extracurriculars.map((ext) => (
                    <div key={ext.id} className="text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900">
                          {ext.role} —{" "}
                          <span className="font-semibold text-slate-700">
                            {ext.activity}
                          </span>
                        </span>
                        <span className="text-slate-600">
                          {ext.start_date} – {ext.end_date}
                          {ext.hours_per_week ? ` (${ext.hours_per_week})` : ""}
                        </span>
                      </div>
                      {ext.bullets && ext.bullets.length > 0 && (
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700 pl-1">
                          {ext.bullets.map((b, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Honors & Awards */}
            {resume.awards && resume.awards.length > 0 && (
              <section className="space-y-2">
                <h2
                  className={`text-xs uppercase tracking-widest ${
                    theme === "classic" ? "font-extrabold border-b-2 border-slate-900 pb-1 text-slate-900" :
                    theme === "college" ? "font-bold font-serif italic border-b border-slate-300 pb-0.5 text-slate-800" :
                    theme === "modern" ? "font-extrabold text-violet-700 pb-0.5 border-b-2 border-violet-100" :
                    theme === "internship" ? "font-black text-slate-900 pb-0.5 border-b border-slate-300" :
                    "font-semibold tracking-[0.15em] border-t border-b border-slate-200 py-1 text-slate-700 text-center w-full block mb-2"
                  }`}
                >
                  Honors & Awards
                </h2>
                <div className="space-y-1.5 text-xs">
                  {resume.awards.map((awd) => (
                    <div
                      key={awd.id}
                      className="flex items-center justify-between text-slate-800"
                    >
                      <div>
                        <span className="font-bold">{awd.title}</span>
                        <span className="text-slate-600">
                          {" "}
                          — {awd.issuer} ({awd.level} Recognition)
                        </span>
                      </div>
                      <span className="text-slate-500 font-medium">{awd.year}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills, Languages & Certifications */}
            <section className="space-y-2">
              <h2
                className={`text-xs uppercase tracking-widest ${
                  theme === "classic" ? "font-extrabold border-b-2 border-slate-900 pb-1 text-slate-900" :
                  theme === "college" ? "font-bold font-serif italic border-b border-slate-300 pb-0.5 text-slate-800" :
                  theme === "modern" ? "font-extrabold text-violet-700 pb-0.5 border-b-2 border-violet-100" :
                  theme === "internship" ? "font-black text-slate-900 pb-0.5 border-b border-slate-300" :
                  "font-semibold tracking-[0.15em] border-t border-b border-slate-200 py-1 text-slate-700 text-center w-full block mb-2"
                }`}
              >
                Skills, Languages & Certifications
              </h2>
              <div className="space-y-1 text-xs text-slate-700">
                {resume.skills?.technical && resume.skills.technical.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-900">
                      Technical / Hard Skills:{" "}
                    </span>
                    <span>{resume.skills.technical.join(", ")}</span>
                  </div>
                )}
                {resume.skills?.soft && resume.skills.soft.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-900">
                      Leadership & Interpersonal:{" "}
                    </span>
                    <span>{resume.skills.soft.join(", ")}</span>
                  </div>
                )}
                {resume.skills?.languages && resume.skills.languages.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-900">
                      Languages Spoken:{" "}
                    </span>
                    <span>{resume.skills.languages.join(", ")}</span>
                  </div>
                )}
                {resume.skills?.certifications &&
                  resume.skills.certifications.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-900">
                        Certifications:{" "}
                      </span>
                      <span>{resume.skills.certifications.join(", ")}</span>
                    </div>
                  )}
              </div>
            </section>
          </div>
        </div>
      </FullscreenPortal>
    </div>
  );
}

function generatePlaintextResume(resume: ResumeDocument): string {
  let content = "";
  const name = `${resume.header.first_name || "Student"} ${resume.header.last_name || ""}`;
  content += `${name.toUpperCase()}\n`;
  content += `${resume.header.city_state || ""} | ${resume.header.phone || ""} | ${resume.header.email || ""}\n`;
  if (resume.header.linkedin_url) content += `LinkedIn: ${resume.header.linkedin_url}\n`;
  content += `====================================================\n\n`;

  if (resume.header.summary) {
    content += `SUMMARY\n${resume.header.summary}\n\n`;
  }

  content += `EDUCATION\n`;
  resume.education?.forEach((edu) => {
    content += `${edu.institution} - ${edu.location}\n`;
    content += `${edu.grade_level_or_degree} | Expected: ${edu.graduation_year}\n`;
    if (edu.gpa_unweighted) content += `GPA: ${edu.gpa_unweighted}/4.0 Unweighted | ${edu.gpa_weighted || ""}/5.0+ Weighted\n`;
    if (edu.honors_coursework) content += `Honors Coursework: ${edu.honors_coursework}\n`;
    content += `\n`;
  });

  content += `PROFESSIONAL & LEADERSHIP EXPERIENCE\n`;
  resume.experience?.forEach((exp) => {
    content += `${exp.title} — ${exp.organization} (${exp.start_date} - ${exp.end_date})\n`;
    exp.bullets?.forEach((b) => {
      content += `  * ${b}\n`;
    });
    content += `\n`;
  });

  content += `EXTRACURRICULARS & COMMUNITY SERVICE\n`;
  resume.extracurriculars?.forEach((ext) => {
    content += `${ext.role} — ${ext.activity} (${ext.start_date} - ${ext.end_date})\n`;
    ext.bullets?.forEach((b) => {
      content += `  * ${b}\n`;
    });
    content += `\n`;
  });

  content += `HONORS & AWARDS\n`;
  resume.awards?.forEach((awd) => {
    content += `  * ${awd.title} (${awd.issuer}, ${awd.year}) [${awd.level} Recognition]\n`;
  });
  content += `\n`;

  content += `SKILLS & LANGUAGES\n`;
  content += `Technical: ${(resume.skills?.technical || []).join(", ")}\n`;
  content += `Soft Skills: ${(resume.skills?.soft || []).join(", ")}\n`;
  content += `Languages: ${(resume.skills?.languages || []).join(", ")}\n`;

  return content;
}
