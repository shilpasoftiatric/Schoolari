"use client";

import React from "react";

interface AILoaderProps {
  isOpen: boolean;
  message?: string;
}

export function AILoader({ isOpen, message = "Processing..." }: AILoaderProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex flex-col items-center justify-center space-y-4">
        {/* The Loader Video */}
        <div className="relative w-[120px] h-[120px] flex items-center justify-center">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover scale-110"
          >
            <source src="/videos/ai-loader.webm" type="video/webm" />
          </video>
        </div>

        {/* Optional Message */}
        {message && (
          <div className="text-center px-4 py-2">
            <h3 className="text-sm font-bold text-slate-800 animate-pulse tracking-wide drop-shadow-sm">
              {message}
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
