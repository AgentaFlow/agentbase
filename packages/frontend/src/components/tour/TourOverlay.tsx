"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TOUR_STEPS } from "@/components/tour/tour-steps";
import { useTour } from "@/components/tour/TourContext";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8; // px around the highlighted element
const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 16; // space between spotlight edge and tooltip

export function TourOverlay() {
  const {
    isActive,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
  } = useTour();
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const observerRef = useRef<ResizeObserver | null>(null);

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === totalSteps - 1;

  const calculatePositions = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.id}"]`);
    if (!el) return;

    const raw = el.getBoundingClientRect();
    const padded: Rect = {
      top: raw.top - PADDING,
      left: raw.left - PADDING,
      width: raw.width + PADDING * 2,
      height: raw.height + PADDING * 2,
    };
    setRect(padded);

    // Compute tooltip position based on placement preference
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let style: React.CSSProperties = {
      position: "fixed",
      width: TOOLTIP_WIDTH,
    };

    if (
      step.placement === "right" &&
      raw.right + TOOLTIP_GAP + TOOLTIP_WIDTH < vw
    ) {
      style.left = raw.right + TOOLTIP_GAP;
      style.top = Math.max(8, Math.min(raw.top, vh - 240));
    } else if (
      step.placement === "left" &&
      raw.left - TOOLTIP_GAP - TOOLTIP_WIDTH > 0
    ) {
      style.left = raw.left - TOOLTIP_GAP - TOOLTIP_WIDTH;
      style.top = Math.max(8, Math.min(raw.top, vh - 240));
    } else if (step.placement === "bottom") {
      style.top = raw.bottom + TOOLTIP_GAP;
      style.left = Math.max(8, Math.min(raw.left, vw - TOOLTIP_WIDTH - 8));
    } else {
      // top or fallback
      style.top = Math.max(8, raw.top - TOOLTIP_GAP - 200);
      style.left = Math.max(8, Math.min(raw.left, vw - TOOLTIP_WIDTH - 8));
    }

    setTooltipStyle(style);
  }, [step]);

  // Scroll element into view and recalculate
  useEffect(() => {
    if (!isActive || !step) return;

    const el = document.querySelector(`[data-tour="${step.id}"]`);
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      // After scroll animation — recalculate
      const t = setTimeout(calculatePositions, 350);
      return () => clearTimeout(t);
    } else {
      setRect(null);
    }
  }, [isActive, currentStep, step, calculatePositions]);

  // ResizeObserver for window resize
  useEffect(() => {
    if (!isActive) return;
    observerRef.current = new ResizeObserver(calculatePositions);
    observerRef.current.observe(document.body);
    window.addEventListener("resize", calculatePositions);
    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("resize", calculatePositions);
    };
  }, [isActive, calculatePositions]);

  if (!isActive) return null;

  return (
    <>
      {/* Dark mask with spotlight cut-out via box-shadow */}
      {rect ? (
        <div
          className="fixed z-50 rounded-xl pointer-events-none transition-all duration-300"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            borderRadius: 10,
          }}
        />
      ) : (
        // Full-screen dim when no element found
        <div className="fixed inset-0 z-50 bg-black/55 pointer-events-none" />
      )}

      {/* Invisible click-blocker over the whole screen (except tooltip) */}
      <div className="fixed inset-0 z-50" onClick={() => skipTour()} />

      {/* Tooltip card */}
      <div
        className="z-[60] bg-white rounded-2xl shadow-2xl p-6 pointer-events-auto"
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step counter */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
            {currentStep + 1} / {totalSteps}
          </span>
          <button
            onClick={() => skipTour()}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="End tour"
          >
            <svg
              className="w-4 h-4"
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
          </button>
        </div>

        <h3 className="font-bold text-slate-900 text-base mb-1.5">
          {step?.title}
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-5">
          {step?.description}
        </p>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= currentStep ? "bg-brand-600" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="px-4 py-2 text-sm font-medium text-slate-600 border rounded-lg hover:bg-slate-50 transition-colors"
            >
              ← Back
            </button>
          )}
          <div className="flex-1" />
          {isLast ? (
            <button
              onClick={completeTour}
              className="px-5 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Finish 🎉
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="px-5 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </>
  );
}
