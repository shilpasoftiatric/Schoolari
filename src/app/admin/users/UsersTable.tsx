"use client";

import React, { useState, useTransition } from "react";
import { Search, Plus, X, Loader2, MessageSquare, ChevronDown, Pencil, Trash, Ban, CheckCircle, Sparkles } from "lucide-react";
import { updateUserRole, createUserMember, updateUserBasicInfo, resetUserPassword, toggleUserActive, deleteUserAccount, resetUserAiUsage } from "@/app/actions/admin";
import { cancelSubscription } from "@/app/actions/admin-payments";
import { sendAdminSms } from "@/app/actions/sms";
import { formatPhoneUS } from "@/lib/phone";
import { ROLE_LABELS, STAFF_ROLES, type StaffRole } from "@/lib/rbac";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
  onSendSms,
  onManage,
}: {
  onSendSms: () => void;
  onManage?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0" onClick={(e) => e.stopPropagation()}>
      {onManage && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onManage(); }}
          className="p-1.5 sm:p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Manage User"
        >
          <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onSendSms(); }}
        className="p-1.5 sm:p-2 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors cursor-pointer shrink-0"
        title="Send SMS"
      >
        <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>
    </div>
  );
}

function StudentSection({
  user,
  actions,
  handleRoleChange,
  isPending
}: {
  user: any;
  actions: React.ReactNode;
  handleRoleChange?: (id: string, role: any) => void;
  isPending?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 md:grid md:grid-cols-[1.6fr_1.1fr_1.3fr_1.1fr_auto] md:gap-4 md:items-center w-full text-left pr-2 md:pr-4">
      {/* Top row on mobile / Col 1 on desktop: Student name & email */}
      <div className="flex items-center justify-between gap-2 md:block min-w-0">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 truncate text-xs sm:text-sm">{user.student_first_name ? `${user.student_first_name} ${user.student_last_name}` : (user.first_name || "—")}</p>
          <p className="text-slate-500 text-[11px] sm:text-xs truncate">{user.student_email || user.email}</p>
        </div>
        {/* Mobile role selector / badge */}
        <div className="md:hidden shrink-0" onClick={(e) => e.stopPropagation()}>
          {handleRoleChange ? (
            <select
              value={user.role}
              onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
              disabled={isPending}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg focus:ring-violet-500 focus:border-violet-500 block py-1 px-2 max-w-[130px] truncate cursor-pointer shadow-2xs"
            >
              <option value="user">Member</option>
              <optgroup label="── Staff Roles ──">
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </optgroup>
            </select>
          ) : (
            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md border ${user.role === 'admin'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : user.role !== 'user'
                ? 'bg-violet-50 text-violet-700 border-violet-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
              {user.role === 'admin' ? 'Admin' : user.role !== 'user' ? ROLE_LABELS[user.role as StaffRole] || user.role : 'Member'}
            </span>
          )}
        </div>
      </div>

      {/* Col 2: Phone */}
      <div className="hidden md:block min-w-0">
        <p className="text-slate-700 text-xs sm:text-sm font-medium truncate whitespace-nowrap">{formatPhoneUS(user.student_phone) || "—"}</p>
      </div>

      {/* Col 3: Role (Desktop Role Selector) */}
      <div className="hidden md:block min-w-0" onClick={(e) => e.stopPropagation()}>
        {handleRoleChange ? (
          <select
            value={user.role}
            onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
            disabled={isPending}
            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-violet-500 focus:border-violet-500 block py-1.5 px-2 w-full max-w-[145px] truncate cursor-pointer shadow-2xs font-medium"
          >
            <option value="user">Member (Student/Parent)</option>
            <optgroup label="── Staff Roles ──">
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </optgroup>
          </select>
        ) : (
          <span className={`px-2.5 py-1 text-xs font-bold rounded-md border whitespace-nowrap inline-block ${user.role === 'admin'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : user.role !== 'user'
              ? 'bg-violet-50 text-violet-700 border-violet-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
            {user.role === 'admin' ? 'Admin' : user.role !== 'user' ? ROLE_LABELS[user.role as StaffRole] || user.role : 'Member'}
          </span>
        )}
      </div>

      {/* Col 4: Date */}
      <div className="hidden md:block min-w-0">
        <p className="text-slate-500 text-xs sm:text-sm font-medium whitespace-nowrap">
          {new Date(user.created_at).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric"
          })}
        </p>
      </div>

      {/* Col 5: Actions */}
      <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t border-slate-100/80 md:border-0 w-full md:w-auto shrink-0">
        <div className="text-[11px] text-slate-400 font-medium md:hidden whitespace-nowrap">
          {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
        <div className="flex justify-end shrink-0">{actions}</div>
      </div>
    </div>
  );
}

function ParentSection({ user, actions, isPrimary = false }: { user: any, actions: React.ReactNode, isPrimary?: boolean }) {
  const hasParent = user.parent_first_name || user.parent_email;

  if (!hasParent) {
    return (
      <div className={`p-4 sm:p-6 bg-slate-50 text-center text-slate-500 text-sm ${!isPrimary ? "border-t border-slate-100" : ""}`}>
        No linked parent found.
      </div>
    );
  }

  return (
    <div className={!isPrimary ? "p-4 sm:p-6 bg-slate-50/80 border-t border-slate-100" : ""}>
      {!isPrimary && <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Linked Parent</h4>}
      <div className={`flex flex-col gap-3 md:grid md:grid-cols-[1.6fr_1.1fr_1.3fr_1.1fr_auto] md:gap-4 md:items-center w-full text-left ${isPrimary ? "pr-2 md:pr-4" : ""}`}>
        {/* Top row on mobile / Col 1 on desktop: Parent name & email */}
        <div className="flex items-center justify-between gap-2 md:block min-w-0">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800 truncate text-xs sm:text-sm">{user.parent_first_name ? `${user.parent_first_name} ${user.parent_last_name}` : "—"}</p>
            <p className="text-slate-500 text-[11px] sm:text-xs truncate">{user.parent_email || "—"}</p>
          </div>
          {/* Mobile role badge */}
          <div className="md:hidden shrink-0">
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-md border bg-slate-100 text-slate-600 border-slate-200">
              Parent
            </span>
          </div>
        </div>

        {/* Col 2: Phone */}
        <div className="hidden md:block min-w-0">
          <p className="text-slate-700 text-xs sm:text-sm font-medium truncate whitespace-nowrap">{formatPhoneUS(user.parent_phone) || "—"}</p>
        </div>

        {/* Col 3: Role (Desktop) */}
        <div className="hidden md:block min-w-0">
          <span className="px-2.5 py-1 text-xs font-bold rounded-md border bg-slate-100 text-slate-600 border-slate-200 whitespace-nowrap inline-block">
            Parent
          </span>
        </div>

        {/* Col 4: Date */}
        <div className="hidden md:block min-w-0">
          <p className="text-slate-500 text-xs sm:text-sm font-medium whitespace-nowrap">
            {new Date(user.created_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric"
            })}
          </p>
        </div>

        {/* Col 5: Actions */}
        <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t border-slate-100/80 md:border-0 w-full md:w-auto shrink-0">
          <div className="text-[11px] text-slate-400 font-medium md:hidden whitespace-nowrap">
            {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
          <div className="flex justify-end shrink-0">{actions}</div>
        </div>
      </div>
    </div>
  );
}

function UserAccordionItem({ user, isPending, handleRoleChange, onSendSms, onManage, filterRole }: any) {
  if (filterRole === "student" || filterRole === "parent") {
    // Return a flat row without accordion wrapper
    return (
      <div className="border border-slate-200 rounded-xl bg-white shadow-sm mb-3 overflow-hidden p-4 sm:p-6 transition-all hover:border-slate-300">
        {filterRole === "student" ? (
          <StudentSection
            user={user}
            handleRoleChange={handleRoleChange}
            isPending={isPending}
            actions={
              <UserActions
                onSendSms={() => onSendSms(user, "student")}
                onManage={() => onManage(user)}
              />
            }
          />
        ) : (
          <ParentSection
            user={user}
            isPrimary={true}
            actions={
              <UserActions
                onSendSms={() => onSendSms(user, "parent")}
                onManage={() => onManage(user)}
              />
            }
          />
        )}
      </div>
    );
  }

  return (
    <AccordionItem value={user.id} className="border border-slate-200 rounded-xl bg-white shadow-sm mb-3 overflow-hidden data-[state=open]:border-violet-200 data-[state=open]:shadow-md transition-all">
      <AccordionTrigger className="px-4 sm:px-6 py-4 hover:no-underline hover:bg-slate-50/50 transition-colors [&[data-state=open]]:bg-slate-50/50">
        <StudentSection
          user={user}
          handleRoleChange={handleRoleChange}
          isPending={isPending}
          actions={
            <UserActions
              onSendSms={() => onSendSms(user, "student")}
              onManage={() => onManage(user)}
            />
          }
        />
      </AccordionTrigger>
      <AccordionContent className="pb-0">
        <ParentSection
          user={user}
          actions={
            <UserActions
              onSendSms={() => onSendSms(user, "parent")}
            />
          }
        />
      </AccordionContent>
    </AccordionItem>
  );
}

export function UsersTable({ initialUsers }: { initialUsers: any[] }) {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "student" | "parent">("all");
  const [isPending, startTransition] = useTransition();

  // Create Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");


  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [manageUser, setManageUser] = useState<any>(null);
  const [manageFormData, setManageFormData] = useState<any>({});
  const [manageTab, setManageTab] = useState<"info" | "security" | "subscription" | "ai_usage">("info");

  const triggerManage = (user: any) => {
    setManageUser(user);
    setManageFormData({
      first_name: user.first_name || "",
      phone: user.phone || "",
      student_first_name: user.student_first_name || user.first_name || "",
      student_last_name: user.student_last_name || "",
      student_email: user.student_email || user.email || "",
      student_phone: user.student_phone || user.phone || "",
      parent_first_name: user.parent_first_name || "",
      parent_last_name: user.parent_last_name || "",
      parent_email: user.parent_email || "",
      parent_phone: user.parent_phone || "",
    });
    setManageTab("info");
    setManageModalOpen(true);
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageUser) return;
    setIsSubmitting(true);
    try {
      // Sync first_name and phone with student_first_name and student_phone if they are empty
      const payload = {
        ...manageFormData,
        first_name: manageFormData.student_first_name || manageFormData.first_name,
        phone: manageFormData.student_phone || manageFormData.phone,
      };
      await updateUserBasicInfo(manageUser.id, payload);
      toast.success("User info updated!");
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

  const handleDeleteUser = async () => {
    if (!manageUser) return;
    const confirmation = prompt(`Type "DELETE" to permanently delete ${manageUser.email}`);
    if (confirmation !== "DELETE") {
      toast.error("Deletion cancelled");
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteUserAccount(manageUser.id);
      toast.success("User deleted completely");
      setManageModalOpen(false);
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

  // SMS Modal state
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsUser, setSmsUser] = useState<any>(null);
  const [smsRecipient, setSmsRecipient] = useState<"student" | "parent">("student");
  const [smsMessage, setSmsMessage] = useState("Hi, welcome to Schoolari! Your onboarding is complete.");
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsStatus, setSmsStatus] = useState({ type: "", msg: "" });

  const filteredUsers = initialUsers.filter((u) => {
    // Never render linked parent profiles as standalone top-level rows.
    // They are already shown as a sub-row inside their student's accordion.
    if (u._isLinkedParent) return false;

    let matchesRole = true;
    if (filterRole === "student") {
      matchesRole = u.role === "user" && u.account_type !== "staff" && u.account_type !== "admin" && u.account_type !== "parent";
    } else if (filterRole === "parent") {
      // Show profiles that have parent contact info embedded (cross-linked by page.tsx)
      matchesRole = u.role === "user" && (!!u.parent_first_name || !!u.parent_email);
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

  const handleRoleChange = (userId: string, newRole: "admin" | "user") => {
    startTransition(async () => {
      try {
        const result = await updateUserRole(userId, newRole);
        if (result?.shouldRedirect) {
          window.location.href = "/login";
        }
      } catch (err: any) {
        Swal.fire({
          title: "Error",
          text: err.message || "Failed to update role",
          icon: "error",
          confirmButtonColor: "#4f46e5"
        });
      }
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setIsSubmitting(true);
    try {
      const res: any = await createUserMember(email, firstName, phone, role, password);
      if (res && res.error) {
        setCreateError(res.error);
        return;
      }
      setIsOpen(false);
      setFirstName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRole("user");
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

      <div className="hidden md:grid grid-cols-[1.6fr_1.1fr_1.3fr_1.1fr_auto] gap-4 px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
        <div>Student</div>
        <div>Contact</div>
        <div>Role</div>
        <div>Date Created</div>
        <div className="text-right pr-10">Actions</div>
      </div>

      <Accordion type="multiple" className="w-full space-y-2">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-sm">
            No users found.
          </div>
        ) : (
          filteredUsers.map((user) => (
            <UserAccordionItem
              key={user.id}
              user={user}
              isPending={isPending}
              handleRoleChange={handleRoleChange}
              onSendSms={triggerSendSms}
              onManage={triggerManage}
              filterRole={filterRole}
            />
          ))
        )}
      </Accordion>

      {/* Add Member Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-2">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
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
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    placeholder="Input Password Here"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "admin" | "user")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    <option value="user">Member / Student</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Note: Accounts will be auto-confirmed. If password is left blank, the default is "User@12345".
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
        </div>
      )}

      {/* SMS Modal */}
      {smsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
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
        </div>
      )}
      {/* Manage User Modal */}
      {manageModalOpen && manageUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2.5 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
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
                <button onClick={() => setManageTab("subscription")} className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap shrink-0 transition-colors ${manageTab === "subscription" ? "border-violet-600 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>Subscription</button>
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
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student First Name</label>
                        <input value={manageFormData.student_first_name} onChange={(e) => setManageFormData({ ...manageFormData, student_first_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Last Name</label>
                        <input value={manageFormData.student_last_name} onChange={(e) => setManageFormData({ ...manageFormData, student_last_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Email</label>
                        <input value={manageFormData.student_email} onChange={(e) => setManageFormData({ ...manageFormData, student_email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Phone</label>
                        <input value={manageFormData.student_phone} onChange={(e) => setManageFormData({ ...manageFormData, student_phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                    </div>
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
        </div>
      )}
    </div>
  );
}
