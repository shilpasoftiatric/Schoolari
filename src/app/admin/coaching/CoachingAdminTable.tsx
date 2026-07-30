"use client";

import { useState } from "react";
import { Plus, Users, Calendar, Trash2, Video, ListTodo, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSession, deleteSession, assignActionItem, updateAttendance, updateCoachingNotes } from "@/app/actions/admin-coaching";

export function CoachingAdminTable({ initialSessions }: { initialSessions: any[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  
  // Assign Task State
  const [assigningStudent, setAssigningStudent] = useState<any | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Notes State
  const [notingStudent, setNotingStudent] = useState<any | null>(null);
  const [coachingNotes, setCoachingNotes] = useState("");

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createSession(formData);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this session?")) {
      await deleteSession(id);
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningStudent) return;

    await assignActionItem(
      assigningStudent.student_id, 
      taskTitle, 
      "COACHING", 
      taskDueDate
    );
    
    setAssigningStudent(null);
    setTaskTitle("");
    setTaskDueDate("");
    
    import("sonner").then(({ toast }) => {
      toast.success("Action item assigned to student's dashboard!");
    });
  };

  const handleAttendanceChange = async (enrollmentId: string, status: string) => {
    await updateAttendance(enrollmentId, status);
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notingStudent) return;
    
    await updateCoachingNotes(notingStudent.id, coachingNotes);
    setNotingStudent(null);
    setCoachingNotes("");
    
    import("sonner").then(({ toast }) => {
      toast.success("Coaching notes saved securely.");
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-sm font-semibold text-slate-600">
          {initialSessions.length} total sessions
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="w-4 h-4" /> Create Session
        </Button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Create New Session</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input name="title" required placeholder="e.g. Essay Brainstorming" />
              </div>
              <div className="space-y-2">
                <Label>Session Type</Label>
                <select name="session_type" className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="group">Group Coaching</option>
                  <option value="individual">1-on-1 Session</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input name="session_date" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label>Meeting Link (Zoom/Google Meet)</Label>
                <Input name="meeting_link" type="url" placeholder="https://zoom.us/j/..." />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Input name="description" placeholder="Short description of what we'll cover" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button type="submit">Save Session</Button>
            </div>
          </form>
        </div>
      )}

      {/* Sessions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {initialSessions.map(session => (
          <div key={session.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {session.session_type === 'group' ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-lg">
                      <Users className="w-3.5 h-3.5" /> Group
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider rounded-lg">
                      <User className="w-3.5 h-3.5" /> 1-on-1
                    </span>
                  )}
                </div>
                <button onClick={() => handleDelete(session.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">{session.title}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{session.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> 
                  {new Date(session.session_date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
                {session.meeting_link && (
                  <div className="flex items-center gap-1.5">
                    <Video className="w-4 h-4" /> Link attached
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 p-4">
              <button 
                onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
                className="w-full flex justify-between items-center text-sm font-bold text-slate-700 hover:text-slate-900"
              >
                <span>Registered Students ({session.enrollments?.length || 0})</span>
                <ChevronIcon isOpen={selectedSession?.id === session.id} />
              </button>
              
              {selectedSession?.id === session.id && (
                <div className="mt-4 space-y-3">
                  {session.enrollments?.length === 0 ? (
                    <div className="text-center py-4 text-sm text-slate-500">No students enrolled yet.</div>
                  ) : (
                    session.enrollments?.map((e: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{e.profiles?.student_first_name} {e.profiles?.student_last_name}</p>
                          <p className="text-xs text-slate-500">{e.profiles?.student_email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select 
                            defaultValue={e.attendance_status} 
                            onChange={(ev) => handleAttendanceChange(e.id, ev.target.value)}
                            className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 outline-none"
                          >
                            <option value="registered">Registered</option>
                            <option value="attended">Attended</option>
                            <option value="no_show">No Show</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-1.5 text-xs h-8"
                            onClick={() => {
                              setNotingStudent(e);
                              setCoachingNotes(e.internal_notes || "");
                            }}
                          >
                            Notes
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-1.5 text-xs h-8"
                            onClick={() => setAssigningStudent({ ...e, sessionTitle: session.title })}
                          >
                            <ListTodo className="w-3.5 h-3.5" /> Assign Task
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Assign Task Modal */}
      {assigningStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">Assign Action Item</h3>
              <p className="text-xs text-slate-500 mt-1">
                For {assigningStudent.profiles?.student_first_name} {assigningStudent.profiles?.student_last_name}
              </p>
            </div>
            <form onSubmit={handleAssignTask} className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input 
                  required 
                  value={taskTitle} 
                  onChange={(e) => setTaskTitle(e.target.value)} 
                  placeholder="e.g. Write intro paragraph for Common App" 
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input 
                  type="date" 
                  required 
                  value={taskDueDate} 
                  onChange={(e) => setTaskDueDate(e.target.value)} 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setAssigningStudent(null)}>Cancel</Button>
                <Button type="submit">Assign Task</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Private Notes Modal */}
      {notingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">Private Coaching Notes</h3>
              <p className="text-xs text-slate-500 mt-1">
                For {notingStudent.profiles?.student_first_name} {notingStudent.profiles?.student_last_name}. These notes are only visible to staff.
              </p>
            </div>
            <form onSubmit={handleSaveNotes} className="p-5 space-y-4">
              <div className="space-y-2">
                <textarea 
                  className="w-full min-h-[120px] p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Add your session notes, progress, and observations here..."
                  value={coachingNotes}
                  onChange={(e) => setCoachingNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setNotingStudent(null)}>Cancel</Button>
                <Button type="submit">Save Notes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
