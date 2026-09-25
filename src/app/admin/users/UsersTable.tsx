"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Search, Plus, X, Loader2, MessageSquare, ChevronDown, Pencil, Trash, Ban, CheckCircle, Sparkles, Eye, MoreVertical, Mail } from "lucide-react";
import { createUserMember, sendMemberInvite, updateUserBasicInfo, resetUserPassword, toggleUserActive, deleteUserAccount, resetUserAiUsage, bulkDeleteUsers } from "@/app/actions/admin";
import { cancelSubscription } from "@/app/actions/admin-payments";
import { sendAdminSms } from "@/app/actions/sms";
import { formatPhoneUS } from "@/lib/phone";
import { ROLE_LABELS, STAFF_ROLES, type StaffRole } from "@/lib/rbac";
import { UserDetailsModal } from "./UserDetailsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AccordionChevronTrigger,
} from "@/components/ui/accordion";
import { PhoneInput } from "@/components/ui/input";
import Swal from "@/lib/swal";
import { toast } from "sonner";

const PLAN_NAMES: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || ""]: "Starter",
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_SCHOLAR || ""]: "Scholar",
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || ""]: "Elite",
};

function formatCycleMonth(rawCycle?: string) {
  if (!rawCycle || rawCycle === "Current") return "Current Cycle";
  if (/^\d{4}-\d{2}$/.test(rawCycle)) {
    const [y, m] = rawCycle.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  const dateMatches = rawCycle.match(/(\d{4}-\d{2}-\d{2})/g);
  if (dateMatches && dateMatches.length >= 2) {
    const d1 = new Date(dateMatches[0]);
    const d2 = new Date(dateMatches[1]);
    const f1 = d1.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const f2 = d2.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${f1} – ${f2}`;
  } else if (dateMatches && dateMatches.length === 1) {
    const d = new Date(dateMatches[0]);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return rawCycle;
}


function UserActions({
  user,
  roleType = "student",
  onSendInvite,
  onSendSms,
  onManage,
  onViewDetails,
  onDeleteUser,
}: {
  user: any;
  roleType?: "student" | "parent";
  onSendInvite?: (user: any) => void;
  onSendSms: (user: any, recipient: "student" | "parent") => void;
  onManage: (user: any, tab?: "info" | "security" | "subscription" | "ai_usage") => void;
  onViewDetails: (user: any) => void;
  onDeleteUser?: (user: any) => void;
}) {
  const isCreatedByAdmin = Boolean(
    user.created_by_admin ||
    user.user_metadata?.created_by_admin ||
    user.user_metadata?.created_via_admin
  );

  return (
    <div className="flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900 rounded-lg transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-violet-500 shrink-0"
          title="Actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 space-y-0.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(user);
            }}
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-lg cursor-pointer transition-colors"
          >
            <Eye className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>View Details</span>
          </DropdownMenuItem>

          {isCreatedByAdmin && onSendInvite && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onSendInvite(user);
              }}
              className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/80 rounded-lg cursor-pointer transition-colors"
            >
              <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Send Invite</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onManage(user, "info");
            }}
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 rounded-lg cursor-pointer transition-colors"
          >
            <Pencil className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Edit Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onSendSms(user, roleType);
            }}
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:text-violet-600 hover:bg-violet-50/80 rounded-lg cursor-pointer transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-violet-500 shrink-0" />
            <span>Send SMS</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onManage(user, "ai_usage");
            }}
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:text-purple-600 hover:bg-purple-50/80 rounded-lg cursor-pointer transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
            <span>AI Usage & Spend</span>
          </DropdownMenuItem>

          {onDeleteUser && (
            <>
              <div className="h-px bg-slate-100 my-1 -mx-1" />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteUser(user);
                }}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
              >
                <Trash className="w-4 h-4 text-red-500 shrink-0" />
                <span>Delete User</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MemberTypeBadge({ user }: { user: any }) {
  if (user.account_type === "parent") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
        👤 Parent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
      🎓 Student
    </span>
  );
}

function UserRow({
  user,
  onSendInvite,
  onSendSms,
  onManage,
  onViewDetails,
  onDeleteUser,
  isSelected,
  onToggleSelect,
}: {
  user: any;
  onSendInvite?: (user: any) => void;
  onSendSms: (user: any, recipient: "student" | "parent") => void;
  onManage: (user: any, tab?: "info" | "security" | "subscription" | "ai_usage") => void;
  onViewDetails: (user: any) => void;
  onDeleteUser?: (user: any) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const isParent = user.account_type === "parent";

  const displayName = isParent
    ? (user.parent_first_name ? `${user.parent_first_name} ${user.parent_last_name || ""}`.trim() : (user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user.email?.split("@")[0] || "—")))
    : (user.student_first_name ? `${user.student_first_name} ${user.student_last_name || ""}`.trim() : (user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user.email?.split("@")[0] || "—")));

  const displayEmail = isParent
    ? (user.parent_email || user.email || "—")
    : (user.student_email || user.email || "—");

  const displayPhone = isParent
    ? (user.parent_phone || user.phone || "")
    : (user.student_phone || user.phone || "");

  const roleType: "student" | "parent" = isParent ? "parent" : "student";

  const checkboxCol = (
    <div
      className="flex items-center justify-center w-9 shrink-0 border-r border-slate-100 bg-slate-50/40 hover:bg-slate-100/60 transition-colors cursor-pointer"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleSelect?.(user.id); }}
    >
      <input
        type="checkbox"
        checked={!!isSelected}
        onChange={() => { }}
        className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 pointer-events-none"
        aria-label="Select member"
      />
    </div>
  );

  return (
    <div className={`flex items-stretch border rounded-xl bg-white shadow-sm mb-3 overflow-hidden transition-all hover:border-slate-300 ${isSelected ? "border-violet-300 shadow-violet-50" : "border-slate-200"}`}>
      {checkboxCol}
      <div className="flex-1 min-w-0 px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_1fr_1fr_1fr_1fr_60px] md:gap-4 md:items-center w-full text-left">
          {/* Col 1: Full Name */}
          <div className="flex items-center justify-between gap-2 md:block min-w-0">
            <div className="min-w-0 flex-1">
              <p className={`truncate text-xs sm:text-sm ${isParent ? "font-semibold text-slate-800" : "font-bold text-slate-900"}`}>
                {displayName}
              </p>
              <p className="text-slate-500 text-[11px] sm:text-xs truncate md:hidden">
                {displayEmail}
              </p>
            </div>
            {/* Mobile member type badge */}
            <div className="md:hidden shrink-0" onClick={(e) => e.stopPropagation()}>
              <MemberTypeBadge user={user} />
            </div>
          </div>

          {/* Col 2: Email (Desktop) */}
          <div className="hidden md:block min-w-0 text-left">
            <p className="text-slate-600 text-xs sm:text-sm truncate" title={displayEmail}>
              {displayEmail}
            </p>
          </div>

          {/* Col 3: Contact / Phone */}
          <div className="hidden md:block min-w-0 text-center">
            <p className="text-slate-700 text-xs sm:text-sm font-medium truncate whitespace-nowrap">
              {formatPhoneUS(displayPhone) || "—"}
            </p>
          </div>

          {/* Col 4: Member Type */}
          <div className="hidden md:flex md:justify-center min-w-0">
            <MemberTypeBadge user={user} />
          </div>

          {/* Col 5: Date Created */}
          <div className="hidden md:block min-w-0 text-center">
            <p className="text-slate-500 text-xs sm:text-sm font-medium whitespace-nowrap">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric"
                })
                : "—"}
            </p>
          </div>

          {/* Col 6: Actions (3-dot menu only, NO down arrow) */}
          <div className="flex items-center justify-between md:justify-end gap-1.5 pt-2 md:pt-0 border-t border-slate-100/80 md:border-0 w-full md:w-auto shrink-0 min-w-0">
            <div className="text-[11px] text-slate-400 font-medium md:hidden whitespace-nowrap">
              {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
            </div>
            <div className="flex items-center justify-end shrink-0">
              <UserActions
                user={user}
                roleType={roleType}
                onSendInvite={onSendInvite}
                onSendSms={onSendSms}
                onManage={onManage}
                onViewDetails={onViewDetails}
                onDeleteUser={onDeleteUser}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UsersTable({ initialUsers }: { initialUsers: any[] }) {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "student" | "parent">("all");
  const [isPending, startTransition] = useTransition();

  // ── Bulk selection ──────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Create Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState<"student" | "parent">("student");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");


  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [manageUser, setManageUser] = useState<any>(null);
  const [manageFormData, setManageFormData] = useState<any>({});
  const [manageTab, setManageTab] = useState<"info" | "security" | "subscription" | "ai_usage">("info");

  // User Details Modal state
  const [detailsUser, setDetailsUser] = useState<any>(null);

  // SMS Modal state
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsUser, setSmsUser] = useState<any>(null);
  const [smsRecipient, setSmsRecipient] = useState<"student" | "parent">("student");
  const [smsMessage, setSmsMessage] = useState("Hi, welcome to Schoolari! Your onboarding is complete.");
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsStatus, setSmsStatus] = useState({ type: "", msg: "" });

  // Global Escape key listener for all open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isOpen) setIsOpen(false);
        if (smsModalOpen) setSmsModalOpen(false);
        if (manageModalOpen) setManageModalOpen(false);
        if (detailsUser) setDetailsUser(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, smsModalOpen, manageModalOpen, detailsUser]);

  const triggerManage = (user: any, initialTab: "info" | "security" | "subscription" | "ai_usage" = "info") => {
    setManageUser(user);
    const isParent = user.account_type === "parent";

    const studentFirstName = isParent
      ? (user.student_first_name || user.linked_student?.student_first_name || user.linked_student?.first_name || "")
      : (user.student_first_name || user.first_name || "");

    const studentLastName = isParent
      ? (user.student_last_name || user.linked_student?.student_last_name || "")
      : (user.student_last_name || "");

    const studentEmail = isParent
      ? (user.student_email || user.linked_student?.student_email || user.linked_student?.email || "")
      : (user.student_email || user.email || "");

    const studentPhone = isParent
      ? (user.student_phone || user.linked_student?.student_phone || user.linked_student?.phone || "")
      : (user.student_phone || user.phone || "");

    const parentFirstName = isParent
      ? (user.parent_first_name || user.first_name || "")
      : (user.parent_first_name || "");

    const parentLastName = isParent
      ? (user.parent_last_name || "")
      : (user.parent_last_name || "");

    const parentEmail = isParent
      ? (user.parent_email || user.email || "")
      : (user.parent_email || "");

    const parentPhone = isParent
      ? (user.parent_phone || user.phone || "")
      : (user.parent_phone || "");

    setManageFormData({
      first_name: user.first_name || "",
      phone: user.phone || "",
      student_first_name: studentFirstName,
      student_last_name: studentLastName,
      student_email: studentEmail,
      student_phone: studentPhone,
      parent_first_name: parentFirstName,
      parent_last_name: parentLastName,
      parent_email: parentEmail,
      parent_phone: parentPhone,
    });
    setManageTab(initialTab);
    setManageModalOpen(true);
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageUser) return;
    setIsSubmitting(true);
    try {
      const isParent = manageUser.account_type === "parent";
      const payload = {
        ...manageFormData,
        first_name: isParent
          ? (manageFormData.parent_first_name || manageFormData.first_name)
          : (manageFormData.student_first_name || manageFormData.first_name),
        phone: isParent
          ? (manageFormData.parent_phone || manageFormData.phone)
          : (manageFormData.student_phone || manageFormData.phone),
      };
      await updateUserBasicInfo(manageUser.id, payload);
      toast.success("User info updated!");
      setManageModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update info");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!manageUser || !confirm("Are you sure you want to reset this user's password?")) return;
    setIsSubmitting(true);
    try {
      const res = await resetUserPassword(manageUser.id);
      toast.success(`Password reset to: ${res.password}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!manageUser) return;
    const newStatus = manageUser.is_active === false ? true : false;
    setIsSubmitting(true);
    try {
      await toggleUserActive(manageUser.id, newStatus);
      toast.success(newStatus ? "Account enabled" : "Account disabled");
      setManageModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userToDelete?: any) => {
    const target = userToDelete && userToDelete.id ? userToDelete : manageUser;
    if (!target) return;

    const userName = target.student_first_name
      ? `${target.student_first_name} ${target.student_last_name || ""}`.trim()
      : target.first_name || target.email || "this user";

    const confirmResult = await Swal.fire({
      title: `Delete ${userName}?`,
      text: `Are you sure you want to permanently delete ${target.email || userName} and all associated data? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete Account",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#94a3b8",
    });

    if (!confirmResult.isConfirmed) return;

    setIsSubmitting(true);
    try {
      await deleteUserAccount(target.id);
      toast.success("User deleted completely");
      if (manageModalOpen && manageUser?.id === target.id) {
        setManageModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSub = async () => {
    if (!manageUser || !manageUser.stripe_subscription_id) return;
    if (!confirm("Cancel this subscription immediately?")) return;
    setIsSubmitting(true);
    try {
      // Use _subscription_owner_id when a parent holds the subscription;
      // otherwise fall back to the user's own id.
      const ownerId = manageUser._subscription_owner_id || manageUser.id;
      await cancelSubscription(manageUser.stripe_subscription_id, ownerId);
      toast.success("Subscription cancelled");
      setManageModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAiUsage = async () => {
    if (!manageUser) return;
    const confirm = await Swal.fire({
      title: "Reset Monthly AI Usage?",
      text: `Reset all document counters, questions asked, and dollar spend back to $0 for ${manageUser.student_first_name || manageUser.first_name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Reset AI Usage",
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#94a3b8"
    });
    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);
    try {
      await resetUserAiUsage(manageUser.id);
      toast.success("AI usage reset successfully");
      if (manageUser.usage) {
        manageUser.usage.ask_ai_count = 0;
        manageUser.usage.essay_docs_count = 0;
        manageUser.usage.essay_count = 0;
        manageUser.usage.resume_docs_count = 0;
        manageUser.usage.resume_count = 0;
        manageUser.usage.estimated_cost_usd = 0;
        manageUser.usage.last_limit_reason = "None";
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset AI usage");
    } finally {
      setIsSubmitting(false);
    }
  };


  const filteredUsers = initialUsers.filter((u) => {
    // Only students and parents should appear on the Users / Members page.
    // Exclude staff, admin, and super admin accounts (managed under Staff Management).
    const isStaffOrAdmin =
      u.role === "admin" ||
      u.role === "super_admin" ||
      (u.role && u.role !== "user") ||
      u.account_type === "staff" ||
      u.account_type === "admin";

    if (isStaffOrAdmin) return false;

    let matchesRole = true;
    if (filterRole === "student") {
      matchesRole = u.account_type !== "parent";
    } else if (filterRole === "parent") {
      matchesRole = u.account_type === "parent";
    }
    if (!matchesRole) return false;

    return (
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.toLowerCase().includes(search.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.student_first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.student_last_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.student_email?.toLowerCase().includes(search.toLowerCase()) ||
      u.student_phone?.toLowerCase().includes(search.toLowerCase()) ||
      u.parent_first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.parent_last_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.parent_email?.toLowerCase().includes(search.toLowerCase()) ||
      u.parent_phone?.toLowerCase().includes(search.toLowerCase())
    );
  });


  const handleSendInvite = async (user: any) => {
    const userName = user.student_first_name
      ? `${user.student_first_name} ${user.student_last_name || ""}`.trim()
      : user.parent_first_name
        ? `${user.parent_first_name} ${user.parent_last_name || ""}`.trim()
        : user.first_name || user.email || "this member";

    const targetEmail = user.student_email || user.parent_email || user.email;

    const confirmResult = await Swal.fire({
      title: `Send Invite Email?`,
      text: `Send a setup link to ${targetEmail} for ${userName} to set their password and complete registration?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Send Invite",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#94a3b8",
    });

    if (!confirmResult.isConfirmed) return;

    const toastId = toast.loading(`Sending invite to ${targetEmail}...`);
    try {
      const res = await sendMemberInvite(user.id);
      if (!res.success) {
        toast.error(res.error || "Failed to send invite email", { id: toastId });
      } else {
        toast.success(res.message || `Invite email sent to ${targetEmail}!`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred", { id: toastId });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setIsSubmitting(true);
    try {
      const res: any = await createUserMember(email, firstName, phone, accountType, lastName);
      if (res && res.error) {
        setCreateError(res.error);
        return;
      }
      toast.success("Member created successfully! You can now send an invite link whenever you are ready.");
      setIsOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setAccountType("student");
    } catch (err: any) {
      setCreateError(err.message || "Failed to create member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerSendSms = (user: any, recipient: "student" | "parent") => {
    setSmsUser(user);
    setSmsRecipient(recipient);
    setSmsMessage("Hi, welcome to Schoolari! Your onboarding is complete.");
    setSmsStatus({ type: "", msg: "" });
    setSmsModalOpen(true);
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsUser) return;
    setSmsLoading(true);
    setSmsStatus({ type: "", msg: "" });
    try {
      const p = smsRecipient === "student" ? smsUser.student_phone || smsUser.phone : smsUser.parent_phone;
      if (!p) {
        throw new Error(`No phone number available for ${smsRecipient}.`);
      }
      const res = await sendAdminSms(p, smsMessage);
      if (res.error) throw new Error(res.error);
      setSmsStatus({ type: "success", msg: "Message sent successfully!" });
      setTimeout(() => setSmsModalOpen(false), 2000);
    } catch (err: any) {
      setSmsStatus({ type: "error", msg: err.message || "Failed to send SMS." });
    } finally {
      setSmsLoading(false);
    }
  };

  // ── Bulk helpers (depend on filteredUsers) ─────────────────
  const eligibleUsers = filteredUsers;
  const allSelected = eligibleUsers.length > 0 && eligibleUsers.every((u: any) => selectedIds.has(u.id));
  const someSelected = eligibleUsers.some((u: any) => selectedIds.has(u.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligibleUsers.map((u: any) => u.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    // Identify selected users and check for privileged accounts (Admin, Super Admin, Staff)
    const selectedUsers = initialUsers.filter((u: any) => selectedIds.has(u.id));
    const privilegedUsers = selectedUsers.filter((u: any) => {
      return (
        u.role === "admin" ||
        u.role === "super_admin" ||
        u.account_type === "admin" ||
        u.account_type === "staff" ||
        (u.role && u.role !== "user")
      );
    });

    let html = `
      <p style="font-size:14px;color:#64748b;line-height:1.5;">
        This will permanently delete the selected accounts and any linked parent/student accounts.<br/><br/>
        <strong style="color:#dc2626;">This cannot be undone.</strong>
      </p>
    `;

    if (privilegedUsers.length > 0) {
      const superAdminCount = privilegedUsers.filter((u: any) => u.role === "super_admin").length;
      const adminCount = privilegedUsers.filter((u: any) => u.role === "admin" || u.account_type === "admin").length;
      const staffCount = privilegedUsers.filter((u: any) => u.role !== "admin" && u.role !== "super_admin").length;

      const types: string[] = [];
      if (superAdminCount > 0) types.push(`<strong>${superAdminCount > 1 ? `${superAdminCount} ` : ""}Super Admin${superAdminCount > 1 ? "s" : ""}</strong>`);
      if (adminCount > 0) types.push(`<strong>${adminCount > 1 ? `${adminCount} ` : ""}Admin${adminCount > 1 ? "s" : ""}</strong>`);
      if (staffCount > 0) types.push(`<strong>${staffCount > 1 ? `${staffCount} ` : ""}Staff</strong>`);

      const typesStr = types.join(", ");

      html = `
        <p style="font-size:14px;color:#64748b;line-height:1.5;">
          ⚠️ <strong>Notice:</strong> This selection includes <span style="color:#b91c1c;">${typesStr}</span>.<br/><br/>
          This will permanently delete all <strong>${selectedIds.size}</strong> selected accounts and remove any administrative access.<br/><br/>
          <strong style="color:#dc2626;">This cannot be undone.</strong>
        </p>
      `;
    }

    const confirmed = await Swal.fire({
      title: `Delete ${selectedIds.size} member${selectedIds.size > 1 ? "s" : ""}?`,
      html,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, Delete ${selectedIds.size} Account${selectedIds.size > 1 ? "s" : ""}`,
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#94a3b8",
    });

    if (!confirmed.isConfirmed) return;
    setIsBulkDeleting(true);
    try {
      const res = await bulkDeleteUsers([...selectedIds]);
      if (res.failed.length > 0) {
        toast.warning(`${res.deleted} deleted, ${res.failed.length} failed. Refresh to see current state.`);
      } else {
        toast.success(`${res.deleted} member${res.deleted > 1 ? "s" : ""} deleted successfully.`);
      }
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message || "Bulk delete failed");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-4 w-full">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilterRole("all")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterRole === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterRole("student")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterRole === "student" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Students
          </button>
          <button
            onClick={() => setFilterRole("parent")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterRole === "parent" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Parents
          </button>
        </div>
        <div className="relative w-full max-w-sm ml-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
          />
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Select All bar — only when there are eligible (student/parent) users */}
      {eligibleUsers.length > 0 && (
        <div className="flex items-center gap-3 px-2 py-1">
          <input
            type="checkbox"
            id="select-all-members"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
          />
          <label htmlFor="select-all-members" className="text-xs font-medium text-slate-500 cursor-pointer select-none">
            {allSelected ? "Deselect all" : `Select all ${eligibleUsers.length} member${eligibleUsers.length > 1 ? "s" : ""}`}
          </label>
          {selectedIds.size > 0 && (
            <span className="text-xs font-semibold text-violet-600 ml-1">
              · {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Table Header */}
      <div className="hidden md:flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider px-0 py-2 border-x border-transparent">
        {/* Checkbox column spacer (matches row's w-9 shrink-0 border-r) */}
        <div className="w-9 shrink-0 border-r border-transparent" />

        {/* Content wrapper with px-4 sm:px-6 (matches row padding) */}
        <div className="flex-1 min-w-0 px-4 sm:px-6">
          <div className="w-full grid grid-cols-[1fr_1fr_1fr_1fr_1fr_60px] gap-4 items-center">
            <div className="min-w-0 text-left">{filterRole === "parent" ? "Parents" : filterRole === "student" ? "Students" : "Full Name"}</div>
            <div className="min-w-0 text-center">Email</div>
            <div className="min-w-0 text-center">Contact</div>
            <div className="min-w-0 text-center">Member Type</div>
            <div className="min-w-0 text-center">Date Created</div>
            <div className="min-w-0 text-right pr-1">Actions</div>
          </div>
        </div>
      </div>

      <div className="w-full">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-sm">
            No users found.
          </div>
        ) : (
          filteredUsers.map((user: any) => (
            <UserRow
              key={user.id}
              user={user}
              onSendInvite={handleSendInvite}
              onSendSms={triggerSendSms}
              onManage={triggerManage}
              onViewDetails={(u: any) => setDetailsUser(u)}
              onDeleteUser={handleDeleteUser}
              isSelected={selectedIds.has(user.id)}
              onToggleSelect={toggleSelect}
            />
          ))
        )}
      </div>

      {/* Add Member Modal */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200 overflow-hidden my-auto"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add New Member</h2>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-3">
              {createError && (
                <div className="p-3 text-xs text-red-600 bg-red-50 rounded-xl border border-red-100">
                  {createError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                  <input
                    type="text"
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Member Type</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as "student" | "parent")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white cursor-pointer"
                >
                  <option value="student">🎓 Student</option>
                  <option value="parent">👤 Parent</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                💡 <span className="font-semibold text-slate-700">Invite Workflow:</span> Creating this member saves their profile. You can send them a password setup email at any time using the <span className="font-semibold text-slate-700">Send Invite</span> option in the Actions menu.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {smsModalOpen && (
        <div
          onClick={() => setSmsModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200 overflow-hidden my-auto"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-violet-600" /> Send SMS
              </h2>
              <button onClick={() => setSmsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSendSms} className="p-6 space-y-4">
              {smsStatus.msg && (
                <div className={`p-3 text-sm rounded-xl border ${smsStatus.type === "error" ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  }`}>
                  {smsStatus.msg}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recipient</label>
                <div className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 font-medium">
                  {smsRecipient === "student" ? "Student" : "Parent"} - {smsUser?.student_first_name || smsUser?.first_name}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message</label>
                <textarea
                  required
                  rows={4}
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSmsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={smsLoading}
                  className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  {smsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Manage User Modal */}
      {manageModalOpen && manageUser && (
        <div
          onClick={() => setManageModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-2.5 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] my-auto"
          >
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> Manage User
              </h2>
              <button onClick={() => setManageModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex border-b border-slate-100 px-3 sm:px-6 shrink-0 bg-slate-50/50 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button onClick={() => setManageTab("info")} className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap shrink-0 transition-colors ${manageTab === "info" ? "border-violet-600 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>Basic Info</button>
              {!(manageUser.role === "admin" || manageUser.role === "super_admin" || (manageUser.role && manageUser.role !== "user") || manageUser.account_type === "staff" || manageUser.account_type === "admin") && (
                <button onClick={() => setManageTab("subscription")} className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap shrink-0 transition-colors ${manageTab === "subscription" ? "border-violet-600 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>Subscription</button>
              )}
              <button onClick={() => setManageTab("ai_usage")} className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${manageTab === "ai_usage" ? "border-violet-600 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                <Sparkles className="w-3.5 h-3.5" /> AI Usage & Spend
              </button>
              <button onClick={() => setManageTab("security")} className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap shrink-0 transition-colors ${manageTab === "security" ? "border-violet-600 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>Security</button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {manageTab === "info" && (
                <form onSubmit={handleUpdateInfo} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {manageUser.role === "admin" || manageUser.role === "super_admin" || (manageUser.role && manageUser.role !== "user") || manageUser.account_type === "staff" || manageUser.account_type === "admin" ? "First Name" : "Student First Name"}
                      </label>
                      <input value={manageFormData.student_first_name} onChange={(e) => setManageFormData({ ...manageFormData, student_first_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {manageUser.role === "admin" || manageUser.role === "super_admin" || (manageUser.role && manageUser.role !== "user") || manageUser.account_type === "staff" || manageUser.account_type === "admin" ? "Last Name" : "Student Last Name"}
                      </label>
                      <input value={manageFormData.student_last_name} onChange={(e) => setManageFormData({ ...manageFormData, student_last_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {manageUser.role === "admin" || manageUser.role === "super_admin" || (manageUser.role && manageUser.role !== "user") || manageUser.account_type === "staff" || manageUser.account_type === "admin" ? "Email" : "Student Email"}
                      </label>
                      <input value={manageFormData.student_email} onChange={(e) => setManageFormData({ ...manageFormData, student_email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {manageUser.role === "admin" || manageUser.role === "super_admin" || (manageUser.role && manageUser.role !== "user") || manageUser.account_type === "staff" || manageUser.account_type === "admin" ? "Phone" : "Student Phone"}
                      </label>
                      <input value={manageFormData.student_phone} onChange={(e) => setManageFormData({ ...manageFormData, student_phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                  {!(manageUser.role === "admin" || manageUser.role === "super_admin" || (manageUser.role && manageUser.role !== "user") || manageUser.account_type === "staff" || manageUser.account_type === "admin") && (
                    <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent First Name</label>
                        <input value={manageFormData.parent_first_name} onChange={(e) => setManageFormData({ ...manageFormData, parent_first_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Last Name</label>
                        <input value={manageFormData.parent_last_name} onChange={(e) => setManageFormData({ ...manageFormData, parent_last_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Email</label>
                        <input value={manageFormData.parent_email} onChange={(e) => setManageFormData({ ...manageFormData, parent_email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Phone</label>
                        <input value={manageFormData.parent_phone} onChange={(e) => setManageFormData({ ...manageFormData, parent_phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end pt-4">
                    <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors">
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}

              {manageTab === "subscription" && (
                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-sm text-slate-500">Subscription Status</p>
                    <p className="text-lg font-bold text-slate-900 capitalize">
                      {manageUser.subscription_status || "No active subscription"}
                      {manageUser.stripe_price_id && manageUser.subscription_status === 'active' && (
                        <span className="text-slate-500 font-normal ml-2">
                          ({PLAN_NAMES[manageUser.stripe_price_id] || "Unknown Plan"})
                        </span>
                      )}
                    </p>
                  </div>
                  {manageUser.subscription_status === "active" && (
                    <div className="p-4 border border-red-100 bg-red-50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div>
                        <p className="font-bold text-red-900">Cancel Subscription</p>
                        <p className="text-sm text-red-700">Immediately cancel their active plan.</p>
                      </div>
                      <button onClick={handleCancelSub} disabled={isSubmitting} className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold">
                        Cancel Plan
                      </button>
                    </div>
                  )}
                </div>
              )}

              {manageTab === "ai_usage" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Ask AI Questions</p>
                      <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                        {manageUser.usage?.ask_ai_count || 0}
                      </p>
                    </div>
                    <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Essay Docs</p>
                      <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                        {manageUser.usage?.essay_docs_count ?? manageUser.usage?.essay_count ?? 0}
                      </p>
                    </div>
                    <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Resume Docs</p>
                      <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                        {manageUser.usage?.resume_docs_count ?? manageUser.usage?.resume_count ?? 0}
                      </p>
                    </div>
                    <div className="p-3 sm:p-3.5 bg-violet-50 rounded-xl border border-violet-100">
                      <p className="text-[11px] sm:text-xs font-bold text-violet-600 uppercase tracking-wider">Est. Monthly Spend</p>
                      <p className="text-lg sm:text-xl font-extrabold text-violet-900 mt-1">
                        ${Number(manageUser.usage?.estimated_cost_usd || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-slate-500 font-medium">Tracking Cycle</span>
                      <span className="font-bold text-slate-800">{formatCycleMonth(manageUser.usage?.current_month)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-slate-500 font-medium">Limit / Cap Status</span>
                      <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${manageUser.usage?.last_limit_reason && manageUser.usage?.last_limit_reason !== "None"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                        }`}>
                        {manageUser.usage?.last_limit_reason || "Active (Under Limits)"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 border border-violet-100 bg-violet-50/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">Reset Member AI Quota</p>
                      <p className="text-xs text-slate-500 mt-0.5">Clears document counters, questions asked, and dollar spend back to 0.</p>
                    </div>
                    <button
                      onClick={handleResetAiUsage}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap"
                    >
                      Reset AI Usage
                    </button>
                  </div>
                </div>
              )}

              {manageTab === "security" && (
                <div className="space-y-4">
                  <div className="p-3.5 sm:p-4 border border-amber-100 bg-amber-50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div>
                      <p className="font-bold text-amber-900 text-sm sm:text-base">Reset Password</p>
                      <p className="text-xs sm:text-sm text-amber-700">Set password back to default (User@12345).</p>
                    </div>
                    <button onClick={handleResetPassword} disabled={isSubmitting} className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold whitespace-nowrap">
                      Reset Password
                    </button>
                  </div>

                  <div className="p-3.5 sm:p-4 border border-orange-100 bg-orange-50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div>
                      <p className="font-bold text-orange-900 text-sm sm:text-base">{manageUser.is_active === false ? "Enable" : "Disable"} Account</p>
                      <p className="text-xs sm:text-sm text-orange-700">{manageUser.is_active === false ? "Restore user access." : "Block user from logging in."}</p>
                    </div>
                    <button onClick={handleToggleActive} disabled={isSubmitting} className="w-full sm:w-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold whitespace-nowrap">
                      {manageUser.is_active === false ? "Enable Account" : "Disable Account"}
                    </button>
                  </div>

                  <div className="p-3.5 sm:p-4 border border-red-100 bg-red-50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mt-6 sm:mt-8">
                    <div>
                      <p className="font-bold text-red-900 text-sm sm:text-base">Delete Account</p>
                      <p className="text-xs sm:text-sm text-red-700">Permanently delete user and all their data.</p>
                    </div>
                    <button onClick={handleDeleteUser} disabled={isSubmitting} className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap">
                      <Trash className="w-4 h-4" /> Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── User Details Modal ────────────────────────────── */}
      <UserDetailsModal
        user={detailsUser}
        isOpen={Boolean(detailsUser)}
        onClose={() => setDetailsUser(null)}
        onManage={triggerManage}
        onSendSms={triggerSendSms}
      />

      {/* ── Bulk Delete Floating Action Bar ─────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/60">
            <span className="text-sm font-semibold whitespace-nowrap">
              {selectedIds.size} member{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="w-px h-5 bg-slate-700" />
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
            >
              {isBulkDeleting
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...</>
                : <><Trash className="w-3.5 h-3.5" /> Delete Selected</>}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              disabled={isBulkDeleting}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
