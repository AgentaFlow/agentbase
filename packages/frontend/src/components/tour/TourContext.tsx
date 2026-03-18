"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { TOUR_STEPS } from "@/components/tour/tour-steps";

const LS_COMPLETED = "agentbase_tour_completed";
const LS_DISMISSED = "agentbase_tour_dismissed";

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  hasSeenTour: boolean;
  hasDismissedTour: boolean;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  /** permanent=true writes to localStorage so the welcome modal never shows again */
  skipTour: (permanent?: boolean) => void;
  completeTour: () => void;
  /** Clears both localStorage keys and re-enables the welcome modal */
  restartTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);
  const [hasDismissedTour, setHasDismissedTour] = useState(false);

  useEffect(() => {
    setHasSeenTour(localStorage.getItem(LS_COMPLETED) === "true");
    setHasDismissedTour(localStorage.getItem(LS_DISMISSED) === "true");
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev < TOUR_STEPS.length - 1) return prev + 1;
      return prev;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  const skipTour = useCallback((permanent = false) => {
    setIsActive(false);
    if (permanent) {
      localStorage.setItem(LS_DISMISSED, "true");
      setHasDismissedTour(true);
    }
  }, []);

  const completeTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(LS_COMPLETED, "true");
    setHasSeenTour(true);
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem(LS_COMPLETED);
    localStorage.removeItem(LS_DISMISSED);
    setHasSeenTour(false);
    setHasDismissedTour(false);
    setCurrentStep(0);
    setIsActive(false);
  }, []);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps: TOUR_STEPS.length,
        hasSeenTour,
        hasDismissedTour,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        completeTour,
        restartTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextType {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside <TourProvider>");
  return ctx;
}
