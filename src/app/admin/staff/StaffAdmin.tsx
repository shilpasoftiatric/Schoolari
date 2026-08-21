"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  GraduationCap,
  FileText,
  Headphones,
  UserX,
  UserCheck,
  Mail,
  Phone,
  Search,
  Pencil,
  Trash2,
  Users,
  CheckCircle2,
  Sparkles,
  Lock,
  Calendar,
  Clock,
  X,
  Loader2,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/input";
import {
  createStaffAccount,
  updateStaffMember,
  disableStaffAccount,
  deleteStaffMember,
} from "@/app/actions/admin-staff";
import { toast } from "sonner";
import { STAFF_ROLES, ROLE_LABELS, type StaffRole } from "@/lib/rbac";
import { formatPhoneUS } from "@/lib/phone";

export interface StaffMember {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  name: string;
  phone?: string;
  role: StaffRole;
  account_type: string;
  is_active: boolean;
  is_banned: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

const ROLE_ICONS: Record<StaffRole, React.ComponentType<{ className?: string }>> = {
  super_admin: ShieldAlert,
  admin: ShieldCheck,
  college_coach: GraduationCap,
  content_manager: FileText,
  customer_support: Headphones,
};

const ROLE_BADGE_STYLES: Record<StaffRole, string> = {
  super_admin: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20",
  admin: "bg-violet-50 text-violet-700 border-violet-200 ring-violet-500/20",
  college_coach: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20",
  content_manager: "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20",
  customer_support: "bg-teal-50 text-teal-700 border-teal-200 ring-teal-500/20",
};

const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  super_admin: "Full platform control: staff, settings, payments, and all features",
  admin: "Administrative access: manage users, scholarships, coaching, and messages",
  college_coach: "Coaching access: 1-on-1 student coaching, sessions, and messaging",
  content_manager: "Content access: scholarships, guides, income tracks, and tips",
  customer_support: "Support access: member lookup and messaging inquiries",
};

const AVATAR_GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
];

