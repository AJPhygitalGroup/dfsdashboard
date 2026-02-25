"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const tabs = [
  { href: "/", label: "Overview", icon: "\ud83d\udcca" },
  { href: "/inspections", label: "Inspections", icon: "\ud83d\udd0d" },
  { href: "/defects", label: "Defects", icon: "\u26a0\ufe0f" },
  { href: "/work-orders", label: "Work Orders", icon: "\ud83d\udd27" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  return (
    <header className="bg-[#1a3a5f] text-white shadow-lg">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4">
        {/* Top bar with title */}
        <div className="flex items-center justify-between h-12 sm:h-16">
          <h1 className="text-base sm:text-xl font-bold tracking-wide truncate">
            DFS Fleet Metrics
          </h1>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            <nav className="flex gap-1">
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
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin")
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="mr-1.5">{"\u2699\ufe0f"}</span>
                  Admin
                </Link>
              )}
            </nav>

            {/* User info + Sign out */}
            {user && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/20">
                <span className="text-sm text-white/80 truncate max-w-[150px]">
                  {user.name}
                  {user.dsp && (
                    <span className="text-white/50 ml-1 text-xs">({user.dsp})</span>
                  )}
                </span>
                <button
                  onClick={logout}
                  className="text-xs text-white font-medium bg-white/20 hover:bg-red-500 transition-colors px-3 py-1.5 rounded-md"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile: user name + sign out */}
          {user && (
            <div className="sm:hidden flex items-center gap-2">
              <span className="text-xs text-white/80 truncate max-w-[100px]">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="text-xs text-white font-medium bg-white/20 hover:bg-red-500 transition-colors px-2.5 py-1 rounded-md"
              >
                Sign Out
              </button>
            </div>
          )}
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
        {isAdmin && (
          <Link
            href="/admin"
            className={`flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-white/15 text-white"
                : "text-white/60"
            }`}
          >
            <span className="text-lg leading-none mb-0.5">{"\u2699\ufe0f"}</span>
            Admin
          </Link>
        )}
      </nav>
    </header>
  );
}
