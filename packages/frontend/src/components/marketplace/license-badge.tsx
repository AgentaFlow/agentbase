interface LicenseBadgeProps {
  settings:
    | {
        isPaid?: boolean;
        licenseKey?: string;
        licenseLastValidated?: string;
        licenseGracePeriodEnd?: string;
      }
    | null
    | undefined;
}

type LicenseStatus = "free" | "active" | "grace-period" | "expired";

function getLicenseStatus(
  settings: LicenseBadgeProps["settings"],
): LicenseStatus {
  if (!settings?.isPaid) return "free";
  if (!settings.licenseKey) return "expired";

  const now = new Date();
  const lastValidated = settings.licenseLastValidated
    ? new Date(settings.licenseLastValidated)
    : null;
  const graceEnd = settings.licenseGracePeriodEnd
    ? new Date(settings.licenseGracePeriodEnd)
    : null;

  if (!lastValidated) return "expired";

  // Active if validated within the last 6 minutes (covers the 5-min cache TTL)
  const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);
  if (lastValidated > sixMinutesAgo) return "active";

  // Within stored grace period
  if (graceEnd && graceEnd > now) return "grace-period";

  return "expired";
}

const STATUS_CONFIG: Record<
  LicenseStatus,
  { label: string; className: string }
> = {
  free: {
    label: "Free",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
  active: {
    label: "License Active",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  "grace-period": {
    label: "Grace Period",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  expired: {
    label: "License Expired",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

/**
 * Displays a small pill badge showing the license status of an installed plugin.
 *
 * Pass the `settings` field from an `InstalledPlugin` entity. The badge handles:
 * - Free plugins (no `isPaid` flag)
 * - Active licenses (validated within the last 6 minutes)
 * - Grace period (API unreachable but within the 72-hour grace window)
 * - Expired (grace period has elapsed and no recent validation)
 */
export function LicenseBadge({ settings }: LicenseBadgeProps) {
  const status = getLicenseStatus(settings);
  const { label, className } = STATUS_CONFIG[status];

  if (status === "free") return null; // Don't show a badge for free plugins

  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${className}`}
      title={
        settings?.licenseLastValidated
          ? `Last validated: ${new Date(settings.licenseLastValidated).toLocaleString()}`
          : undefined
      }
    >
      {label}
    </span>
  );
}