export function StaffAdmin({
  initialStaff,
  currentUserId,
}: {
  initialStaff: StaffMember[];
  currentUserId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  // Search and filter states
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Create form state
  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>("admin");
  const [newPassword, setNewPassword] = useState("Staff@12345");

  // Edit form state
  const [editFirstName, setEditFirstName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<StaffRole>("admin");
  const [editPassword, setEditPassword] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase();
    return initialStaff.filter((s) => {
      const matchesSearch =
        !term ||
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.first_name && s.first_name.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.phone && s.phone.toLowerCase().includes(term)) ||
        (ROLE_LABELS[s.role] && ROLE_LABELS[s.role].toLowerCase().includes(term)) ||
        (s.role && s.role.toLowerCase().includes(term));

      const matchesRole = roleFilter === "all" || s.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.is_active) ||
        (statusFilter === "disabled" && !s.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [initialStaff, search, roleFilter, statusFilter]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = initialStaff.length;
    const admins = initialStaff.filter(
      (s) => s.role === "super_admin" || s.role === "admin"
    ).length;
    const coaches = initialStaff.filter((s) => s.role === "college_coach").length;
    const active = initialStaff.filter((s) => s.is_active).length;
    return { total, admins, coaches, active };
  }, [initialStaff]);

  // Open edit modal with prefilled data
  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditFirstName(staff.first_name || staff.name || "");
    setEditEmail(staff.email || "");
    setEditPhone(staff.phone || "");
    setEditRole(staff.role || "admin");
    setEditPassword("");
    setEditIsActive(staff.is_active);
  };

  // Handle create submission
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newFirstName.trim()) {
      toast.error("Please provide both name and email.");
      return;
    }

    startTransition(async () => {
      try {
        await createStaffAccount(
          newEmail,
          newFirstName,
          newRole,
          newPassword,
          newPhone
        );
        toast.success(`Staff account for "${newFirstName}" created successfully.`);
        setShowCreateModal(false);
        setNewEmail("");
        setNewFirstName("");
        setNewPhone("");
        setNewRole("admin");
        setNewPassword("Staff@12345");
      } catch (error: any) {
        toast.error(error.message || "Failed to create staff account");
      }
    });
  };

  // Handle update submission
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editFirstName.trim() || !editEmail.trim()) {
      toast.error("First name and email are required.");
      return;
    }

    startTransition(async () => {
      try {
        await updateStaffMember(editingStaff.id, {
          firstName: editFirstName,
          email: editEmail,
          phone: editPhone,
          role: editRole,
          password: editPassword || undefined,
          isActive: editIsActive,
        });
        toast.success(`Updated staff details for "${editFirstName}".`);
        setEditingStaff(null);
      } catch (error: any) {
        toast.error(error.message || "Failed to update staff member");
      }
    });
  };

  // Handle disable/enable toggle
  const handleToggleStatus = (staff: StaffMember) => {
    const isCurrentlyActive = staff.is_active;
    const actionName = isCurrentlyActive ? "disable" : "enable";

    if (staff.id === currentUserId && isCurrentlyActive) {
      toast.error("You cannot disable your own active account.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to ${actionName} account access for ${staff.name || staff.email}?`
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await disableStaffAccount(staff.id, isCurrentlyActive);
        toast.success(
          `Staff account ${isCurrentlyActive ? "disabled" : "enabled"} successfully.`
        );
      } catch (error: any) {
        toast.error(error.message || "Failed to update status");
      }
    });
  };

  // Handle delete staff
  const handleDelete = (staff: StaffMember) => {
    if (staff.id === currentUserId) {
      toast.error("You cannot delete your own account.");
      return;
    }

    if (
      !confirm(
        `⚠️ WARNING: Are you sure you want to permanently delete ${staff.name} (${staff.email})? This action cannot be undone.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteStaffMember(staff.id);
        toast.success(`Staff member "${staff.name}" deleted successfully.`);
      } catch (error: any) {
        toast.error(error.message || "Failed to delete account");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Staff Management
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800">
              {initialStaff.length} Members
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Manage admin team accounts, college coaches, roles, and administrative permissions.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-2 shadow-sm h-11 px-5 font-semibold transition-all hover:shadow-violet-200 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Staff</p>
            <p className="text-xl font-bold text-slate-900">{metrics.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Admins</p>
            <p className="text-xl font-bold text-slate-900">{metrics.admins}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">College Coaches</p>
            <p className="text-xl font-bold text-slate-900">{metrics.coaches}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Active Accounts</p>
            <p className="text-xl font-bold text-slate-900">{metrics.active}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="relative flex items-center">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
            >
              <option value="all">All Roles</option>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative flex items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">
                  Role & Access
                </th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">
                  Joined Date
                </th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-800">No staff members found</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {search || roleFilter !== "all" || statusFilter !== "all"
                          ? "Try adjusting your search criteria or active filters."
                          : "Get started by adding your first admin team member or coach."}
                      </p>
                      {(search || roleFilter !== "all" || statusFilter !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setRoleFilter("all");
                            setStatusFilter("all");
                          }}
                          className="mt-4 rounded-xl text-xs"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff, idx) => {
                  const RoleIcon = ROLE_ICONS[staff.role] || Shield;
                  const roleStyle =
                    ROLE_BADGE_STYLES[staff.role] ||
                    "bg-slate-100 text-slate-700 border-slate-200";
                  const isCurrent = staff.id === currentUserId;
                  const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                  const initial =
                    staff.first_name?.[0]?.toUpperCase() ||
                    staff.name?.[0]?.toUpperCase() ||
                    staff.email?.[0]?.toUpperCase() ||
                    "S";

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Name & Contact */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0`}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 truncate">
                                {staff.name || staff.first_name || "Unknown"}
                              </p>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-col sm:items-start gap-1 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1 text-slate-600 truncate">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                {staff.email}
                              </span>
                              {staff.phone && (
                                <span className="flex items-center gap-1 text-slate-500 shrink-0">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  {formatPhoneUS(staff.phone)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Access */}
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1">
                          <span className={`inline-flex items-center gap-1.5 ${roleStyle} px-2.5 py-0.5 rounded-full border text-xs font-semibold max-w-fit`}>
                            <RoleIcon className="w-3.5 h-3.5" />
                            {ROLE_LABELS[staff.role] || staff.role?.replace("_", " ")}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {staff.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-6 py-4 text-xs text-slate-500 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(staff.created_at).toLocaleDateString()}</span>
                        </div>
                        {staff.last_sign_in_at && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              Active {new Date(staff.last_sign_in_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(staff)}
                            disabled={isPending}
                            className="h-8 px-2.5 rounded-lg text-slate-700 hover:text-violet-700 hover:bg-violet-50 font-medium text-xs gap-1.5"
                            title="Edit staff details"
                          >
                            <Pencil className="w-3.5 h-3.5 text-violet-600" />
                            <span>Edit</span>
                          </Button>

                          {/* Enable/Disable Toggle */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(staff)}
                            disabled={isPending || isCurrent}
                            className={`h-8 px-2.5 rounded-lg font-medium text-xs gap-1.5 ${staff.is_active
                                ? "text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                                : "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                              }`}
                            title={
                              isCurrent
                                ? "Cannot disable your own account"
                                : staff.is_active
                                  ? "Disable account access"
                                  : "Enable account access"
                            }
                          >
                            {staff.is_active ? (
                              <>
                                <UserX className="w-3.5 h-3.5 text-amber-600" />
                                <span className="hidden sm:inline">Disable</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">Enable</span>
                              </>
                            )}
                          </Button>

                          {/* Delete Account */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(staff)}
                            disabled={isPending || isCurrent}
                            className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title={
                              isCurrent
                                ? "Cannot delete your own account"
                                : "Delete staff member"
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  EDIT STAFF MEMBER MODAL                                     */}
      {/* ============================================================ */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Staff Member</h3>
                  <p className="text-xs text-slate-500">{editingStaff.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none text-sm text-slate-900 transition-shadow"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="staff@schoolari.com"
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none text-sm text-slate-900 transition-shadow"
                />
              </div>

              {/* Phone Number (US format) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <PhoneInput
                  value={editPhone}
                  onChange={(val) => setEditPhone(val)}
                  defaultCountry="US"
                  className="w-full"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Staff Role & Permission Level <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as StaffRole)}
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none text-sm text-slate-900 transition-shadow bg-white"
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]} ({r})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-violet-500 shrink-0" />
                  {ROLE_DESCRIPTIONS[editRole]}
                </p>
              </div>

              {/* Password Reset Option */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reset Password <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep existing password"
                    className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none text-sm text-slate-900 transition-shadow"
                  />
                </div>
              </div>

              {/* Account Status Active Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Account Access</p>
                  <p className="text-xs text-slate-500">Allow this staff member to sign in</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    disabled={editingStaff.id === currentUserId}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingStaff(null)}
                  className="rounded-xl h-11 px-4 font-semibold text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 px-5 font-semibold gap-2 shadow-sm"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  ADD STAFF MEMBER MODAL                                      */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add Staff Member</h3>
                  <p className="text-xs text-slate-500">Create a new admin team or coach account</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="e.g. Jordan Mitchell"
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none text-sm text-slate-900 transition-shadow"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jordan@schoolari.com"
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none text-sm text-slate-900 transition-shadow"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <PhoneInput
                  value={newPhone}
                  onChange={(val) => setNewPhone(val)}
                  defaultCountry="US"
                  className="w-full"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Staff Role & Access <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as StaffRole)}
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none text-sm text-slate-900 transition-shadow bg-white"
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-violet-500 shrink-0" />
                  {ROLE_DESCRIPTIONS[newRole]}
                </p>
              </div>

              {/* Initial Temporary Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Initial Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none text-sm text-slate-900 transition-shadow font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Default temporary password. The staff member can change it upon logging in.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl h-11 px-4 font-semibold text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 px-5 font-semibold gap-2 shadow-sm"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
