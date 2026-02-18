"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Overview", icon: "📊" },
  { href: "/inspections", label: "Inspections", icon: "🔍" },
  { href: "/defects", label: "Defects", icon: "⚠️" },
  { href: "/work-orders", label: "Work Orders", icon: "🔧" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="bg-[#1a3a5f] text-white shadow-lg">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4">
        {/* Top bar with title */}
        <div className="flex items-center justify-between h-12 sm:h-16">
          <h1 className="text-base sm:text-xl font-bold tracking-wide truncate">
            DFS Fleet Metrics
          </h1>
          {/* Desktop nav */}
          <nav className="hidden sm:flex gap-1">
            {tabs.map((tab) => {
              const isActive =
                tab.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="mr-1.5">{tab.icon}</span>
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {/* Mobile bottom tabs */}
      <nav className="sm:hidden flex border-t border-white/10">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/60"
              }`}
            >
              <span className="text-lg leading-none mb-0.5">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
