"use client";

import { useState } from "react";
import { ManageTrialModal } from "./ManageTrialModal";

export function ManageTrialButton({ currentPlan }: { currentPlan: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex-none rounded-full bg-white px-3 py-1 sm:px-3.5 sm:py-1 text-xs sm:text-sm font-semibold text-indigo-600 shadow-xs hover:bg-indigo-50 transition-colors whitespace-nowrap cursor-pointer"
      >
        Manage Subscription
      </button>

      <ManageTrialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentPlan={currentPlan}
      />
    </>
  );
}
