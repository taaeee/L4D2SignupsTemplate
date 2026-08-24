"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Swords, Map, LogOut, Settings, Radio, Globe } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Dock, DockIcon } from "@/components/ui/dock";
import { useCasterStatus } from "@/lib/useCasterStatus";
import { useTranslation } from "@/lib/i18n";

export default function NavigationDock() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isCaster } = useCasterStatus();
  const { t, language, setLanguage } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const navItems = [
    { name: t("nav.tournaments"), href: "/torneos", icon: Trophy },
    { name: t("nav.matches"), href: "/matches", icon: Swords },
    { name: t("nav.map_veto"), href: "/map-veto", icon: Map },
    ...(isCaster ? [{ name: t("nav.caster_hub"), href: "/caster", icon: Radio }] : []),
  ];

  const toggleLanguage = () => {
    setLanguage(language === "es" ? "en" : "es");
  };

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto">
        <Dock
          direction="middle"
          className="bg-[#1B1E22]/80 dark:bg-black/80 border-white/10 shadow-xl shadow-black/50 backdrop-blur-md antialiased"
        >
          {navItems.map((item) => {
            const isActive =
              (pathname.startsWith(item.href) && item.href !== "/") ||
              (pathname === "/" && item.href === "/");
            return (
              <DockIcon key={item.href}>
                <Link
                  href={item.href}
                  title={item.name}
                  className={`flex items-center justify-center w-full h-full transition-colors ${isActive ? "text-[#6FAF3A]" : "text-gray-400 hover:text-white"}`}
                >
                  <item.icon className="w-full h-full max-w-[28px] max-h-[28px]" />
                </Link>
              </DockIcon>
            );
          })}

          <div className="w-[2px] h-[60%] bg-white/10 mx-2 rounded-full" />

          {/* Language Switcher Dock Item */}
          <DockIcon>
            <button
              onClick={toggleLanguage}
              title={language === "es" ? "Switch to English" : "Cambiar a Español"}
              className="flex items-center justify-center w-full h-full transition-colors bg-transparent border-none cursor-pointer text-gray-400 hover:text-white font-bold text-xs"
            >
              <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] tracking-wider text-[#6FAF3A]">
                {language.toUpperCase()}
              </span>
            </button>
          </DockIcon>

          {session && (
            <>
              <DockIcon>
                <Link
                  href="/settings"
                  title={t("nav.settings")}
                  className="flex items-center justify-center w-full h-full rounded-full overflow-hidden"
                >
                  <img
                    src={
                      session.user?.image ||
                      `https://ui-avatars.com/api/?name=${session.user?.name}`
                    }
                    alt="Avatar"
                    className="w-full h-full object-cover rounded-full border border-white/10 hover:border-white/30 transition-colors"
                  />
                </Link>
              </DockIcon>

              <DockIcon>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  title={t("nav.logout")}
                  className="flex items-center justify-center w-full h-full transition-colors bg-transparent border-none cursor-pointer text-red-400 hover:text-red-500"
                >
                  <LogOut className="w-full h-full max-w-[28px] max-h-[28px]" />
                </button>
              </DockIcon>
            </>
          )}
        </Dock>
      </div>
    </div>
  );
}
