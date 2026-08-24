"use client";

import React, { useEffect } from "react";
import LoginButton from "@/components/LoginButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useTranslation } from "@/lib/i18n";
import {
  Link as LinkIcon,
  Trophy,
  Settings,
  Users,
  Gamepad2,
  ShieldCheck,
  AlignEndHorizontal
} from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (session?.user?.id) {
      router.push("/torneos");
    }
  }, [session, router]);

  if (status === "loading" || session) {
    return (
      <LoadingSpinner fullHeight={true} />
    );
  }

  return (
    <div
      className="container"
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.5rem 0",
          marginBottom: "3rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
          <span className="text-gradient">{t("landing.title_prefix")}</span> {t("landing.title_suffix")}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <LanguageSwitcher />
          <LoginButton />
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <section
          style={{
            textAlign: "center",
            marginBottom: "5rem",
            marginTop: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "3rem",
              marginBottom: "1.5rem",
              lineHeight: 1.2,
            }}
          >
            {t("landing.hero_title_1")} <br /> {t("landing.hero_title_2")}{" "}
            <span className="text-gradient">{t("landing.hero_title_highlight")}</span>
          </h2>
          <p
            className="text-muted"
            style={{
              fontSize: "1.2rem",
              maxWidth: "600px",
              margin: "0 auto 2.5rem",
            }}
          >
            {t("landing.hero_desc")}
          </p>
          <button
            className="btn btn-primary"
            style={{
              fontSize: "1.1rem",
              padding: "0.8rem 2rem",
              borderRadius: "100px",
            }}
            onClick={() => router.push("/login")}
          >
            {t("landing.start_now")}
          </button>
        </section>

        <section id="como-funciona" style={{ marginBottom: "5rem" }}>
          <h3
            style={{
              textAlign: "center",
              fontSize: "2.5rem",
              marginBottom: "4rem",
            }}
          >
            {t("landing.how_it_works")}
          </h3>

          {/* ORGANIZADOR */}
          <div style={{ marginBottom: "5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", justifyContent: "center" }}>
              <Trophy size={32} color="var(--primary)" />
              <h4 style={{ fontSize: "1.8rem", margin: 0 }}>{t("landing.for_organizers")}</h4>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "2rem",
              }}
            >
              <div
                className="card hover-lift"
                style={{
                  textAlign: "center",
                  padding: "2.5rem 2rem",
                  borderTop: "3px solid var(--primary)",
                }}
              >
                <div
                  style={{
                    background: "rgba(255, 60, 60, 0.1)",
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <Settings size={32} color="var(--primary)" />
                </div>
                <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                  {t("landing.org_step1_title")}
                </h4>
                <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                  {t("landing.org_step1_desc")}
                </p>
              </div>

              <div
                className="card hover-lift"
                style={{
                  textAlign: "center",
                  padding: "2.5rem 2rem",
                  borderTop: "3px solid var(--primary)",
                }}
              >
                <div
                  style={{
                    background: "rgba(255, 60, 60, 0.1)",
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <LinkIcon size={32} color="var(--primary)" />
                </div>
                <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                  {t("landing.org_step2_title")}
                </h4>
                <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                  {t("landing.org_step2_desc")}
                </p>
              </div>

              <div
                className="card hover-lift"
                style={{
                  textAlign: "center",
                  padding: "2.5rem 2rem",
                  borderTop: "3px solid var(--primary)",
                }}
              >
                <div
                  style={{
                    background: "rgba(255, 60, 60, 0.1)",
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <AlignEndHorizontal size={32} color="var(--primary)" />
                </div>
                <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                  {t("landing.org_step3_title")}
                </h4>
                <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                  {t("landing.org_step3_desc")}
                </p>
              </div>
            </div>
          </div>

          {/* PARTICIPANTE */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", justifyContent: "center" }}>
              <Gamepad2 size={32} color="var(--success)" />
              <h4 style={{ fontSize: "1.8rem", margin: 0 }}>{t("landing.for_participants")}</h4>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "2rem",
              }}
            >
              <div
                className="card hover-lift"
                style={{
                  textAlign: "center",
                  padding: "2.5rem 2rem",
                  borderTop: "3px solid var(--success)",
                }}
              >
                <div
                  style={{
                    background: "rgba(34, 197, 94, 0.1)",
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <ShieldCheck size={32} color="var(--success)" />
                </div>
                <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                  {t("landing.part_step1_title")}
                </h4>
                <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                  {t("landing.part_step1_desc")}
                </p>
              </div>

              <div
                className="card hover-lift"
                style={{
                  textAlign: "center",
                  padding: "2.5rem 2rem",
                  borderTop: "3px solid var(--success)",
                }}
              >
                <div
                  style={{
                    background: "rgba(34, 197, 94, 0.1)",
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <Users size={32} color="var(--success)" />
                </div>
                <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                  {t("landing.part_step2_title")}
                </h4>
                <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                  {t("landing.part_step2_desc")}
                </p>
              </div>

              <div
                className="card hover-lift"
                style={{
                  textAlign: "center",
                  padding: "2.5rem 2rem",
                  borderTop: "3px solid var(--success)",
                }}
              >
                <div
                  style={{
                    background: "rgba(34, 197, 94, 0.1)",
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <Trophy size={32} color="var(--success)" />
                </div>
                <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                  {t("landing.part_step3_title")}
                </h4>
                <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                  {t("landing.part_step3_desc")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        style={{
          textAlign: "center",
          marginTop: "4rem",
          paddingBottom: "2rem",
        }}
      >
        <p className="text-muted text-sm">{t("common.powered_by")}</p>
      </footer>
    </div>
  );
}
