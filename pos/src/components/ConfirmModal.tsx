"use client";

import { useState, useCallback, useEffect } from "react";
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
  children?: React.ReactNode;
  confirmSecondaryLabel?: string;
  onConfirmSecondary?: () => void;
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
  children,
  confirmSecondaryLabel,
  onConfirmSecondary,
}: ConfirmModalProps) {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSubmitted(false);
  }, [open]);

  const handleConfirm = useCallback(() => {
    if (submitted || loading) return;
    setSubmitted(true);
    onConfirm();
  }, [submitted, loading, onConfirm]);

  const handleSecondaryConfirm = useCallback(() => {
    if (submitted || loading) return;
    setSubmitted(true);
    onConfirmSecondary?.();
  }, [submitted, loading, onConfirmSecondary]);

  if (!open) return null;

  const isDisabled = loading || submitted;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={isDisabled ? undefined : onClose} />
      <div className="relative bg-white rounded-xl shadow-lg max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} disabled={isDisabled} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-30 z-10">
          <X className="w-5 h-5" />
        </button>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 pr-8">{title}</h3>
          <p className="mt-2 text-sm text-gray-500">{message}</p>
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-5 flex gap-3 justify-end">
            <button onClick={onClose} disabled={isDisabled} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDisabled}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 ${
                variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {loading && <Spinner />}
              {loading ? (confirmLabel === "Resolve" ? "Resolving..." : confirmLabel === "Remove" ? "Removing..." : "Saving...") : confirmLabel}
            </button>
            {confirmSecondaryLabel && onConfirmSecondary && (
              <button
                onClick={handleSecondaryConfirm}
                disabled={isDisabled}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {confirmSecondaryLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
