"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Sidebar from "./Sidebar";

export default function ClientLayoutWrapper({ children }) {
  const pathname = usePathname();
  const { status } = useSession();

  // Hide the sidebar on the home/information page only if unauthenticated
  // Always hide the sidebar on the /login page
  const showSidebar = (pathname !== "/" || status === "authenticated") && !pathname.startsWith("/login");

  if (!showSidebar) {
    return <main style={{ minHeight: "100vh" }}>{children}</main>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0, // prevents overflow issues
          overflowX: "hidden",
        }}
      >
        <div style={{ padding: "2rem", flex: 1 }}>{children}</div>
      </main>
    </div>
  );
}
