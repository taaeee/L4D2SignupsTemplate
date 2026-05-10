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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <nav
            style={{
              padding: "1rem 2rem",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              background: "rgba(0,0,0,0.2)",
              marginBottom: "2rem",
            }}
          >
            <Link
              href="/"
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: "bold",
                fontSize: "1.2rem",
              }}
            >
              <Home size={24} color="var(--primary)" /> Home
            </Link>
          </nav>
          {children}
          <Toaster theme="dark" position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
