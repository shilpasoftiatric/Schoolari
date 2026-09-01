"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard, TrendingUp, XCircle, Users, RefreshCw,
  ChevronDown, RotateCcw, Tag, Plus, Trash2, ReceiptText,
  AlertTriangle, CheckCircle2, Clock, UserPlus, GraduationCap,
  Sparkles, X, Lock, Mail, User, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelSubscription,
  issueRefund,
  changeSubscriptionPlan,
  createCoupon,
  deleteCoupon,
  createAndActivateMember,
  manualActivateSubscriber,
} from "@/app/actions/admin-payments";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  canceled: { label: "Canceled", color: "bg-slate-100 text-slate-500", icon: XCircle },
  past_due: { label: "Past Due", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  trialing: { label: "Trialing", color: "bg-blue-100 text-blue-700", icon: Clock },
  incomplete: { label: "Incomplete", color: "bg-rose-100 text-rose-700", icon: AlertTriangle },
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export function PaymentsAdmin({
  subscribers,
  recentCharges,
  coupons,
  stats,
  availablePlans,
  stripeConfigured,
}: {
  subscribers: any[];
  recentCharges: any[];
  coupons: any[];
  stats: { active: number; canceled: number; totalRevenueCents: number };
  availablePlans: { priceId: string; name: string }[];
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const [couponList, setCouponList] = useState(coupons);
  const [subscriberList, setSubscriberList] = useState(subscribers);

  useEffect(() => {
    setCouponList(coupons);
  }, [coupons]);

  useEffect(() => {
    setSubscriberList(subscribers);
  }, [subscribers]);

  const [activeTab, setActiveTab] = useState<"subscriptions" | "history" | "coupons">("subscriptions");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Coupon form state
  const [couponForm, setCouponForm] = useState({
    name: "", percentOff: "", amountOff: "", duration: "once",
    durationInMonths: "", maxRedemptions: ""
  });
  const [showCouponForm, setShowCouponForm] = useState(false);

  // Refund modal state
  const [refundTarget, setRefundTarget] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState("");

  // Plan change state
  const [changePlanTarget, setChangePlanTarget] = useState<any | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState("");

  const filteredSubs = subscriberList.filter(
    (s) =>
      s.display_name.toLowerCase().includes(search.toLowerCase()) ||
      s.display_email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCancel = (sub: any) => {
    if (!confirm(`Cancel subscription for ${sub.display_name}? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await cancelSubscription(sub.stripe_subscription_id, sub.id);
        toast.success(`Subscription canceled for ${sub.display_name}`);
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const handleRefund = () => {
    if (!refundTarget) return;
    startTransition(async () => {
      try {
        const amountCents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined;
        await issueRefund(refundTarget.payment_intent, amountCents);
        toast.success("Refund issued successfully!");
        setRefundTarget(null);
        setRefundAmount("");
        router.refresh();
      } catch (e: any) {
        toast.error(`Refund failed: ${e.message}`);
      }
    });
  };

  const handleChangePlan = () => {
    if (!changePlanTarget || !selectedNewPlan) return;
    startTransition(async () => {
      try {
        await changeSubscriptionPlan(changePlanTarget.stripe_subscription_id, selectedNewPlan, changePlanTarget.id);
        toast.success("Plan updated successfully!");
        setChangePlanTarget(null);
        setSelectedNewPlan("");
        router.refresh();
      } catch (e: any) {
        toast.error(`Plan change failed: ${e.message}`);
      }
    });
  };

  // Add Member Modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    accountType: "student" as "student" | "parent",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    planPriceId: availablePlans[1]?.priceId || availablePlans[0]?.priceId || "",
    linkedParentName: "",
    linkedParentEmail: "",
    linkedParentPhone: "",
    linkedStudentName: "",
    linkedStudentEmail: "",
    linkedStudentPhone: "",
  });

  const handleCreateMember = () => {
    if (!newMemberForm.email || !newMemberForm.password || !newMemberForm.firstName || !newMemberForm.lastName || !newMemberForm.planPriceId) {
      toast.error("Please fill in all required fields (First Name, Last Name, Email, Password, Plan).");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createAndActivateMember(newMemberForm);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(`Account created & ${newMemberForm.accountType === "student" ? "Student" : "Parent"} plan activated!`);
          setShowAddMemberModal(false);
          setNewMemberForm({
            accountType: "student",
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            phone: "",
            planPriceId: availablePlans[1]?.priceId || availablePlans[0]?.priceId || "",
            linkedParentName: "",
            linkedParentEmail: "",
            linkedParentPhone: "",
            linkedStudentName: "",
            linkedStudentEmail: "",
            linkedStudentPhone: "",
          });
          router.refresh();
        }
      } catch (e: any) {
        toast.error(`Creation failed: ${e.message}`);
      }
    });
  };

  const handleCreateCoupon = () => {
    startTransition(async () => {
      try {
        const res = await createCoupon({
          name: couponForm.name,
          percentOff: couponForm.percentOff ? parseFloat(couponForm.percentOff) : undefined,
          amountOff: couponForm.amountOff ? parseFloat(couponForm.amountOff) : undefined,
          duration: couponForm.duration as any,
          durationInMonths: couponForm.durationInMonths ? parseInt(couponForm.durationInMonths) : undefined,
          maxRedemptions: couponForm.maxRedemptions ? parseInt(couponForm.maxRedemptions) : undefined,
        });

        if (res?.success) {
          toast.success("Coupon created in Stripe!");
          const newCouponObj = {
            id: res.couponId || couponForm.name.toUpperCase().trim(),
            name: couponForm.name,
            percent_off: couponForm.percentOff ? parseFloat(couponForm.percentOff) : null,
            amount_off: couponForm.amountOff ? Math.round(parseFloat(couponForm.amountOff) * 100) : null,
            duration: couponForm.duration,
            duration_in_months: couponForm.durationInMonths ? parseInt(couponForm.durationInMonths) : null,
            max_redemptions: couponForm.maxRedemptions ? parseInt(couponForm.maxRedemptions) : null,
            times_redeemed: 0,
          };
          setCouponList((prev) => [newCouponObj, ...prev]);
          setShowCouponForm(false);
          setCouponForm({ name: "", percentOff: "", amountOff: "", duration: "once", durationInMonths: "", maxRedemptions: "" });
          router.refresh();
        }
      } catch (e: any) {
        toast.error(`Failed to create coupon: ${e.message}`);
      }
    });
  };

  const handleDeleteCoupon = (id: string) => {
    if (!confirm("Delete this coupon from Stripe?")) return;
    setCouponList((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      try {
        const res = await deleteCoupon(id);
        if (res?.success) {
          toast.success("Coupon deleted.");
          router.refresh();
        }
      } catch (e: any) {
        toast.error(e.message);
        router.refresh();
      }
    });
  };

  if (!stripeConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-900 text-lg mb-1">Stripe Not Configured</h3>
        <p className="text-slate-500 text-sm">Add <code className="bg-slate-100 px-1 rounded">STRIPE_SECRET_KEY</code> to your <code className="bg-slate-100 px-1 rounded">.env.local</code> to enable payment management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Active Subscribers" value={stats.active.toString()} icon={Users} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Canceled" value={stats.canceled.toString()} icon={XCircle} color="bg-slate-100 text-slate-500" />
        <StatCard label="Total Revenue" value={`$${(stats.totalRevenueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} icon={TrendingUp} color="bg-violet-50 text-violet-600" />
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
        {(["subscriptions", "history", "coupons"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tab === "history" ? "Payment History" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Subscriptions Tab */}
      {activeTab === "subscriptions" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="max-w-sm"
            />
            <Button
              onClick={() => {
                setNewMemberForm((f) => ({
                  ...f,
                  planPriceId: f.planPriceId || availablePlans[0]?.priceId || "",
                }));
                setShowAddMemberModal(true);
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Add &amp; Activate Member
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredSubs.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CreditCard className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p>No subscribers found.</p>
              </div>
            ) : (
              filteredSubs.map((sub) => {
                const statusInfo = STATUS_CONFIG[sub.subscription_status] || STATUS_CONFIG["incomplete"];
                const StatusIcon = statusInfo.icon;
                const isExpanded = expandedId === sub.id;
                return (
                  <div key={sub.id}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                      className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {sub.display_name[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{sub.display_name}</p>
                        <p className="text-xs text-slate-500 truncate">{sub.display_email}</p>
                      </div>
                      <div className="hidden sm:block text-sm font-medium text-slate-700">{sub.plan_name}</div>
                      <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 bg-slate-50 border-t border-slate-100">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 mb-5 text-sm">
                          <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Plan</p>
                            <p className="font-bold text-slate-900 mt-0.5">{sub.plan_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Status</p>
                            <p className="font-bold text-slate-900 mt-0.5">{statusInfo.label}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Stripe Customer</p>
                            <p className="font-mono text-xs text-slate-600 mt-0.5 truncate">{sub.stripe_customer_id || "—"}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => { setChangePlanTarget(sub); setSelectedNewPlan(""); }}
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Change Plan
                          </Button>
                          {sub.subscription_status === "active" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1.5"
                              disabled={isPending}
                              onClick={() => handleCancel(sub)}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Cancel Subscription
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Payment History Tab */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-900">Recent Charges (last 50)</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentCharges.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ReceiptText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p>No charges found.</p>
              </div>
            ) : (
              recentCharges.map((charge) => (
                <div key={charge.id} className="px-5 py-4 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${charge.status === "succeeded" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                    {charge.status === "succeeded" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">
                      {charge.billing_details?.name || charge.customer || "Unknown customer"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {charge.description || "Subscription payment"} · {new Date(charge.created * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-slate-900">${(charge.amount / 100).toFixed(2)}</p>
                    <span className={`text-[10px] font-bold uppercase ${charge.refunded ? "text-amber-500" : charge.status === "succeeded" ? "text-emerald-600" : "text-rose-500"}`}>
                      {charge.refunded ? "Refunded" : charge.status}
                    </span>
                  </div>
                  {charge.status === "succeeded" && !charge.refunded && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0 text-xs h-8"
                      onClick={() => setRefundTarget(charge)}
                    >
                      <RotateCcw className="w-3 h-3" /> Refund
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Coupons Tab */}
      {activeTab === "coupons" && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500 font-medium">{couponList.length} active coupon{couponList.length !== 1 ? "s" : ""} in Stripe</p>
            <Button onClick={() => setShowCouponForm(!showCouponForm)} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
              <Plus className="w-4 h-4" /> Create Coupon
            </Button>
          </div>

          {showCouponForm && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="font-extrabold text-slate-900">New Coupon</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Coupon Name / Code</Label>
                  <Input value={couponForm.name} onChange={(e) => setCouponForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. SUMMER25" />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <select
                    value={couponForm.duration}
                    onChange={(e) => setCouponForm((f) => ({ ...f, duration: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="once">Once</option>
                    <option value="repeating">Repeating</option>
                    <option value="forever">Forever</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>% Off <span className="text-slate-400 font-normal">(or use $ off)</span></Label>
                  <Input type="number" value={couponForm.percentOff} onChange={(e) => setCouponForm((f) => ({ ...f, percentOff: e.target.value, amountOff: "" }))} placeholder="e.g. 25" />
                </div>
                <div className="space-y-2">
                  <Label>$ Off <span className="text-slate-400 font-normal">(or use % off)</span></Label>
                  <Input type="number" value={couponForm.amountOff} onChange={(e) => setCouponForm((f) => ({ ...f, amountOff: e.target.value, percentOff: "" }))} placeholder="e.g. 10" />
                </div>
                {couponForm.duration === "repeating" && (
                  <div className="space-y-2">
                    <Label>Duration in Months</Label>
                    <Input type="number" value={couponForm.durationInMonths} onChange={(e) => setCouponForm((f) => ({ ...f, durationInMonths: e.target.value }))} placeholder="e.g. 3" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Max Redemptions <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Input type="number" value={couponForm.maxRedemptions} onChange={(e) => setCouponForm((f) => ({ ...f, maxRedemptions: e.target.value }))} placeholder="Leave blank for unlimited" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowCouponForm(false)}>Cancel</Button>
                <Button disabled={isPending || !couponForm.name} onClick={handleCreateCoupon} className="bg-slate-900 text-white hover:bg-slate-800">
                  {isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Create Coupon"}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {couponList.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Tag className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p>No coupons yet. Create one to offer discounts.</p>
                </div>
              ) : (
                couponList.map((coupon) => (
                  <div key={coupon.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-900">{coupon.name || coupon.id}</p>
                      <p className="text-xs text-slate-500">
                        {coupon.percent_off ? `${coupon.percent_off}% off` : `$${(coupon.amount_off / 100).toFixed(2)} off`}
                        {" · "}{coupon.duration}
                        {coupon.times_redeemed !== undefined ? ` · ${coupon.times_redeemed} redeemed` : ""}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteCoupon(coupon.id)} disabled={isPending} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {changePlanTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">Change Plan</h3>
              <p className="text-xs text-slate-500 mt-0.5">For: {changePlanTarget.display_name}</p>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">Current plan: <span className="font-bold">{changePlanTarget.plan_name}</span></p>
              <div className="space-y-2">
                <Label>New Plan</Label>
                <div className="space-y-2">
                  {availablePlans.map((plan) => (
                    <button
                      key={plan.priceId}
                      onClick={() => setSelectedNewPlan(plan.priceId)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm font-bold ${selectedNewPlan === plan.priceId ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}
                    >
                      {plan.name}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400">Prorated charges will be applied automatically by Stripe.</p>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedNewPlan || isPending}
                  onClick={() => {
                    if (changePlanTarget && selectedNewPlan) {
                      startTransition(async () => {
                        try {
                          await manualActivateSubscriber(changePlanTarget.id, selectedNewPlan);
                          toast.success("Plan updated in database!");
                          setChangePlanTarget(null);
                          setSelectedNewPlan("");
                        } catch (e: any) {
                          toast.error(`Direct DB update failed: ${e.message}`);
                        }
                      });
                    }
                  }}
                  className="text-xs"
                >
                  Force DB Plan Fix
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setChangePlanTarget(null)}>Cancel</Button>
                  <Button size="sm" disabled={!selectedNewPlan || isPending} onClick={handleChangePlan} className="bg-slate-900 text-white hover:bg-slate-800">
                    {isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Confirm via Stripe"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">Issue Refund</h3>
              <p className="text-xs text-slate-500 mt-0.5">Charge: ${(refundTarget.amount / 100).toFixed(2)}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Refund Amount <span className="text-slate-400 font-normal">(leave blank for full refund)</span></Label>
                <Input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Max $${(refundTarget.amount / 100).toFixed(2)}`}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setRefundTarget(null)}>Cancel</Button>
                <Button variant="destructive" disabled={isPending} onClick={handleRefund}>
                  {isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Issue Refund"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member & Activate Plan Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  Add &amp; Activate Member
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create an account and immediately grant live subscription access without entering a card.
                </p>
              </div>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Account Type Selector (Matches Signup Flow) */}
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Account Type
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewMemberForm((f) => ({ ...f, accountType: "student" }))}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left cursor-pointer ${newMemberForm.accountType === "student"
                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${newMemberForm.accountType === "student" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Student Account</p>
                      <p className="text-[11px] text-slate-400 font-normal">Primary scholarship applicant</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewMemberForm((f) => ({ ...f, accountType: "parent" }))}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left cursor-pointer ${newMemberForm.accountType === "parent"
                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${newMemberForm.accountType === "parent" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Parent Account</p>
                      <p className="text-[11px] text-slate-400 font-normal">Parent / Guardian supervisor</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Primary User Information */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  {newMemberForm.accountType === "student" ? "Student Information" : "Parent Information"}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">First Name *</Label>
                    <Input
                      placeholder="e.g. Alex"
                      value={newMemberForm.firstName}
                      onChange={(e) => setNewMemberForm((f) => ({ ...f, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Last Name *</Label>
                    <Input
                      placeholder="e.g. Smith"
                      value={newMemberForm.lastName}
                      onChange={(e) => setNewMemberForm((f) => ({ ...f, lastName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Email Address *</Label>
                  <Input
                    type="email"
                    placeholder="e.g. member@schoolari.com"
                    value={newMemberForm.email}
                    onChange={(e) => setNewMemberForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Password *</Label>
                    <Input
                      type="text"
                      placeholder="Password123!"
                      value={newMemberForm.password}
                      onChange={(e) => setNewMemberForm((f) => ({ ...f, password: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone Number (Optional)</Label>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={newMemberForm.phone}
                      onChange={(e) => setNewMemberForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Plan Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Subscription Plan to Grant
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {availablePlans.map((plan) => {
                    const isSelected = newMemberForm.planPriceId === plan.priceId;
                    return (
                      <button
                        key={plan.priceId}
                        type="button"
                        onClick={() => setNewMemberForm((f) => ({ ...f, planPriceId: plan.priceId }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${isSelected
                            ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                            : "border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                      >
                        <p className="text-xs font-bold">{plan.name}</p>
                        <p className="text-[10px] text-slate-500 font-normal">Active Live Access</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Linked Account Details (Matching Signup Flow) */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  {newMemberForm.accountType === "student"
                    ? "Linked Parent Information (Optional)"
                    : "Linked Student Information (Optional)"}
                </Label>

                {newMemberForm.accountType === "student" ? (
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-600">Parent Full Name</Label>
                        <Input
                          placeholder="e.g. John Smith"
                          className="bg-white h-8 text-xs"
                          value={newMemberForm.linkedParentName}
                          onChange={(e) => setNewMemberForm((f) => ({ ...f, linkedParentName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-600">Parent Email</Label>
                        <Input
                          type="email"
                          placeholder="parent@example.com"
                          className="bg-white h-8 text-xs"
                          value={newMemberForm.linkedParentEmail}
                          onChange={(e) => setNewMemberForm((f) => ({ ...f, linkedParentEmail: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Parent Phone</Label>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        className="bg-white h-8 text-xs"
                        value={newMemberForm.linkedParentPhone}
                        onChange={(e) => setNewMemberForm((f) => ({ ...f, linkedParentPhone: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-600">Student Full Name</Label>
                        <Input
                          placeholder="e.g. Alex Smith"
                          className="bg-white h-8 text-xs"
                          value={newMemberForm.linkedStudentName}
                          onChange={(e) => setNewMemberForm((f) => ({ ...f, linkedStudentName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-600">Student Email</Label>
                        <Input
                          type="email"
                          placeholder="student@example.com"
                          className="bg-white h-8 text-xs"
                          value={newMemberForm.linkedStudentEmail}
                          onChange={(e) => setNewMemberForm((f) => ({ ...f, linkedStudentEmail: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Student Phone</Label>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        className="bg-white h-8 text-xs"
                        value={newMemberForm.linkedStudentPhone}
                        onChange={(e) => setNewMemberForm((f) => ({ ...f, linkedStudentPhone: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddMemberModal(false)}>
                Cancel
              </Button>
              <Button
                disabled={isPending}
                onClick={handleCreateMember}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 cursor-pointer"
              >
                {isPending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Create Account &amp; Activate Plan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
