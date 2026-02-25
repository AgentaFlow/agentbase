"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import api from "@/lib/api";
import { useAuth } from "./auth-context";

interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  isPersonal: boolean;
  plan: string;
  ownerId: string;
}

interface TeamContextType {
  teams: Team[];
  currentTeam: Team | null;
  loading: boolean;
  switchTeam: (teamId: string) => void;
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTeams = useCallback(async () => {
    if (!user) {
      setTeams([]);
      setCurrentTeam(null);
      setLoading(false);
      return;
    }

    try {
      const fetchedTeams = await api.getTeams();
      setTeams(fetchedTeams);

      // Restore persisted team selection
      const savedTeamId = api.getTeamId();
      const savedTeam = savedTeamId
        ? fetchedTeams.find((t: Team) => t.id === savedTeamId)
        : null;

      if (savedTeam) {
        setCurrentTeam(savedTeam);
      } else {
        // Default to personal team, or first team
        const personal = fetchedTeams.find((t: Team) => t.isPersonal);
        const defaultTeam = personal || fetchedTeams[0] || null;
        if (defaultTeam) {
          api.setTeamId(defaultTeam.id);
          setCurrentTeam(defaultTeam);
        }
      }
    } catch (err) {
      console.error("Failed to load teams:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  const switchTeam = useCallback(
    (teamId: string) => {
      const team = teams.find((t) => t.id === teamId);
      if (team) {
        api.setTeamId(team.id);
        setCurrentTeam(team);
      }
    },
    [teams],
  );

  return (
    <TeamContext.Provider
      value={{ teams, currentTeam, loading, switchTeam, refreshTeams }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx;
}
