"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Screenshot {
  src: string;
  alt: string;
  caption: string;
}

export function ScreenshotsGallery({ shots }: { shots: Screenshot[] }) {
  const [active, setActive] = useState<Screenshot | null>(null);

  const close = useCallback(() => setActive(null), []);

  // Close on Escape key
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, close]);

  // Prevent background scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = active ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shots.map((shot) => (
          <button
            key={shot.src}
            onClick={() => setActive(shot)}
            className="group rounded-xl overflow-hidden border shadow-sm bg-slate-50 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            aria-label={`View full size: ${shot.caption}`}
          >
            <div className="relative aspect-video w-full overflow-hidden">
              <Image
                src={shot.src}
                alt={shot.alt}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* zoom hint overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow">
                  Click to enlarge
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-600 text-center py-3 font-medium">
              {shot.caption}
            </p>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
        >
          {/* Panel — stop click from bubbling to backdrop */}
          <div
            className="relative max-w-6xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1"
              aria-label="Close lightbox"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Close · Esc
            </button>

            {/* Image */}
            <div className="relative w-full rounded-xl overflow-hidden shadow-2xl bg-slate-900">
              <Image
                src={active.src}
                alt={active.alt}
                width={1920}
                height={1080}
                className="w-full h-auto"
                priority
              />
            </div>

            {/* Caption */}
            <p className="mt-3 text-center text-white/80 text-sm font-medium">
              {active.caption}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
