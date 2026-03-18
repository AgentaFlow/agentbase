export interface TourStep {
  id: string;
  title: string;
  description: string;
  placement: "right" | "bottom" | "left" | "top";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "overview",
    title: "Dashboard Overview",
    description:
      "This is your home base. See at a glance how many applications you have, which are active, and available plugins.",
    placement: "bottom",
  },
  {
    id: "applications",
    title: "Applications",
    description:
      "Create and manage your AI-powered applications here. Each app can have its own model, plugins, and configuration.",
    placement: "right",
  },
  {
    id: "ai-models",
    title: "AI Models",
    description:
      "Connect and configure AI providers like OpenAI, Anthropic, and Google Gemini. Switch models per application.",
    placement: "right",
  },
  {
    id: "marketplace",
    title: "Marketplace",
    description:
      "Browse and install community plugins and themes to extend your applications with new capabilities.",
    placement: "right",
  },
  {
    id: "analytics",
    title: "Analytics",
    description:
      "Track usage, conversations, costs, and performance metrics across all your applications.",
    placement: "right",
  },
  {
    id: "team",
    title: "Team",
    description:
      "Invite collaborators, manage roles and permissions, and work together on applications.",
    placement: "right",
  },
  {
    id: "billing",
    title: "Billing",
    description:
      "View your subscription plan, usage limits, and manage your payment method.",
    placement: "right",
  },
  {
    id: "settings",
    title: "Settings",
    description:
      "Update your profile, change your password, manage API keys, and configure AI provider credentials.",
    placement: "right",
  },
];
