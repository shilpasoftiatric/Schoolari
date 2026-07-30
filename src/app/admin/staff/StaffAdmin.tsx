"use client";

import { useState, useTransition } from "react";
import { Plus, Shield, UserX, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createStaffAccount, disableStaffAccount } from "@/app/actions/admin-staff";
import { toast } from "sonner";
import { STAFF_ROLES, type StaffRole } from "@/lib/rbac";

export function StaffAdmin({ initialStaff }: { initialStaff: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState("");
  
  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [role, setRole] = useState<StaffRole>("administrator");

  const filteredStaff = initialStaff.filter(s => 
    (s.email?.toLowerCase().includes(search.toLowerCase()) || 
     s.first_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createStaffAccount(email, firstName, role);
        toast.success("Staff account created successfully");
        setShowCreateModal(false);
        setEmail("");
        setFirstName("");
        setRole("administrator");
      } catch (error: any) {
        toast.error(error.message || "Failed to create account");
      }
    });
  };

  const handleDisable = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'enable' : 'disable'} this account?`)) return;
    
    startTransition(async () => {
      try {
        await disableStaffAccount(userId, !currentStatus);
        toast.success(`Account ${currentStatus ? 'enabled' : 'disabled'} successfully`);
      } catch (error: any) {
        toast.error(error.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
          />
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Name & Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Joined Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No staff members found matching "{search}"
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold shrink-0">
                          {staff.first_name?.[0] || staff.email?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{staff.first_name || "Unknown"}</p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {staff.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize border border-blue-100 gap-1.5">
                        <Shield className="w-3 h-3" />
                        {staff.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(staff.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisable(staff.id, false)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Disable
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Add Staff Member</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 -mr-2"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">First Name</label>
                <input
                  required
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none transition-shadow"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as StaffRole)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none transition-shadow bg-white"
                >
                  {STAFF_ROLES.map(r => (
                    <option key={r} value={r}>
                      {r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  Temporary password will be set to: <strong>Staff@12345</strong>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isPending} 
                  className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl"
                >
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
