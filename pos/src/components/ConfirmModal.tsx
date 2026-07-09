"use client";

import { X } from "lucide-react";
import { Spinner } from "@/app/_lib/query/Spinner";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "default",
  loading = false,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onClose} />
      <div className="relative bg-white rounded-xl shadow-lg max-w-sm w-full mx-4 p-6">
        <button onClick={onClose} disabled={loading} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-30">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        <div className="mt-5 flex gap-3 justify-end">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 ${
              variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading && <Spinner />}
            {loading ? (confirmLabel === "Resolve" ? "Resolving..." : confirmLabel === "Remove" ? "Removing..." : "Saving...") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
