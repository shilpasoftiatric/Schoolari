"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackToTopButtonProps {
  /**
   * CSS selector for the scrollable container.
   * If not provided, it will attempt to use 'main' or fall back to window scrolling.
   */
  scrollContainerSelector?: string;
  /**
   * The scroll threshold in pixels before the button appears.
   */
  threshold?: number;
}

export function BackToTopButton({
  scrollContainerSelector = "main",
  threshold = 50,
}: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Determine the scroll container: either the provided selector or the window
    const container = scrollContainerSelector ? document.querySelector(scrollContainerSelector) : window;
    
    if (!container) return;

    const handleScroll = () => {
      // Handle both Element (scrollTop) and Window (scrollY) scrolling
      const currentScroll = 
        container instanceof Element 
          ? container.scrollTop 
          : window.scrollY;

      if (currentScroll > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Check initial scroll position
    handleScroll();

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollContainerSelector, threshold]);

  const scrollToTop = () => {
    const container = scrollContainerSelector ? document.querySelector(scrollContainerSelector) : window;
    
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      className={cn(
        "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50",
        "w-12 h-12 md:w-14 md:h-14",
        "flex items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
        "hover:bg-violet-700 hover:scale-110 active:scale-95 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <ArrowUp className="w-5 h-5 md:w-6 md:h-6" />
    </button>
  );
}
