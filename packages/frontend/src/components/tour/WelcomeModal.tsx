"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useTour } from "@/components/tour/TourContext";

export function WelcomeModal() {
  const { user } = useAuth();
  const { hasSeenTour, hasDismissedTour, startTour, skipTour } = useTour();
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [permanent, setPermanent] = useState(false);

  // Only show when user is loaded, hasn't completed/dismissed the tour,
  // and hasn't closed it this session
  if (!user || hasSeenTour || hasDismissedTour || sessionDismissed) return null;

  const handleStart = () => {
    setSessionDismissed(true);
    startTour();
  };

  const handleSkip = () => {
    setSessionDismissed(true);
    skipTour(permanent);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-welcome-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in-95 duration-200">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
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
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">AB</span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2
              id="tour-welcome-title"
              className="text-2xl font-bold text-slate-900 mb-2"
            >
              Welcome to Agentbase
              {user.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}!
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Let&apos;s take a quick tour to show you around. We&apos;ll
              highlight the key features so you can hit the ground running.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleStart}
              className="w-full bg-brand-600 text-white py-2.5 rounded-xl hover:bg-brand-700 font-semibold transition-colors"
            >
              Start Tour →
            </button>
            <button
              onClick={handleSkip}
              className="w-full text-slate-500 hover:text-slate-700 py-2 text-sm transition-colors"
            >
              Skip for now
            </button>
          </div>

          {/* Permanent opt-out */}
          <div className="mt-5 pt-4 border-t flex items-center gap-2">
            <input
              id="tour-dont-show"
              type="checkbox"
              checked={permanent}
              onChange={(e) => setPermanent(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label
              htmlFor="tour-dont-show"
              className="text-xs text-slate-400 cursor-pointer"
            >
              Don&apos;t show this again
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
