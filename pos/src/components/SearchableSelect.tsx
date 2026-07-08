"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  emptyMessage?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Search...",
  emptyMessage = "No results found",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.group && o.group.toLowerCase().includes(q))
    );
  }, [options, query]);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setHighlightIndex(0);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightIndex]) {
          onChange(filtered[highlightIndex].value);
          setOpen(false);
          setQuery("");
          setHighlightIndex(0);
        }
        break;
      case "Escape":
        setOpen(false);
        setQuery("");
        setHighlightIndex(0);
        break;
    }
  }

  function selectOption(option: Option) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
    setHighlightIndex(0);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Option[]>();
    for (const o of filtered) {
      const key = o.group || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries());
  }, [filtered]);

  let globalIdx = 0;
  const safeHighlight = filtered.length > 0 ? Math.min(highlightIndex, filtered.length - 1) : 0;

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <div
        className="flex items-center w-full px-3 py-2 border rounded-lg cursor-pointer bg-white"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlightIndex(0); }}
            placeholder={placeholder}
            className="flex-1 outline-none text-sm"
            autoFocus
          />
        ) : (
          <span className={`flex-1 text-sm ${displayLabel ? "text-gray-900" : "text-gray-400"}`}>
            {displayLabel || placeholder}
          </span>
        )}
        {open ? (
          <Search className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">{emptyMessage}</div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group}>
                {group && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                    {group}
                  </div>
                )}
                {items.map((option) => {
                  const idx = globalIdx++;
                  return (
                    <div
                      key={option.value}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
                        idx === safeHighlight
                          ? "bg-green-50 text-green-700"
                          : "hover:bg-gray-50"
                      } ${option.value === value ? "font-semibold" : ""}`}
                      onClick={() => selectOption(option)}
                      onMouseEnter={() => setHighlightIndex(idx)}
                    >
                      <span>{option.label}</span>
                      {option.value === value && (
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
