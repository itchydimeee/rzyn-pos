"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { offlineDB } from "@/lib/db";

export type SyncStatus = "online" | "offline" | "syncing";

export function useOnlineStatus() {
  const [status, setStatus] = useState<SyncStatus>(
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline"
  );
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);
  const queryClient = useQueryClient();

  const countPending = useCallback(async () => {
    const count = await offlineDB.pendingActions.count();
    setPendingCount(count);
  }, []);

  const syncPendingActions = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setStatus("syncing");

    try {
      const actions = await offlineDB.pendingActions.orderBy("id").toArray();

      for (const action of actions) {
        let response: Response;
        try {
          switch (action.type) {
            case "checkout":
              response = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action.payload),
              });
              break;
            case "expense":
              response = await fetch("/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action.payload),
              });
              break;
            case "stockEdit":
              response = await fetch("/api/stocks", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action.payload),
              });
              break;
            default:
              continue;
          }

          if (!response.ok) {
            console.error(`Failed to sync ${action.type} action:`, await response.text());
            break;
          }

          await offlineDB.pendingActions.delete(action.id!);
        } catch {
          break;
        }
      }

      await countPending();
      queryClient.invalidateQueries();
    } finally {
      syncingRef.current = false;
      setStatus(navigator.onLine ? "online" : "offline");
    }
  }, [countPending]);

  useEffect(() => {
    const handleOnline = () => {
      setStatus("online");
      countPending();
    };
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    countPending();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [countPending, syncPendingActions]);

  useEffect(() => {
    if (status === "online" && pendingCount > 0) {
      syncPendingActions();
    }
  }, [status, pendingCount, syncPendingActions]);

  return { status, pendingCount, refreshPending: countPending };
}
