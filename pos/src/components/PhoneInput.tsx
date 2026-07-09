"use client";

interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  className?: string;
}

const PREFIX = "+63 ";

function formatDisplay(raw: string): string {
  if (raw.length <= 3) return raw;
  if (raw.length <= 6) return raw.slice(0, 3) + " " + raw.slice(3);
  return raw.slice(0, 3) + " " + raw.slice(3, 6) + " " + raw.slice(6);
}

export function PhoneInput({ value, onChange, className }: PhoneInputProps) {
  const digits = value.startsWith(PREFIX) ? value.slice(PREFIX.length) : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    onChange(PREFIX + raw);
  }

  return (
    <div className="flex items-center border rounded-lg overflow-hidden bg-white">
      <span className="pl-3 pr-0 py-2 text-sm text-gray-500 font-mono select-none">{PREFIX}</span>
      <input
        type="text"
        inputMode="numeric"
        value={formatDisplay(digits)}
        onChange={handleChange}
        placeholder="9XX XXX XXXX"
        maxLength={14}
        className={`flex-1 pl-1 pr-3 py-2 outline-none text-sm ${className || ""}`}
      />
    </div>
  );
}

