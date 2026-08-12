"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Crown, AlertTriangle, Loader2 } from "lucide-react";
import { cancelOwnSubscription } from "@/app/actions/subscription";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ManageTrialModal({
  isOpen,
  onClose,
  currentPlan
}: {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push("/profile");
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your trial? You will not be charged, but you will lose access at the end of your trial period.")) return;
    
    setIsCancelling(true);
    try {
      const res = await cancelOwnSubscription();
      toast.success("Trial cancelled successfully.");
      onClose();
      
      if (res.immediate) {
        // Hard redirect to pricing page because they lost access
        window.location.href = "/pricing";
      } else {
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel trial.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <Crown className="size-5 text-indigo-600" />
            </div>
            <DialogTitle>Manage Trial Subscription</DialogTitle>
          </div>
          <DialogDescription className="pt-3">
            You are currently on a free trial for the <strong>{currentPlan}</strong> plan. What would you like to do?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex sm:justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isCancelling}
            className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-red-50 disabled:opacity-50 sm:w-auto items-center"
          >
            {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
            Cancel Trial
          </button>
          <button
            type="button"
            onClick={handleUpgrade}
            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:w-auto"
          >
            Upgrade Plan
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
