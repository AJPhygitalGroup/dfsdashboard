"use client";

import { useState, useRef } from "react";

interface NotePopoverProps {
  notes: string[];
  rejectedReasons?: string[];
  children: React.ReactNode;
  /** Max width of the popover (default 400px) */
  maxWidth?: number;
}

/**
 * Wraps children with a hover popover that shows full notes and rejected
 * reasons. Uses portal-like fixed positioning so the popover is never
 * clipped by the parent table's overflow.
 */
export default function NotePopover({
  notes,
  rejectedReasons = [],
  children,
  maxWidth = 400,
}: NotePopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; alignRight: boolean }>({
    top: 0,
    left: 0,
    alignRight: false,
  });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const hasContent = notes.length > 0 || rejectedReasons.length > 0;
  if (!hasContent) return <>{children}</>;

  const handleEnter = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    // Prefer right side of trigger, but flip to left if it would overflow
    const wouldOverflow = rect.left + maxWidth + 20 > viewportWidth;
    setPosition({
      top: rect.bottom + 8,
      left: wouldOverflow ? rect.right - maxWidth : rect.left,
      alignRight: wouldOverflow,
    });
    setOpen(true);
  };

  const handleLeave = () => setOpen(false);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="cursor-help"
      >
        {children}
      </span>
      {open && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs pointer-events-none"
          style={{ top: position.top, left: position.left, maxWidth }}
        >
          {notes.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">
                Inspector Note{notes.length > 1 ? "s" : ""} ({notes.length})
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {notes.map((n, i) => (
                  <div
                    key={i}
                    className="bg-amber-50 border-l-2 border-amber-400 pl-2 py-1 text-gray-700 leading-relaxed whitespace-pre-wrap"
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>
          )}
          {rejectedReasons.length > 0 && (
            <div className={notes.length > 0 ? "mt-3 pt-3 border-t" : ""}>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-red-500 mb-1.5">
                Rejected Reason{rejectedReasons.length > 1 ? "s" : ""} ({rejectedReasons.length})
              </p>
              <div className="space-y-1">
                {rejectedReasons.map((r, i) => (
                  <div
                    key={i}
                    className="bg-red-50 border-l-2 border-red-400 pl-2 py-1 text-gray-700 leading-relaxed"
                  >
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
