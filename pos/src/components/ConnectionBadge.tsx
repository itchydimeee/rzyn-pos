"use client";

import { useOnlineStatus, type SyncStatus } from "@/hooks/useOnlineStatus";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

const badgeConfig: Record<SyncStatus, { label: string; icon: typeof Wifi; className: string }> = {
  online: { label: "", icon: Wifi, className: "" },
  offline: {
    label: "Offline",
    icon: WifiOff,
    className: "bg-amber-100 text-amber-800",
  },
  syncing: {
    label: "Syncing...",
    icon: RefreshCw,
    className: "bg-blue-100 text-blue-800",
  },
};

export function ConnectionBadge() {
  const { status, pendingCount } = useOnlineStatus();

  if (status === "online") return null;

  const config = badgeConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`fixed top-2 right-2 z-[100] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${config.className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${status === "syncing" ? "animate-spin" : ""}`} />
      <span>{config.label}</span>
      {pendingCount > 0 && status === "offline" && (
        <span className="ml-1 bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full text-[10px]">
          {pendingCount}
        </span>
      )}
    </div>
  );
}
