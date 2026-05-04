"use client";

import React, { useEffect, useState } from "react";
import TemplateBuilder from "@/components/TemplateBuilder";
import TemplateFiller from "@/components/TemplateFiller";
import LZString from "lz-string";

export default function Home() {
  const [template, setTemplate] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decoded = LZString.decompressFromEncodedURIComponent(hash);
        if (decoded) {
          const parsed = JSON.parse(decoded);
          setTemplate(parsed);
        }
      } catch (err) {
        console.error("Failed to parse template from URL", err);
      }
    }
    setIsLoaded(true);

    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (!newHash) {
        setTemplate(null);
      } else {
        try {
          const decoded = LZString.decompressFromEncodedURIComponent(newHash);
          if (decoded) {
            setTemplate(JSON.parse(decoded));
          }
        } catch (err) {}
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (!isLoaded)
    return (
      <div
        className="container"
        style={{ textAlign: "center", marginTop: "10vh" }}
      >
        Loading...
      </div>
    );

  return (
    <div className="container">
      <header style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
          <span className="text-gradient">L4D2</span> Tournament Signups
        </h1>
        <p className="text-muted">
          {template
            ? "Fill out the registration format below."
            : "Create dynamic registration templates and share them instantly."}
        </p>

        {template && (
          <button
            className="btn btn-secondary mt-4"
            onClick={() => {
              window.location.hash = "";
            }}
          >
            Create Your Own Template
          </button>
        )}
      </header>

      <main>
        {template ? (
          <TemplateFiller template={template} />
        ) : (
          <TemplateBuilder />
        )}
      </main>

      <footer
        style={{
          textAlign: "center",
          marginTop: "4rem",
          paddingBottom: "2rem",
        }}
      >
        <p className="text-muted text-sm">Powered by taeyong</p>
      </footer>
    </div>
  );
}
