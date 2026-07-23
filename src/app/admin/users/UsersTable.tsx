"use client";

import React, { useState, useTransition } from "react";
import { Search, Plus, X, Loader2, MessageSquare, ChevronDown } from "lucide-react";
import { updateUserRole, createUserMember } from "@/app/actions/admin";
import { sendAdminSms } from "@/app/actions/sms";
import { formatPhoneUS } from "@/lib/phone";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PhoneInput } from "@/components/ui/input";

function UserActions({
  user,
  handleRoleChange,
  isPending,
  onSendSms,
  roleOption
}: {
  user: any;
  handleRoleChange?: (id: string, role: "admin" | "user") => void;
  isPending?: boolean;
  onSendSms: () => void;
  roleOption?: boolean;
}) {
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {handleRoleChange && roleOption && (
        <select
          value={user.role}
          onChange={(e) => handleRoleChange(user.id, e.target.value as "admin" | "user")}
          disabled={isPending}
          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block p-2"
        >
          <option value="user">Member</option>
          <option value="admin">Admin</option>
        </select>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onSendSms(); }}
        className="p-2 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
        title="Send SMS"
      >
        <MessageSquare className="w-4 h-4" />
      </button>
    </div>
  );
}

function StudentSection({ user, actions }: { user: any, actions: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center w-full text-left pr-4">
      <div>
        <p className="font-bold text-slate-900">{user.student_first_name ? `${user.student_first_name} ${user.student_last_name}` : (user.first_name || "—")}</p>
        <p className="text-slate-500 text-xs">{user.student_email || user.email}</p>
      </div>
      <div className="hidden md:block">
        <p className="text-slate-700 text-sm font-medium">{formatPhoneUS(user.student_phone) || "—"}</p>
      </div>
      <div>
        <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${user.role === 'admin'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
          {user.role === 'admin' ? 'Admin' : 'Member'}
        </span>
      </div>
      <div className="hidden md:block">
        <p className="text-slate-500 text-sm font-medium">
          {new Date(user.created_at).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric"
          })}
        </p>
      </div>
      <div className="flex justify-end pr-2 md:pr-0">
        {actions}
      </div>
    </div>
  );
}

function ParentSection({ user, actions }: { user: any, actions: React.ReactNode }) {
  const hasParent = user.parent_first_name || user.parent_email;

  if (!hasParent) {
    return (
      <div className="p-6 bg-slate-50 border-t border-slate-100 text-center text-slate-500 text-sm">
        No linked parent found.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-100">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Linked Parent</h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center w-full text-left">
        <div>
          <p className="font-semibold text-slate-800">{user.parent_first_name ? `${user.parent_first_name} ${user.parent_last_name}` : "—"}</p>
          <p className="text-slate-500 text-xs">{user.parent_email || "—"}</p>
        </div>
        <div className="hidden md:block">
          <p className="text-slate-700 text-sm font-medium">{formatPhoneUS(user.parent_phone) || "—"}</p>
        </div>
        <div>
          <span className="px-2.5 py-1 text-xs font-bold rounded-md border bg-slate-100 text-slate-600 border-slate-200">
            Parent
          </span>
        </div>
        <div className="hidden md:block">
          <p className="text-slate-500 text-sm font-medium">
            {new Date(user.created_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric"
            })}
          </p>
        </div>
        <div className="flex justify-end pr-2 md:pr-4">
          {actions}
        </div>
      </div>
    </div>
  );
}

function UserAccordionItem({ user, isPending, handleRoleChange, onSendSms }: any) {
  return (
    <AccordionItem value={user.id} className="border border-slate-200 rounded-xl bg-white shadow-sm mb-3 overflow-hidden data-[state=open]:border-violet-200 data-[state=open]:shadow-md transition-all">
      <AccordionTrigger className="px-4 sm:px-6 py-4 hover:no-underline hover:bg-slate-50/50 transition-colors [&[data-state=open]]:bg-slate-50/50">
        <StudentSection
          user={user}
          actions={
            <UserActions
              user={user}
              handleRoleChange={handleRoleChange}
              isPending={isPending}
              onSendSms={() => onSendSms(user, "student")}
              roleOption={true}
            />
          }
        />
      </AccordionTrigger>
      <AccordionContent className="pb-0">
        <ParentSection
          user={user}
          actions={
            <UserActions
              user={user}
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

  // SMS Modal state
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsUser, setSmsUser] = useState<any>(null);
  const [smsRecipient, setSmsRecipient] = useState<"student" | "parent">("student");
  const [smsMessage, setSmsMessage] = useState("Hi, welcome to Schoolari! Your onboarding is complete.");
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsStatus, setSmsStatus] = useState({ type: "", msg: "" });

  const filteredUsers = initialUsers.filter((u) =>
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

  const handleRoleChange = (userId: string, newRole: "admin" | "user") => {
    startTransition(async () => {
      try {
        const result = await updateUserRole(userId, newRole);
        if (result?.shouldRedirect) {
          window.location.href = "/login";
        }
      } catch (err: any) {
        alert(err.message || "Failed to update role");
      }
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setIsSubmitting(true);
    try {
      await createUserMember(email, firstName, phone, role, password);
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
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
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
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
        <div>Student</div>
        <div>Contact</div>
        <div>Role</div>
        <div>Date Created</div>
        <div className="text-right pr-12">Actions</div>
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
    </div>
  );
}
