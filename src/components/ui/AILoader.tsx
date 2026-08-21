"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface AILoaderProps {
  isOpen: boolean;
  message?: string;
}

export function AILoader({ isOpen, message = "Processing..." }: AILoaderProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [topOffset, setTopOffset] = useState<number>(0);

  useEffect(() => {
    const el = document.getElementById("main-content-viewport") || document.body;
    setTarget(el);

    const updateOffset = () => {
      if (el && el.id === "main-content-viewport") {
        setTopOffset(el.getBoundingClientRect().top);
      }
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, [isOpen]);

  if (!isOpen || !target) return null;

  const isMainViewport = target.id === "main-content-viewport";

  const content = (
    <div
      className={
        isMainViewport
          ? "fixed right-0 left-0 lg:left-64 z-20 flex flex-col items-center justify-center bg-white/75 backdrop-blur-md animate-in fade-in duration-300 select-none"
          : "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/75 backdrop-blur-md animate-in fade-in duration-300 select-none"
      }
      style={
        isMainViewport
          ? {
              top: `${topOffset}px`,
              bottom: "0px",
              height: `calc(100vh - ${topOffset}px)`,
            }
          : undefined
      }
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
