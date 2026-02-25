"use client";

import { useState, useRef, useEffect } from "react";
import { useTeam } from "@/context/team-context";

/**
 * Team switcher dropdown for the dashboard sidebar.
 * Displays the current team and allows switching between teams.
 */
export function TeamSwitcher() {
  const { teams, currentTeam, switchTeam, loading } = useTeam();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (loading || !currentTeam) {
    return (
      <div className="px-3 py-2">
        <div className="h-8 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-100 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
          {currentTeam.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate text-xs">
            {currentTeam.name}
          </p>
          <p className="text-[10px] text-slate-400 truncate capitalize">
            {currentTeam.plan} plan
            {currentTeam.isPersonal && " · Personal"}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => {
                switchTeam(team.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-left ${
                team.id === currentTeam.id ? "bg-brand-50" : ""
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                {team.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">
                  {team.name}
                </p>
              </div>
              {team.id === currentTeam.id && (
                <svg
                  className="w-4 h-4 text-brand-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
          <div className="border-t mt-1 pt-1">
            <a
              href="/dashboard/team"
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => setOpen(false)}
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Team
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
