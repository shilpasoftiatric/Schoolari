"use client";

import { useState, useTransition } from "react";
import { Search, Plus, X, Loader2, MessageSquare } from "lucide-react";
import { updateUserRole, createUserMember } from "@/app/actions/admin";
import { sendAdminSms } from "@/app/actions/sms";
import { formatPhoneUS } from "@/lib/phone";

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

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsUser) return;
    setSmsLoading(true);
    setSmsStatus({ type: "", msg: "" });
    try {
      const phone = smsRecipient === "student" ? smsUser.student_phone || smsUser.phone : smsUser.parent_phone;
      if (!phone) {
        throw new Error(`No phone number available for ${smsRecipient}.`);
      }
      const res = await sendAdminSms(phone, smsMessage);
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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
          />
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Student Contact</th>
              <th className="px-6 py-4">Parent</th>
              <th className="px-6 py-4">Parent Contact</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Date Created</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{user.student_first_name ? `${user.student_first_name} ${user.student_last_name}` : (user.first_name || "—")}</p>
                    <p className="text-slate-500 text-xs">{user.student_email || user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-700">{formatPhoneUS(user.student_phone) || "—"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{user.parent_first_name ? `${user.parent_first_name} ${user.parent_last_name}` : "—"}</p>
                    <p className="text-slate-500 text-xs">{user.parent_email || "—"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-700">{formatPhoneUS(user.parent_phone) || "—"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${user.role === 'admin'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                      {user.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(user.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric"
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as "admin" | "user")}
                        disabled={isPending}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block p-2"
                      >
                        <option value="user">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => {
                          setSmsUser(user);
                          setSmsRecipient(user.student_phone || user.phone ? "student" : "parent");
                          setSmsMessage("Hi, welcome to Schoolari! Your onboarding is complete.");
                          setSmsStatus({ type: "", msg: "" });
                          setSmsModalOpen(true);
                        }}
                        className="p-2 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                        title="Send SMS"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add New Member</h2>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 text-xs text-red-600 bg-red-50 rounded-lg border border-red-100">
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
                <input
                  type="text"
                  placeholder="(123) 456-7890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank for default"
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
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
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
      {smsModalOpen && smsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-600" /> Send SMS
              </h3>
              <button
                onClick={() => setSmsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendSms} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recipient</label>
                <select
                  value={smsRecipient}
                  onChange={(e) => setSmsRecipient(e.target.value as "student" | "parent")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                >
                  <option value="student">
                    Student ({formatPhoneUS(smsUser.student_phone || smsUser.phone) || "No phone"})
                  </option>
                  <option value="parent">
                    Parent ({formatPhoneUS(smsUser.parent_phone) || "No phone"})
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message</label>
                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Type your message here..."
                />
              </div>

              {smsStatus.msg && (
                <div className={`p-3 text-sm font-medium rounded-xl border ${smsStatus.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                  {smsStatus.msg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSmsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={smsLoading}
                  className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
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
    </div>
  );
}
