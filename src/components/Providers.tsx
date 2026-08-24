"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/lib/i18n";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </SessionProvider>
  );
}
