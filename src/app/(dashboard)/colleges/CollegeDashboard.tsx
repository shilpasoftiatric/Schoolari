"use client";

import { useState } from "react";
import { addCollege, updateCollege, deleteCollege } from "@/app/actions/colleges";
import { GraduationCap, Plus, Calendar, Save, Trash2, CheckCircle2, Clock, X, Building, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_COLORS = {
  researching: "bg-blue-50 text-blue-700 border-blue-200",
  applied: "bg-amber-50 text-amber-700 border-amber-200",
  waitlisted: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-slate-100 text-slate-500 border-slate-200"
};

const STATUS_LABELS = {
  researching: "Researching",
  applied: "Applied",
  waitlisted: "Waitlisted",
  accepted: "Accepted",
  rejected: "Rejected"
};

export function CollegeDashboard({ initialColleges }: { initialColleges: any[] }) {
  const [colleges, setColleges] = useState(initialColleges);
  
  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState("");
  const [newCollegeDeadline, setNewCollegeDeadline] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Edit Modal State
  const [editingCollege, setEditingCollege] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Computed metrics
  const totalColleges = colleges.length;
  const appliedCount = colleges.filter(c => c.status === "applied").length;
  const acceptedCount = colleges.filter(c => c.status === "accepted").length;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollegeName.trim()) return;
    setIsAdding(true);
    try {
      const newCollege = await addCollege(newCollegeName, newCollegeDeadline);
      setColleges([newCollege, ...colleges]);
      setNewCollegeName("");
      setNewCollegeDeadline("");
      setIsAddModalOpen(false);
    } catch (error) {
      alert("Failed to add college.");
    } finally {
      setIsAdding(false);
    }
  };

  const openEditModal = (college: any) => {
    setEditingCollege(college);
    setEditStatus(college.status);
    setEditNotes(college.notes || "");
    setEditDeadline(college.deadline || "");
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      await updateCollege(editingCollege.id, {
        status: editStatus,
        notes: editNotes,
        deadline: editDeadline
      });
      // Update local state
      setColleges(colleges.map(c => 
        c.id === editingCollege.id 
          ? { ...c, status: editStatus, notes: editNotes, deadline: editDeadline } 
          : c
      ));
      setEditingCollege(null);
    } catch (error) {
      alert("Failed to save updates.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this college?")) return;
    try {
      await deleteCollege(id);
      setColleges(colleges.filter(c => c.id !== id));
      if (editingCollege?.id === id) setEditingCollege(null);
    } catch (error) {
      alert("Failed to delete college.");
    }
  };

  return (
    <div className="space-y-8 pb-8">
      
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-violet-500" />
            College Planning
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Track your target schools, deadlines, and admission status.
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl py-6 px-6 shadow-sm shadow-violet-200 transition-all hover:-translate-y-0.5">
          <Plus className="w-5 h-5 mr-2" /> Add College
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Saved</p>
            <p className="text-2xl font-extrabold text-slate-900">{totalColleges}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Applications Out</p>
            <p className="text-2xl font-extrabold text-slate-900">{appliedCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Acceptances</p>
            <p className="text-2xl font-extrabold text-slate-900">{acceptedCount}</p>
          </div>
        </div>
      </div>

      {/* Colleges Grid */}
      {colleges.length === 0 ? (
        <div className="text-center py-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
          <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No colleges saved yet</h3>
          <p className="text-slate-500 mb-6">Start building your college list by adding your target schools.</p>
          <Button onClick={() => setIsAddModalOpen(true)} variant="outline" className="rounded-xl font-bold">
            Add Your First College
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {colleges.map((college) => (
            <div 
              key={college.id}
              onClick={() => openEditModal(college)}
              className="group bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {college.college_name}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[college.status as keyof typeof STATUS_COLORS]}`}>
                  {STATUS_LABELS[college.status as keyof typeof STATUS_LABELS]}
                </span>
              </div>
              
              <div className="mt-auto space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Deadline: {college.deadline ? new Date(college.deadline).toLocaleDateString() : "Not set"}
                </div>
                {college.notes && (
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl line-clamp-2 border border-slate-100">
                    {college.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-extrabold text-slate-900">Add College</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">College Name</label>
                <Input 
                  value={newCollegeName}
                  onChange={(e) => setNewCollegeName(e.target.value)}
                  placeholder="e.g. Harvard University"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Application Deadline (Optional)</label>
                <Input 
                  type="date"
                  value={newCollegeDeadline}
                  onChange={(e) => setNewCollegeDeadline(e.target.value)}
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" onClick={() => setIsAddModalOpen(false)} variant="outline" className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdding || !newCollegeName.trim()} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold">
                  {isAdding ? "Adding..." : "Add College"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCollege && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-extrabold text-slate-900">{editingCollege.college_name}</h2>
              <button onClick={() => setEditingCollege(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Admission Status</label>
                <select 
                  value={editStatus} 
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <option value="researching">Researching</option>
                  <option value="applied">Applied</option>
                  <option value="waitlisted">Waitlisted</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Application Deadline</label>
                <Input 
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Personal Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes about campus tours, requirements, essays..."
                  className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none h-32"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <button 
                onClick={() => handleDelete(editingCollege.id)}
                className="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Remove College"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              
              <div className="flex gap-3">
                <Button onClick={() => setEditingCollege(null)} variant="outline" className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
