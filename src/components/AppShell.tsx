"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/components/AuthProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <AuthProvider>
      {!isLoginPage && <Navigation />}
      {!isLoginPage ? (
        <main className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {children}
        </main>
      ) : (
        children
      )}
    </AuthProvider>
  );
}
