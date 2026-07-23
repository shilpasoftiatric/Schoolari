"use client";

import { useState, useTransition, useMemo } from "react";
import { Search, Plus, Edit, Trash2, Power, Star, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createScholarship,
  updateScholarship,
  deleteScholarship,
  toggleScholarshipStatus,
  triggerApifyScraper
} from "@/app/actions/admin";

export function ScholarshipsTable({ initialScholarships }: { initialScholarships: any[] }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState("");
  const [modalState, setModalState] = useState<{ isOpen: boolean, type: "create" | "edit", scholarship: any | null }>({ isOpen: false, type: "create", scholarship: null });
  const [isAllStates, setIsAllStates] = useState(true);
  const [isScraping, setIsScraping] = useState(false);

  // Filter & Sort
  const filteredSorted = useMemo(() => {
    let result = [...initialScholarships];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortBy === "deadline") return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (sortBy === "award") return String(a.award_amount).localeCompare(String(b.award_amount), undefined, { numeric: true });
      if (sortBy === "category") return String(a.category).localeCompare(String(b.category));
      return String(a.name).localeCompare(String(b.name));
    });
    return result;
  }, [initialScholarships, search, sortBy]);

  const handleToggle = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleScholarshipStatus(id, !currentStatus);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this scholarship?")) return;
    startTransition(async () => {
      try {
        await deleteScholarship(id);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const awardInput = formData.get("awardAmount")?.toString() || "";
    const formattedAward = awardInput.startsWith("$") ? awardInput : `$${awardInput}`;

    const payload = {
      name: formData.get("name"),
      link: formData.get("link"),
      award_amount: formattedAward,
      deadline: formData.get("deadline"),
      category: formData.get("category"),
      description: formData.get("description"),
      eligible_majors: formData.getAll("eligibleMajors").join(", "),
      min_gpa_required: formData.get("minGpaRequired") ? Number(formData.get("minGpaRequired")) : null,
      eligible_states: formData.get("stateEligibilityAll") === "on" ? "All" : formData.getAll("eligibleStates").join(", "),
      grade_levels: formData.getAll("gradeLevels").map(s => s.toString()),
      essay_required: formData.get("essayRequired") === "on",
      citizenship_requirement: formData.get("citizenshipRequirement") as string,
      organization_name: formData.get("organizationName") as string,
      award_frequency: formData.get("awardFrequency") as string,
      number_of_awards: formData.get("numberOfAwards") ? Number(formData.get("numberOfAwards")) : null,
    };

    startTransition(async () => {
      setSaveError("");
      try {
        if (modalState.type === "edit" && modalState.scholarship) {
          await updateScholarship(modalState.scholarship.id, payload);
        } else {
          await createScholarship(payload);
        }
        setModalState({ isOpen: false, type: "create", scholarship: null });
        setSaveError("");
      } catch (err: any) {
        setSaveError(err.message || "An unknown error occurred. Please check all fields and try again.");
      }
    });
  };

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      await triggerApifyScraper();
      alert("Scraping started! The database will be populated automatically when it finishes (usually in a few minutes).");
    } catch (err: any) {
      alert(err.message || "Failed to start scraping.");
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex w-full md:w-auto items-center gap-3 flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search scholarships..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 w-full"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 border border-slate-200 text-sm rounded-lg px-3 focus:ring-violet-500 bg-white min-w-[140px]"
          >
            <option value="name">Name (A-Z)</option>
            <option value="deadline">Deadline</option>
            <option value="category">Category</option>
            <option value="award">Award amount</option>
          </select>
        </div>
        <div className="flex w-full md:w-auto items-center gap-2">
          <Button
            onClick={handleScrape}
            disabled={isScraping}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-xl gap-2 shadow-sm"
          >
            <RefreshCcw className={`w-4 h-4 ${isScraping ? "animate-spin" : ""}`} />
            {isScraping ? "Starting..." : "Auto-Fetch Scholarships"}
          </Button>
          <Button onClick={() => {
            setModalState({ isOpen: true, type: "create", scholarship: null });
            setIsAllStates(true);
          }} className="w-full md:w-auto bg-slate-900 text-white font-bold h-10 rounded-xl gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Add Scholarship
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-5 py-4 w-1/4">Name</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Deadline</th>
                <th className="px-5 py-4">Award</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    No scholarships match your search.
                  </td>
                </tr>
              ) : (
                filteredSorted.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-bold text-slate-900 line-clamp-1">{item.name}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700">
                      {item.award_amount}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 text-[11px] font-bold rounded-md border ${item.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setModalState({ isOpen: true, type: "edit", scholarship: item });
                            setIsAllStates(item.eligible_states?.toLowerCase().includes("all") ?? true);
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(item.id, item.is_active)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${item.is_active
                            ? 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-red-100 text-red-500 bg-red-50 hover:bg-red-100 hover:border-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {modalState.type === "edit" ? "Edit Scholarship" : "Add Scholarship"}
              </h2>
              <button
                onClick={() => { setModalState({ isOpen: false, type: "create", scholarship: null }); setSaveError(""); }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Inline Error Display */}
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-semibold flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">⚠️</span>
                  <span>{saveError}</span>
                </div>
              )}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Required Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Scholarship Name</label>
                    <Input name="name" defaultValue={modalState.scholarship?.name} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Apply URL</label>
                    <Input name="link" defaultValue={modalState.scholarship?.link} required type="url" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Award Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium pointer-events-none">$</span>
                      <Input name="awardAmount" defaultValue={modalState.scholarship?.award_amount?.replace(/^\$/, '') || ""} required placeholder="5,000" className="pl-7" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Deadline</label>
                    <Input name="deadline" defaultValue={modalState.scholarship?.deadline} required type="date" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <textarea
                    name="description"
                    defaultValue={modalState.scholarship?.description}
                    required
                    rows={3}
                    className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Optional (AI Matching)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Eligible Majors</label>
                    <select
                      name="eligibleMajors"
                      multiple
                      defaultValue={modalState.scholarship?.eligible_majors ? modalState.scholarship.eligible_majors.split(", ") : []}
                      className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-40"
                    >
                      {[
                        "Business Administration", "Computer Science", "Nursing", "Psychology", "Biology",
                        "Criminal Justice", "Education", "Engineering", "Communications", "Accounting",
                        "Marketing", "Finance", "Political Science", "Graphic Design", "Information Technology",
                        "Health Sciences", "Social Work", "English", "Architecture", "Other", "Undecided", "Any Major"
                      ].map(major => (
                        <option key={major} value={major}>{major}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">Hold Ctrl (Windows) or Cmd (Mac) to select multiple.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Minimum GPA</label>
                    <Input name="minGpaRequired" type="number" step="0.1" max="5.0" defaultValue={modalState.scholarship?.min_gpa_required} placeholder="e.g. 3.0" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">State Eligibility (Optional)</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="stateEligibilityAll"
                        checked={isAllStates}
                        onChange={(e) => setIsAllStates(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                    </label>
                    <span className="text-sm font-semibold text-slate-700">Available in all U.S. States</span>
                  </div>

                  {!isAllStates && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Select Eligible States</label>
                      <select
                        name="eligibleStates"
                        multiple
                        defaultValue={modalState.scholarship?.eligible_states ? modalState.scholarship.eligible_states.split(", ") : []}
                        className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-32"
                      >
                        {[
                          "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
                          "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
                          "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
                          "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
                          "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
                        ].map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500">Hold Ctrl (Windows) or Cmd (Mac) to select multiple.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grade Level (Optional)</h3>
                <div className="flex flex-row flex-wrap gap-4">
                  {["High School", "Undergraduate", "Graduate"].map(level => (
                    <label key={level} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="gradeLevels"
                        value={level}
                        defaultChecked={modalState.scholarship?.grade_levels?.includes(level)}
                        className="w-4 h-4 text-violet-600 bg-slate-100 border-slate-300 rounded focus:ring-violet-500 focus:ring-2"
                      />
                      <span className="text-sm font-semibold text-slate-700">{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Essay Required</h3>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="essayRequired"
                          defaultChecked={modalState.scholarship?.essay_required || false}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                      </label>
                      <span className="text-sm font-semibold text-slate-700">Essay Required</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Citizenship Requirement</h3>
                    <select name="citizenshipRequirement" defaultValue={modalState.scholarship?.citizenship_requirement || "Any Citizenship"} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                      <option value="Any Citizenship">Any Citizenship</option>
                      <option value="U.S. Citizens Only">U.S. Citizens Only</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Optional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Category</label>
                    <select name="category" defaultValue={modalState.scholarship?.category || "General"} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                      <option value="General">General</option>
                      <option value="Arts and Design">Arts and Design</option>
                      <option value="Business">Business</option>
                      <option value="Education">Education</option>
                      <option value="Health and Medicine">Health and Medicine</option>
                      <option value="Humanities">Humanities</option>
                      <option value="Social Sciences">Social Sciences</option>
                      <option value="STEM">STEM</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Organization Offering Scholarship</label>
                    <Input name="organizationName" defaultValue={modalState.scholarship?.organization_name} placeholder="Enter organization name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Award Frequency</label>
                    <select name="awardFrequency" defaultValue={modalState.scholarship?.award_frequency || ""} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                      <option value="">Not Specified</option>
                      <option value="one_time">One Time</option>
                      <option value="renewable">Renewable</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Number of Awards</label>
                    <Input name="numberOfAwards" type="number" min="1" defaultValue={modalState.scholarship?.number_of_awards} placeholder="Example: 25" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setModalState({ isOpen: false, type: "create", scholarship: null })} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="bg-slate-900 text-white font-bold">
                  {isPending ? "Saving..." : "Save Scholarship"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
