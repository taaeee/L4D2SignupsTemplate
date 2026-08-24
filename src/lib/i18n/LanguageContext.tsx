"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Language, TranslationParams } from "./types";
import { es } from "./es";
import { en } from "./en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
  isLoaded: boolean;
}

const dictionaries = {
  es,
  en,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "app_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "es") {
        setLanguageState(stored);
      } else {
        // Spanish is default as requested
        setLanguageState("es");
      }
    } catch {
      // localStorage disabled or unavailable
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore
    }
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams): string => {
      const keys = key.split(".");
      
      // 1. Try finding key in current language dictionary
      let current: any = dictionaries[language];
      for (const k of keys) {
        if (current && typeof current === "object" && k in current) {
          current = current[k];
        } else {
          current = undefined;
          break;
        }
      }

      // 2. Fallback to Spanish if not found
      if (current === undefined) {
        let fallback: any = dictionaries.es;
        for (const k of keys) {
          if (fallback && typeof fallback === "object" && k in fallback) {
            fallback = fallback[k];
          } else {
            fallback = undefined;
            break;
          }
        }
        current = fallback;
      }

      // 3. Fallback to the key itself if not found anywhere
      if (typeof current !== "string") {
        return key;
      }

      // 4. Perform parameter interpolation: {varName} -> value
      if (params) {
        let result = current;
        for (const [pKey, pVal] of Object.entries(params)) {
          if (pVal !== undefined && pVal !== null) {
            result = result.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
          }
        }
        return result;
      }

      return current;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isLoaded,
    }),
    [language, setLanguage, t, isLoaded]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return {
    t: context.t,
    language: context.language,
    setLanguage: context.setLanguage,
    isLoaded: context.isLoaded,
  };
}
