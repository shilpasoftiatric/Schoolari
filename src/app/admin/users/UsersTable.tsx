"use client";

import { useState, useTransition } from "react";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { updateUserRole, createUserMember } from "@/app/actions/admin";

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

  const filteredUsers = initialUsers.filter((u) => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.phone?.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = (userId: string, newRole: "admin" | "user") => {
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole);
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
              <th className="px-6 py-4">Name & Email</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Date Created</th>
              <th className="px-6 py-4">Change Role</th>
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
                    <p className="font-bold text-slate-900">{user.first_name || "—"}</p>
                    <p className="text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">{user.phone || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${
                      user.role === 'admin' 
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
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as "admin" | "user")}
                      disabled={isPending}
                      className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block w-full p-2"
                    >
                      <option value="user">Member</option>
                      <option value="admin">Administrator</option>
                    </select>
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
    </div>
  );
}
