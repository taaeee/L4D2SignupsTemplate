import "./globals.css";

export const metadata = {
  title: "L4D2 Tournament Registration",
  description:
    "Generate and share dynamic L4D2 tournament registration templates.",
};

import Providers from "@/components/Providers";
import Link from "next/link";
import { Home } from "lucide-react";
import { Toaster } from "sonner";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
          <Toaster theme="dark" position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
