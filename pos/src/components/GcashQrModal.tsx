"use client";

import { formatCurrency } from "@/lib/utils";
import { Modal } from "./Modal";

interface GcashQrModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  total: number;
}

export function GcashQrModal({ open, onClose, onConfirm, total }: GcashQrModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="GCash Payment" maxWidth="max-w-sm">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <img
            src="/gcash-qr.svg"
            alt="GCash QR Code"
            width={200}
            height={200}
            className="rounded-lg border mx-auto"
          />
        </div>
        <p className="text-sm text-gray-600 mb-1">
          Please scan the QR code to pay
        </p>
        <p className="text-lg font-bold text-green-600 mb-6">
          {formatCurrency(total)}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
          >
            Confirm Payment
          </button>
        </div>
      </div>
    </Modal>
  );
}
