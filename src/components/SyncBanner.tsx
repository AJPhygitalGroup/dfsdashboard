"use client";

interface SyncBannerProps {
  syncTimestamp?: string | null;
  /** Show as inline text (for sub-pages) or full banner (overview) */
  variant?: "banner" | "inline";
}

function formatSyncDate(iso: string): string {
  const d = new Date(iso);
  // Format: "Feb 18, 2026 at 8:38 AM EST"
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
}

export default function SyncBanner({ syncTimestamp, variant = "inline" }: SyncBannerProps) {
  if (!syncTimestamp) return null;

  const formatted = formatSyncDate(syncTimestamp);

  if (variant === "banner") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 sm:mb-6 text-sm text-green-700">
        Data loaded automatically from latest email report
        <span className="block sm:inline sm:ml-2 text-green-600 font-medium">
          Last sync: {formatted}
        </span>
      </div>
    );
  }

  return (
    <p className="text-xs text-green-600 mt-2">
      Data loaded automatically from latest email report &middot; Last sync: <span className="font-medium">{formatted}</span>
    </p>
  );
}
