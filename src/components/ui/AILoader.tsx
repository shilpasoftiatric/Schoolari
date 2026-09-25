"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface AILoaderProps {
  isOpen: boolean;
  message?: string;
}

export function AILoader({
  isOpen,
  message = "Processing...",
}: AILoaderProps) {
  const [mounted, setMounted] = useState(false);
  const [topOffset, setTopOffset] = useState<number>(() => {
    if (typeof window === "undefined") return 64;
    const el = document.getElementById("main-content-viewport");
    return el ? el.getBoundingClientRect().top : 64;
  });

  useEffect(() => {
    setMounted(true);

    const updateTop = () => {
      const el = document.getElementById("main-content-viewport");
      if (el) {
        setTopOffset(el.getBoundingClientRect().top);
      }
    };

    updateTop();
    window.addEventListener("resize", updateTop);
    return () => window.removeEventListener("resize", updateTop);
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const content = (
    <div
      className="fixed z-20 flex flex-col items-center justify-center bg-white/75 backdrop-blur-md animate-in fade-in duration-200 select-none left-0 lg:left-[var(--sidebar-width,16rem)] right-0 bottom-0 transition-[left] duration-300 ease-in-out"
      style={{
        top: `${topOffset}px`,
        bottom: 0,
        height: `calc(100vh - ${topOffset}px)`,
      }}
    >
      <div className="flex flex-col items-center justify-center space-y-4 px-4 text-center">
        {/* The Loader Video */}
        <div className="relative w-[130px] h-[130px] flex items-center justify-center">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover scale-110 transform-gpu pointer-events-none"
          >
            <source src="/videos/ai-loader.webm" type="video/webm" />
          </video>
        </div>

        {/* Optional Message */}
        {message && (
          <div className="max-w-md text-center px-4 py-2">
            <h3 className="text-sm font-bold text-slate-800 animate-pulse tracking-wide drop-shadow-xs">
              {message}
            </h3>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
