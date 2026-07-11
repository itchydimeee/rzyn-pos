"use client";

import { useEffect } from "react";
import { Receipt, ReceiptData } from "./Receipt";

interface PrintReceiptModalProps {
  open: boolean;
  onClose: () => void;
  transaction: ReceiptData;
  autoPrint?: boolean;
}

export function PrintReceiptModal({ open, onClose, transaction, autoPrint }: PrintReceiptModalProps) {
  useEffect(() => {
    if (open && autoPrint) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [open, autoPrint]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="absolute top-4 right-4 flex gap-2 no-print">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm"
        >
          Print
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 text-sm"
        >
          Close
        </button>
      </div>
      <div className="py-8 px-4 flex justify-center">
        <Receipt data={transaction} />
      </div>
    </div>
  );
}
