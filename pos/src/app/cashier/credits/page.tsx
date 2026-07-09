"use client";

import { ConnectionBadge } from "@/components/ConnectionBadge";
import { CreditsTable } from "@/components/CreditsPage";

export default function CashierCreditsPage() {
  return (
    <div className="space-y-6">
      <ConnectionBadge />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Credits</h2>
      </div>
      <CreditsTable />
    </div>
  );
}
