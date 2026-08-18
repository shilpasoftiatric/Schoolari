import React from "react";

export function CoachingIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Exact Pixel-Perfect Coach Hero Illustration */}
      <img
        src="/images/Coaching-header-image.png"
        alt="College Admissions Coach"
        className="w-full h-auto max-h-[175px] object-contain drop-shadow-xs"
        loading="eager"
      />
    </div>
  );
}
