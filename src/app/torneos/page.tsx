"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoginButton from "@/components/LoginButton";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useTranslation } from "@/lib/i18n";
import {
  Copy,
  Trophy,
  Settings,
  Users,
  Gamepad2,
  ShieldCheck,
  AlignEndHorizontal
} from "lucide-react";

import { toast } from "sonner";

let cachedDashboardData: any = null;

export default function TorneosDashboard() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState(cachedDashboardData?.tournaments || []);
  const [publicTournaments, setPublicTournaments] = useState(cachedDashboardData?.publicTournaments || []);
  const [myTeams, setMyTeams] = useState(cachedDashboardData?.myTeams || []);
  const [activeTab, setActiveTab] = useState("explorar");
  const [searchExplore, setSearchExplore] = useState("");
  const [searchTournaments, setSearchTournaments] = useState("");
  const [searchRegistrations, setSearchRegistrations] = useState("");
  const [isLoading, setIsLoading] = useState(!cachedDashboardData);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (session?.user?.id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, status]);

  const fetchData = async () => {
    if (!cachedDashboardData) setIsLoading(true);

    // Fetch Tournaments (created)
    const { data: createdTournaments, error: error1 } = await supabase
      .from("tournaments")
      .select("*, teams(status)")
      .eq("creator_id", session?.user?.id as string)
      .order("created_at", { ascending: false });

    // Fetch Tournaments (moderated)
    const { data: moderatedTournaments, error: error2 } = await supabase
      .from("tournaments")
      .select("*, teams(status)")
      .contains("moderators", JSON.stringify([session!.user!.id as string]))
      .order("created_at", { ascending: false });

    let uniqueTournaments: any[] = [];
    if (!error1 && !error2) {
      // Combine and remove duplicates
      const allTournaments = [
        ...(createdTournaments || []),
        ...(moderatedTournaments || []),
      ];
      uniqueTournaments = Array.from(
        new Map(allTournaments.map((t) => [t.id, t])).values()
      );
      uniqueTournaments.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTournaments(uniqueTournaments);
    } else {
      console.error("Error fetching tournaments:", error1 || error2);
    }

    // Fetch User's Teams
    const { data: teamsData, error: error3 } = await supabase
      .from("teams")
      .select("*, tournaments(name, status, logo_url, template_json)")
      .eq("creator_id", session?.user?.id as string)
      .order("created_at", { ascending: false });

    if (!error3 && teamsData) {
      setMyTeams(teamsData);
    } else {
      console.error("Error fetching teams:", error3);
    }

    // Fetch Public Tournaments
    const { data: publicTData, error: error4 } = await supabase
      .from("tournaments")
      .select("*, teams(status)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error4 && publicTData) {
      setPublicTournaments(
        publicTData.filter((t: any) => !(t.template_json as any)?.isPrivate)
      );
    } else {
      console.error("Error fetching public tournaments:", error4);
    }

    cachedDashboardData = {
      tournaments: uniqueTournaments,
      myTeams: teamsData || [],
      publicTournaments: publicTData ? publicTData.filter((t: any) => !(t.template_json as any)?.isPrivate) : [],
    };

    setIsLoading(false);
  };

  const copyToClipboard = () => {
    if (session?.user?.id) {
      navigator.clipboard.writeText(session.user.id);
      toast.success(t("common.copied_to_clipboard"));
    }
  };

  if ((status === "loading" || isLoading) && !cachedDashboardData) {
    return (
      <LoadingSpinner fullHeight={true} />
    );
  }

  if (!session) return null;

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
          <span className="text-gradient">{t("dashboard.title")}</span>
        </h1>
        <LoginButton />
      </header>

      <main style={{ flex: 1 }}>
        {/* User Profile Card */}
        <div
          className="card"
          style={{
            marginBottom: "3rem",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 0.5rem 0" }}>
              {t("dashboard.hello")}, {session.user.name}
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span className="text-muted">
                {t("dashboard.your_user_id")}
              </span>
              <code
                style={{
                  background: "rgba(0,0,0,0.2)",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                }}
              >
                {session.user.id}
              </code>
              <button
                className="btn-icon"
                onClick={copyToClipboard}
                title={t("dashboard.copy_id")}
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button
              className="btn btn-secondary text-sm"
              onClick={() => router.push("/settings")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.2rem",
              }}
            >
              <Settings size={16} /> {t("dashboard.account_settings")}
            </button>
          </div>
        </div>

        <div className="tab-container">
          <button
            onClick={() => setActiveTab("explorar")}
            className={`tab-btn ${activeTab === "explorar" ? "active" : ""}`}
          >
            {t("dashboard.tab_explore")}
          </button>
          <button
            onClick={() => setActiveTab("torneos")}
            className={`tab-btn ${activeTab === "torneos" ? "active" : ""}`}
          >
            {t("dashboard.tab_my_tournaments")}
          </button>
          <button
            onClick={() => setActiveTab("inscripciones")}
            className={`tab-btn ${activeTab === "inscripciones" ? "active" : ""}`}
          >
            {t("dashboard.tab_my_registrations")}
          </button>
        </div>

        {activeTab === "explorar" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h2 style={{ margin: 0 }}>{t("dashboard.public_tournaments")}</h2>
              <input
                type="text"
                className="input-base"
                placeholder={t("dashboard.search_public")}
                value={searchExplore}
                onChange={(e) => setSearchExplore(e.target.value)}
                style={{ width: "100%", maxWidth: "300px" }}
              />
            </div>

            {publicTournaments.filter((tItem: any) => tItem.name.toLowerCase().includes(searchExplore.toLowerCase())).length === 0 ? (
              <div
                className="card"
                style={{ textAlign: "center", padding: "3rem" }}
              >
                <p className="text-muted">
                  {t("dashboard.no_public_tournaments")}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(300px, 1fr))",
                }}
              >
                {publicTournaments.filter((tItem: any) => tItem.name.toLowerCase().includes(searchExplore.toLowerCase())).map((tItem: any) => (
                  <div
                    key={tItem.id}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "center",
                      }}
                    >
                      {tItem.logo_url || tItem.template_json?.logo_url ? (
                        <img
                          src={tItem.logo_url || tItem.template_json.logo_url}
                          alt="Logo"
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "8px",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "8px",
                            background: "rgba(255,255,255,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trophy size={24} color="var(--primary)" />
                        </div>
                      )}
                      <h3 style={{ margin: 0 }}>{tItem.name}</h3>
                    </div>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      {tItem.description || t("dashboard.no_description")}
                    </p>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      <strong>{t("common.status")}:</strong>{" "}
                      <span
                        className={
                          tItem.status === "locked"
                            ? "text-danger"
                            : "text-success"
                        }
                      >
                        {tItem.status === "locked" ? t("common.closed") : t("common.open")}
                      </span>
                    </p>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      <strong>{t("common.slots")}:</strong>{" "}
                      {tItem.teams?.filter((team: any) => team.status === "accepted").length || 0} / {tItem.max_teams || "?"}
                    </p>
                    <div
                      style={{
                        marginTop: "auto",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => router.push(`/tournament/${tItem.id}`)}
                      >
                        {t("common.view_details")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "torneos" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h2 style={{ margin: 0 }}>{t("dashboard.tab_my_tournaments")}</h2>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
                <input
                  type="text"
                  className="input-base"
                  placeholder={t("dashboard.search_tournaments")}
                  value={searchTournaments}
                  onChange={(e) => setSearchTournaments(e.target.value)}
                  style={{ width: "100%", maxWidth: "300px" }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => router.push("/tournament/create")}
                >
                  {t("dashboard.create_new_tournament")}
                </button>
              </div>
            </div>

            {tournaments.filter((tItem: any) => tItem.name.toLowerCase().includes(searchTournaments.toLowerCase())).length === 0 ? (
              <div
                className="card"
                style={{ textAlign: "center", padding: "3rem" }}
              >
                <p className="text-muted">
                  {t("dashboard.no_my_tournaments")}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(300px, 1fr))",
                }}
              >
                {tournaments.filter((tItem: any) => tItem.name.toLowerCase().includes(searchTournaments.toLowerCase())).map((tItem: any) => (
                  <div
                    key={tItem.id}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "center",
                      }}
                    >
                      {tItem.logo_url || tItem.template_json?.logo_url ? (
                        <img
                          src={tItem.logo_url || tItem.template_json.logo_url}
                          alt="Logo"
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "8px",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "8px",
                            background: "rgba(255,255,255,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trophy size={24} color="var(--primary)" />
                        </div>
                      )}
                      <h3 style={{ margin: 0 }}>{tItem.name}</h3>
                    </div>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      {tItem.description || t("dashboard.no_description")}
                    </p>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      <strong>{t("dashboard.accepted_teams")}</strong> {tItem.teams?.filter((team: any) => team.status === "accepted").length || 0} / {tItem.max_teams || "?"}
                    </p>
                    <div
                      style={{
                        marginTop: "auto",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => router.push(`/tournament/${tItem.id}`)}
                      >
                        {t("common.manage")}
                      </button>
                      <button
                        className="btn btn-secondary btn-icon"
                        title={t("tournament_detail.edit_tournament")}
                        onClick={() =>
                          router.push(`/tournament/${tItem.id}/edit`)
                        }
                        style={{
                          padding: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Settings size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "inscripciones" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h2 style={{ margin: 0 }}>{t("dashboard.registered_teams")}</h2>
              <input
                type="text"
                className="input-base"
                placeholder={t("dashboard.search_registrations")}
                value={searchRegistrations}
                onChange={(e) => setSearchRegistrations(e.target.value)}
                style={{ width: "100%", maxWidth: "300px" }}
              />
            </div>

            {myTeams.filter((team: any) => team.name.toLowerCase().includes(searchRegistrations.toLowerCase()) || team.tournaments?.name.toLowerCase().includes(searchRegistrations.toLowerCase())).length === 0 ? (
              <div
                className="card"
                style={{ textAlign: "center", padding: "3rem" }}
              >
                <p className="text-muted">
                  {t("dashboard.no_my_registrations")}
                </p>
              </div>
            ) : (
              <div className="my-registrations-grid">
                {myTeams.filter((team: any) => team.name.toLowerCase().includes(searchRegistrations.toLowerCase()) || team.tournaments?.name.toLowerCase().includes(searchRegistrations.toLowerCase())).map((team: any) => {
                  const isAccepted = team.status === "accepted";
                  const isLocked = team.tournaments?.status === "locked";

                  return (
                    <div
                      key={team.id}
                      className="card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        position: "relative",
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          flexWrap: "wrap",
                          minHeight: "2.2rem",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            wordBreak: "break-word",
                            color: "var(--text-main)",
                            fontSize: "1.15rem",
                            lineHeight: "1.3",
                          }}
                          title={team.name}
                        >
                          {team.name}
                        </h3>
                        {/* Badge Status */}
                        <span
                          style={{
                            padding: "0.2rem 0.65rem",
                            borderRadius: "100px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            background: isAccepted
                              ? "rgba(74, 222, 128, 0.1)"
                              : "rgba(250, 204, 21, 0.1)",
                            color: isAccepted
                              ? "var(--success)"
                              : "var(--warning)",
                            border: `1px solid ${isAccepted ? "var(--success)" : "var(--warning)"
                              }`,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {isAccepted ? t("common.accepted") : t("common.pending")}
                        </span>
                      </div>

                      <Link
                        href={`/tournament/${team.tournament_id}`}
                        className="tournament-link-badge"
                        style={{
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          height: "56px",
                          boxSizing: "border-box",
                          textDecoration: "none",
                          color: "inherit",
                          cursor: "pointer",
                        }}
                        title={`Ir al torneo: ${team.tournaments?.name || ""}`}
                      >
                        <div
                          style={{
                            background: "rgba(74, 222, 128, 0.1)",
                            padding: (team.tournaments?.logo_url || team.tournaments?.template_json?.logo_url) ? "0" : "0.5rem",
                            borderRadius: "6px",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            flexShrink: 0,
                          }}
                        >
                          {(team.tournaments?.logo_url || team.tournaments?.template_json?.logo_url) ? (
                            <img src={team.tournaments.logo_url || team.tournaments.template_json.logo_url} alt="Tournament Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <Trophy size={16} color="var(--primary)" />
                          )}
                        </div>
                        <div
                          style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}
                        >
                          <span className="text-xs text-muted" style={{ textDecoration: "none", lineHeight: 1.2 }}>
                            {t("dashboard.registered_tournament")}
                          </span>
                          <span
                            style={{
                              fontWeight: "bold",
                              color: "var(--text-main)",
                              fontSize: "0.95rem",
                              textDecoration: "none",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              lineHeight: 1.3,
                            }}
                          >
                            {team.tournaments?.name || t("common.unknown")}
                          </span>
                        </div>
                      </Link>

                      {isLocked && (
                        <p
                          className="text-danger text-sm"
                          style={{ margin: 0, fontWeight: "bold" }}
                        >
                          {t("dashboard.tournament_locked_badge")}
                        </p>
                      )}

                      <div
                        style={{
                          marginTop: "auto",
                          display: "flex",
                          gap: "0.5rem",
                          paddingTop: "0.25rem",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: "100%", textDecoration: "none" }}
                          onClick={() => {
                            router.push(
                              `/tournament/${team.tournament_id}/team/${team.id}`
                            );
                          }}
                        >
                          {t("dashboard.view_team")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
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
