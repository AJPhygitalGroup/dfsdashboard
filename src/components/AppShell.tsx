"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/components/AuthProvider";
import ToastProvider from "@/components/ToastProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <AuthProvider>
      <ToastProvider>
        {!isLoginPage && <Navigation />}
        {!isLoginPage ? (
          <main className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {children}
          </main>
        ) : (
          children
        )}
      </ToastProvider>
    </AuthProvider>
  );
}
