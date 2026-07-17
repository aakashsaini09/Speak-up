"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FilterStripProps {
  label: string;
  items: string[];
  active: string;
  onChange: (value: string) => void;
}

export function FilterStrip({ label, items, active, onChange }: FilterStripProps) {
  const [expanded, setExpanded] = useState(false);

  const Pill = ({ item }: { item: string }) => (
    <button
      type="button"
      onClick={() => onChange(item)}
      className={`shrink-0 text-xs cursor-pointer px-3 py-1.5 rounded-full transition-colors border whitespace-nowrap ${
        active === item
          ? "bg-zinc-700 border-zinc-600 text-white"
          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
      }`}
    >
      {item}
    </button>
  );

  return (
    <div className="mb-4 md:mb-5 md:px-20">

      {/* ── Mobile view ───────────────────────────────────────────────────
          Collapsed: expand button + "All" + active pill (if not "All").
          Expanded:  all pills wrap across as many rows as needed.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="md:hidden">
        {expanded ? (
          <>
            <div className="flex flex-wrap gap-2 pb-1">
              {items.map((item) => (
                <Pill key={item} item={item} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ChevronUp size={13} />
              Show less
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            {/* Expand toggle */}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              <ChevronDown size={12} />
              {label}
            </button>

            {/* Always-visible: "All" */}
            <Pill item="All" />

            {/* Show active pill if it's not "All" so context isn't lost */}
            {active !== "All" && <Pill item={active} />}
          </div>
        )}
      </div>

      {/* ── Desktop view — always fully expanded, wraps naturally ───────── */}
      <div className="hidden md:flex flex-wrap justify-center gap-2">
        {items.map((item) => (
          <Pill key={item} item={item} />
        ))}
      </div>

    </div>
  );
}