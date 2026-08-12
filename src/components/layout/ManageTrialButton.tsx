"use client";

import { useState } from "react";
import { ManageTrialModal } from "./ManageTrialModal";

export function ManageTrialButton({ currentPlan }: { currentPlan: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex-none rounded-full bg-white px-3.5 py-1 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
