"use client";

import { useState, useEffect } from "react";

interface DateRangeFilterProps {
  onRangeChange: (from: string, to: string) => void;
  /** Pass raw date strings from data to auto-detect min/max range */
  dates?: string[];
}

export default function DateRangeFilter({
  onRangeChange,
  dates,
}: DateRangeFilterProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Auto-detect date range from data
  useEffect(() => {
    if (dates && dates.length > 0) {
      const parsed = dates
        .map((d) => {
          const t = new Date(d).getTime();
          return isNaN(t) ? null : t;
        })
        .filter((t): t is number => t !== null);

      if (parsed.length > 0) {
        const min = new Date(Math.min(...parsed));
        const max = new Date(Math.max(...parsed));
        const minStr = formatDateInput(min);
        const maxStr = formatDateInput(max);
        setFromDate(minStr);
        setToDate(maxStr);
      }
    }
  }, [dates]);

  function formatDateInput(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const handleApply = () => {
    onRangeChange(fromDate, toDate);
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    onRangeChange("", "");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-gray-500 font-medium">Date Range:</label>
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        className="border rounded p-1.5 text-sm"
      />
      <span className="text-gray-400 text-xs">to</span>
      <input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        className="border rounded p-1.5 text-sm"
      />
      <button
        onClick={handleApply}
        className="bg-[#1a3a5f] text-white text-xs px-3 py-1.5 rounded hover:bg-[#0f2a4a] transition-colors"
      >
        Apply
      </button>
      {(fromDate || toDate) && (
        <button
          onClick={handleClear}
          className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1.5 rounded border"
        >
          Clear
        </button>
      )}
    </div>
  );
}
