"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Users,
  MessageSquare,
  Clock,
  XCircle,
  Tag,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Check,
} from "lucide-react";
import { formatPhoneUS } from "@/lib/phone";
import {
  type PlatformSettingsAdmin,
  type ReferralAdminItem,
  type ReferralsAdminStats,
  updatePlatformSettings,
} from "./actions";
import Swal from "@/lib/swal";

interface ReferralsClientProps {
  initialData: {
    settings: PlatformSettingsAdmin;
    referrals: ReferralAdminItem[];
    stats: ReferralsAdminStats;
  };
}

// Consistent vibrant avatar background colors for student initials
const AVATAR_COLORS = [
  "bg-violet-600",
  "bg-blue-600",
  "bg-rose-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-indigo-600",
  "bg-cyan-600",
  "bg-purple-600",
  "bg-teal-600",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function ReferralsClient({ initialData }: ReferralsClientProps) {
  const [settings, setSettings] = useState<PlatformSettingsAdmin>(initialData.settings);
  const referralsList = initialData.referrals;
  const stats = initialData.stats;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("All Time");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  // Modal state for managing discount code & AI cap
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCode, setModalCode] = useState(settings.code);
  const [modalCap, setModalCap] = useState(settings.aiMonthlyCap);
  const [savingSettings, setSavingSettings] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateRangeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle active status
  const handleToggleActive = async () => {
    const newEnabled = !settings.enabled;
    setSettings((prev) => ({ ...prev, enabled: newEnabled }));
    try {
      const res = await updatePlatformSettings({ enabled: newEnabled });
      if (!res.success) {
        setSettings((prev) => ({ ...prev, enabled: !newEnabled }));
        Swal.fire({ title: "Error", text: res.error || "Failed to update status", icon: "error" });
      }
    } catch {
      setSettings((prev) => ({ ...prev, enabled: !newEnabled }));
      Swal.fire({ title: "Error", text: "Something went wrong", icon: "error" });
    }
  };

  // Save Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCode.trim()) {
      Swal.fire({ title: "Validation Error", text: "Discount code cannot be empty.", icon: "warning" });
      return;
    }

    setSavingSettings(true);
    try {
      const res = await updatePlatformSettings({
        code: modalCode.trim().toUpperCase(),
        aiMonthlyCap: Number(modalCap),
      });

      if (res.success) {
        setSettings((prev) => ({
          ...prev,
          code: modalCode.trim().toUpperCase(),
          aiMonthlyCap: Number(modalCap),
        }));
        setIsModalOpen(false);
        Swal.fire({
          title: "Settings Saved",
          text: "Discount code and monthly AI cap updated successfully.",
          icon: "success",
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ title: "Error", text: res.error || "Failed to save settings", icon: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      Swal.fire({ title: "Error", text: msg, icon: "error" });
    } finally {
      setSavingSettings(false);
    }
  };

  // Filter referrals by search keyword & date range
  const filteredReferrals = useMemo(() => {
    return referralsList.filter((r) => {
      // 1. Keyword search filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.referring_student_name.toLowerCase().includes(q) ||
        `${r.referral_first_name} ${r.referral_last_name}`.toLowerCase().includes(q) ||
        r.referral_phone.includes(q) ||
        r.referral_email.toLowerCase().includes(q) ||
        r.code_used.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // 2. Date range filter
      if (selectedDateRange === "All Time") return true;

      const createdDate = new Date(r.created_at);
      const now = new Date();

      if (selectedDateRange === "Today") {
        return createdDate.toDateString() === now.toDateString();
      }

      if (selectedDateRange === "Last 7 Days") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return createdDate >= sevenDaysAgo;
      }

      if (selectedDateRange === "Last 30 Days") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return createdDate >= thirtyDaysAgo;
      }

      if (selectedDateRange === "This Month") {
        return (
          createdDate.getMonth() === now.getMonth() &&
          createdDate.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }, [referralsList, searchQuery, selectedDateRange]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredReferrals.length / rowsPerPage) || 1;
  const paginatedReferrals = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredReferrals.slice(start, start + rowsPerPage);
  }, [filteredReferrals, currentPage]);

  const dateRangeOptions = [
    "All Time",
    "Today",
    "Last 7 Days",
    "Last 30 Days",
    "This Month",
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Section: Header & Top Row Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side (Col 1-7): Heading + Metric Cards Strip */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Referrals
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              View and manage referral submissions from Discount Code users.
            </p>
          </div>

          {/* Unified Horizontal Performance Metrics Strip */}
          <div className="bg-white rounded-sm border border-slate-200/80 p-4 sm:p-4 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {/* Total Referrals */}
              <div className="flex items-center gap-3.5 p-2 sm:px-3 first:pl-0">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Total Referrals</div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                    {stats.total}
                  </div>
                </div>
              </div>

              {/* SMS Sent */}
              <div className="flex items-center gap-3.5 p-2 sm:px-3 pt-3 sm:pt-2">
                <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">SMS Sent</div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                    {stats.smsSent}
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div className="flex items-center gap-3.5 p-2 sm:px-3 pt-3 sm:pt-2">
                <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Pending</div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                    {stats.smsPending}
                  </div>
                </div>
              </div>

              {/* Failed */}
              <div className="flex items-center gap-3.5 p-2 sm:px-3 pt-3 sm:pt-2 last:pr-0">
                <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Failed</div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                    {stats.smsFailed}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (Col 8-12): Discount Code Card */}
        <div className="lg:col-span-5 bg-white rounded-sm border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between h-full min-h-[160px]">
          {/* Top Row: Icon + Title + Toggle */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Discount Code</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Enable or disable the discount code system for new sign-ups.
                </p>
              </div>
            </div>

            {/* Status Toggle with "Active / Inactive" label */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleActive}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.enabled ? "bg-emerald-500" : "bg-slate-300"
                }`}
                aria-pressed={settings.enabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-xs font-semibold text-slate-700 select-none">
                {settings.enabled ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          {/* Bottom Row: Active Code + Manage Link */}
          <div className="flex items-center pt-3 border-t border-slate-100 mt-4">
            <div className='flex w-full py-4 px-2 items-center justify-between gap-2 bg-gray-200 rounded-sm p-1'>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Active Code:</span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-sm text-xs font-bold font-mono tracking-wider">
                  {settings.code}
                </span>
              </div>

            <button
              type="button"
              onClick={() => {
                setModalCode(settings.code);
                setModalCap(settings.aiMonthlyCap);
                setIsModalOpen(true);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              Manage Code →
            </button>
            </div>
            
          </div>
        </div>
      </div>

      {/* Main Table Container matching Reference Image 3 */}
      <div className="bg-white rounded-sm border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, phone or email..."
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-sm bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Date Range Dropdown Selector */}
          <div className="relative self-end sm:self-center" ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-sm text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{selectedDateRange === "All Time" ? "Select Date Range" : selectedDateRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isDateRangeOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-sm shadow-xl z-30 py-1 overflow-hidden">
                {dateRangeOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setSelectedDateRange(opt);
                      setIsDateRangeOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                      selectedDateRange === opt
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{opt}</span>
                    {selectedDateRange === opt && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[160px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Referring User</th>
                <th className="py-3.5 px-4">Referral Name</th>
                <th className="py-3.5 px-4">Referral Phone</th>
                <th className="py-3.5 px-4">Referral Email</th>
                <th className="py-3.5 px-4">Code Used</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">SMS Sent</th>
                <th className="py-3.5 px-4">SMS Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedReferrals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600">No referrals found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery || selectedDateRange !== "All Time"
                        ? "Try clearing your search query or date range filter."
                        : "Referrals submitted through the discount code form will appear here."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedReferrals.map((item) => {
                  const studentName = item.referring_student_name || "Student";
                  const studentInitials = studentName
                    .split(" ")
                    .filter(Boolean)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "ST";

                  const avatarBg = getAvatarColor(studentName);
                  const formattedPhone = formatPhoneUS(item.referral_phone) || item.referral_phone;

                  const dateObj = new Date(item.created_at);
                  const dateStr = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const timeStr = dateObj.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });

                  const smsSentAtStr = item.sms_sent_at
                    ? {
                        date: new Date(item.sms_sent_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }),
                        time: new Date(item.sms_sent_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        }),
                      }
                    : null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* 1. Referring Student */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}
                          >
                            {studentInitials}
                          </div>
                          <span className="font-semibold text-slate-800 text-xs">
                            {studentName}
                          </span>
                        </div>
                      </td>

                      {/* 2. Referral Name */}
                      <td className="py-3.5 px-4 font-medium text-slate-800 text-xs whitespace-nowrap">
                        {item.referral_first_name} {item.referral_last_name}
                      </td>

                      {/* 3. Referral Phone */}
                      <td className="py-3.5 px-4 text-slate-700 text-xs whitespace-nowrap font-mono">
                        {formattedPhone}
                      </td>

                      {/* 4. Referral Email */}
                      <td className="py-3.5 px-4 text-slate-600 text-xs whitespace-nowrap">
                        {item.referral_email}
                      </td>

                      {/* 5. Code Used */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200/60 font-mono font-semibold rounded-full text-[11px]">
                          {item.code_used}
                        </span>
                      </td>

                      {/* 6. Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700 text-xs">{dateStr}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{timeStr}</div>
                      </td>

                      {/* 7. SMS Sent (Pill Badge) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.sms_status === "Yes" && (
                          <span className="inline-block px-3 py-0.5 rounded-full font-semibold text-xs bg-emerald-100 text-emerald-700">
                            Yes
                          </span>
                        )}
                        {item.sms_status === "Failed" && (
                          <span className="inline-block px-3 py-0.5 rounded-full font-semibold text-xs bg-rose-100 text-rose-700">
                            Failed
                          </span>
                        )}
                        {(item.sms_status === "Pending" || item.sms_status === "No") && (
                          <span className="inline-block px-3 py-0.5 rounded-full font-semibold text-xs bg-slate-100 text-slate-600">
                            {item.sms_status === "Pending" ? "Pending" : "No"}
                          </span>
                        )}
                      </td>

                      {/* 8. SMS Sent At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {smsSentAtStr ? (
                          <>
                            <div className="font-medium text-slate-700 text-xs">
                              {smsSentAtStr.date}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {smsSentAtStr.time}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400 font-semibold">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer matching Image 3 */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {filteredReferrals.length === 0 ? "0" : `1-${paginatedReferrals.length}`}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">{filteredReferrals.length}</span>{" "}
            referrals
          </div>

          <div className="flex items-center gap-1.5">
            {/* Prev Button */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 rounded-sm border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCurrentPage(num)}
                className={`w-7 h-7 rounded-sm text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                  currentPage === num
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {num}
              </button>
            ))}

            {/* Next Button */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-7 h-7 rounded-sm border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Code & Cap Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" /> Manage Discount Code & AI Cap
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Active Discount Code
                </label>
                <input
                  type="text"
                  value={modalCode}
                  onChange={(e) => setModalCode(e.target.value.toUpperCase())}
                  placeholder="e.g. STARTERFREE"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Students entering this code on the pricing page will claim free Starter plan access.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Monthly AI Requests Cap
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={modalCap}
                  onChange={(e) => setModalCap(Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Shared monthly limit across all AI features (Ask AI, Essay, Resume, Career) for discount code users.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
