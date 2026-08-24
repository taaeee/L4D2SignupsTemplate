"use client";

import React, { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmModal from "@/components/ConfirmModal";
import { normalizeLanguages, MAIN_CASTER_LANGUAGES } from "@/lib/language-helper";
import { setCachedCasterStatus, clearCasterStatusCache } from "@/lib/useCasterStatus";
import {
  Search,
  User,
  Lock,
  KeyRound,
  LinkIcon,
  Unlink,
  Tv,
  ShieldCheck,
  Trash2,
  LogOut,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Radio,
  Save,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  ArrowLeft,
  Send,
  Plus,
  Swords,
  AlertCircle,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { isSystemAdmin } from "@/lib/admin";
import { useTranslation } from "@/lib/i18n";

// Twitch SVG Icon
const TwitchIcon = ({ size = 18, className = "", color, style }: { size?: number; className?: string; color?: string; style?: React.CSSProperties }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color || "currentColor"}
    className={className}
    style={style}
  >
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
  </svg>
);

// Discord SVG Icon
const DiscordIcon = ({ size = 18, className = "", color, style }: { size?: number; className?: string; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 127.14 96.36" fill={color || "currentColor"} className={className} style={style}>
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.7,77.7,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.09,53,91.04,65.69,84.69,65.69Z" />
  </svg>
);

// Steam SVG Icon
const SteamIcon = ({ size = 18, className = "", color, style }: { size?: number; className?: string; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"} className={className} style={style}>
    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.811c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 14.819C1.675 20.05 6.377 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12zM7.544 14.832l-.08.033c-.347.142-.647.375-.87.671l-.105.139-2.072-.857c.433-.923 1.22-1.637 2.193-1.986.326.685.748 1.39 1.434 2.003v-.003zm4.414-5.922c0-1.895 1.542-3.438 3.438-3.438 1.895 0 3.438 1.543 3.438 3.438 0 1.896-1.543 3.438-3.438 3.438-1.896 0-3.438-1.542-3.438-3.438zm5.794 0c0-1.3-1.055-2.355-2.356-2.355-1.3 0-2.355 1.055-2.355 2.355 0 1.3 1.055 2.355 2.355 2.355 1.301 0 2.356-1.055 2.356-2.355zm-8.835 7.422c-.939 0-1.701-.762-1.701-1.702 0-.342.102-.661.277-.928l2.259.933c-.114.945-.443 1.697-.835 1.697z" />
  </svg>
);

// YouTube SVG Icon
const YoutubeIcon = ({ size = 18, className = "", color, style }: { size?: number; className?: string; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"} className={className} style={style}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// Kick SVG Icon
const KickIcon = ({ size = 18, className = "", color, style }: { size?: number; className?: string; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"} className={className} style={style}>
    <path d="M3 3h6v5.5l4-5.5h7l-6.5 8.5L20 21h-7l-4-6v6H3V3z" />
  </svg>
);

// Google SVG Icon
const GoogleIcon = ({ size = 18, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

// Helper to format YouTube URLs properly
const formatYoutubeUrl = (channelOrUrl?: string | null) => {
  if (!channelOrUrl) return "https://youtube.com";
  const trimmed = channelOrUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("@")) {
    return `https://www.youtube.com/${trimmed}`;
  }
  if (trimmed.startsWith("UC") && trimmed.length >= 20) {
    return `https://www.youtube.com/channel/${trimmed}`;
  }
  return `https://www.youtube.com/@${trimmed}`;
};

let cachedSettingsData: {
  hasSteamLinked: boolean;
  hasDiscordLinked: boolean;
  hasTwitchLinked: boolean;
  hasKickLinked: boolean;
  hasGoogleLinked: boolean;
  steamInfo: any;
  twitchInfo: any;
  kickInfo: any;
  googleInfo: any;
  primaryStreamingPlatform: "twitch" | "kick" | "youtube";
  casterApp?: any;
  casterProfile?: any;
  isCaster?: boolean;
} | null = null;

const extractPlatformUsername = (channelOrUrl?: string | null) => {
  if (!channelOrUrl) return "";
  let clean = channelOrUrl.trim();
  clean = clean.replace(/^https?:\/\//i, "");
  clean = clean.replace(/^www\./i, "");
  clean = clean.replace(/^(twitch\.tv|kick\.com|youtube\.com|youtu\.be)\//i, "");
  clean = clean.replace(/^(c\/|user\/|channel\/)/i, "");
  clean = clean.split("/")[0].split("?")[0];
  return clean || channelOrUrl;
};

export default function SettingsPage() {
  const { t, language, setLanguage } = useTranslation();
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Navigation & Search State
  const [activeTab, setActiveTab] = useState<"account" | "connections" | "caster" | "admin">("account");
  const [searchQuery, setSearchQuery] = useState("");

  // Accounts state
  const [hasSteamLinked, setHasSteamLinked] = useState(cachedSettingsData?.hasSteamLinked || false);
  const [hasDiscordLinked, setHasDiscordLinked] = useState(cachedSettingsData?.hasDiscordLinked || false);
  const [hasTwitchLinked, setHasTwitchLinked] = useState(cachedSettingsData?.hasTwitchLinked || false);
  const [hasKickLinked, setHasKickLinked] = useState(cachedSettingsData?.hasKickLinked || false);
  const [hasGoogleLinked, setHasGoogleLinked] = useState(cachedSettingsData?.hasGoogleLinked || false);
  const [steamInfo, setSteamInfo] = useState<any>(cachedSettingsData?.steamInfo || null);
  const [twitchInfo, setTwitchInfo] = useState<any>(cachedSettingsData?.twitchInfo || null);
  const [kickInfo, setKickInfo] = useState<any>(cachedSettingsData?.kickInfo || null);
  const [googleInfo, setGoogleInfo] = useState<any>(cachedSettingsData?.googleInfo || null);
  const [primaryStreamingPlatform, setPrimaryStreamingPlatform] = useState<"twitch" | "kick" | "youtube">(
    cachedSettingsData?.primaryStreamingPlatform || "twitch"
  );
  const [isLoading, setIsLoading] = useState(!cachedSettingsData);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unlinkProvider, setUnlinkProvider] = useState<string>("steam");

  // Modals State
  const [showDeleteCasterModal, setShowDeleteCasterModal] = useState(false);
  const [isDeletingCaster, setIsDeletingCaster] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Profile Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempEmail, setTempEmail] = useState("");
  const [revealEmail, setRevealEmail] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Caster Application State
  const [casterApp, setCasterApp] = useState<any>(null);
  const [casterProfile, setCasterProfile] = useState<any>(null);
  const [isCaster, setIsCaster] = useState(false);
  const [showCasterModal, setShowCasterModal] = useState(false);
  const [selectedPrimaryPlatform, setSelectedPrimaryPlatform] = useState<"twitch" | "kick" | "youtube">("twitch");
  const [casterAlias, setCasterAlias] = useState("");
  const [casterBio, setCasterBio] = useState("");
  const [casterTwitch, setCasterTwitch] = useState("");
  const [casterKick, setCasterKick] = useState("");
  const [casterYoutube, setCasterYoutube] = useState("");
  const [casterLanguages, setCasterLanguages] = useState("Español");
  const [submittingCasterApp, setSubmittingCasterApp] = useState(false);

  // Admin Caster Applications State (Strictly for System Admin)
  const [adminApplications, setAdminApplications] = useState<any[]>([]);
  const isAdmin = isSystemAdmin(session?.user);
  const [adminStatusFilter, setAdminStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const filteredAdminApps = adminApplications.filter((a) =>
    adminStatusFilter === "all" ? true : a.status === adminStatusFilter
  );

  // ESC key listener to close settings like Discord
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCasterModal) {
          setShowCasterModal(false);
        } else if (showConfirmModal) {
          setShowConfirmModal(false);
        } else if (showDeleteCasterModal) {
          setShowDeleteCasterModal(false);
        } else if (showDeleteAccountModal) {
          setShowDeleteAccountModal(false);
        } else if (isEditingUsername) {
          setIsEditingUsername(false);
        } else if (isEditingEmail) {
          setIsEditingEmail(false);
        } else {
          router.back();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    showCasterModal,
    showConfirmModal,
    showDeleteCasterModal,
    showDeleteAccountModal,
    isEditingUsername,
    isEditingEmail,
    router,
  ]);

  // URL Hash detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (["account", "profile", "security", "connections", "caster"].includes(hash)) {
        setActiveTab(hash === "profile" || hash === "security" ? "account" : (hash as any));
      } else if (hash === "admin" && isSystemAdmin(session?.user)) {
        setActiveTab("admin");
      }
    }
  }, [session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchAccounts();
      fetchCasterStatus();
      if (isSystemAdmin(session?.user)) {
        fetchAdminApplications();
      } else {
        setAdminApplications([]);
      }
      if (session?.user) {
        setName(session.user.name || "");
        setEmail(session.user.email || "");
        setTempName(session.user.name || "");
        setTempEmail(session.user.email || "");
      }
    }
  }, [status, router, session]);

  const fetchAccounts = async () => {
    if (!cachedSettingsData) setIsLoading(true);
    try {
      const res = await fetch("/api/user/accounts");
      const accountData = await res.json();
      if (accountData.accounts) {
        const steamAccount = accountData.accounts.find((acc: any) => acc.provider === "steam");
        const discordAccount = accountData.accounts.find((acc: any) => acc.provider === "discord");
        const twitchAccount = accountData.accounts.find((acc: any) => acc.provider === "twitch");
        const kickAccount = accountData.accounts.find((acc: any) => acc.provider === "kick");
        const googleAccount = accountData.accounts.find((acc: any) => acc.provider === "google");

        const hasDiscord = Boolean(discordAccount);
        const hasTwitch = Boolean(twitchAccount);
        const hasKick = Boolean(kickAccount);
        const hasGoogle = Boolean(googleAccount);
        const hasSteam = Boolean(steamAccount);

        setHasDiscordLinked(hasDiscord);
        setHasTwitchLinked(hasTwitch);
        setHasKickLinked(hasKick);
        setHasGoogleLinked(hasGoogle);
        setHasSteamLinked(hasSteam);

        let newTwitchInfo = null;
        if (twitchAccount) {
          newTwitchInfo = {
            accountId: twitchAccount.providerAccountId,
            username: twitchAccount.username || "",
            displayName: twitchAccount.displayName || "",
            avatar: twitchAccount.avatar || null,
          };
          setTwitchInfo(newTwitchInfo);
        } else {
          setTwitchInfo(null);
        }

        let newKickInfo = null;
        if (kickAccount) {
          newKickInfo = {
            accountId: kickAccount.providerAccountId,
            username: kickAccount.username || kickAccount.providerAccountId,
          };
          setKickInfo(newKickInfo);
        } else {
          setKickInfo(null);
        }

        let newGoogleInfo = null;
        if (googleAccount) {
          newGoogleInfo = {
            accountId: googleAccount.providerAccountId,
            username: googleAccount.username || session?.user?.name || "Google User",
          };
          setGoogleInfo(newGoogleInfo);
        } else {
          setGoogleInfo(null);
        }

        let newSteamInfo = null;
        if (steamAccount) {
          try {
            const steamRes = await fetch(`/api/steam/player-stats?steamId=${steamAccount.providerAccountId}`);
            const steamData = await steamRes.json();
            if (!steamData.error) {
              newSteamInfo = {
                name: steamData.personaname,
                avatar: steamData.avatar,
              };
              setSteamInfo(newSteamInfo);
            }
          } catch (e) {
            console.error("Error fetching steam info", e);
          }
        } else {
          setSteamInfo(null);
        }

        cachedSettingsData = {
          hasSteamLinked: hasSteam,
          hasDiscordLinked: hasDiscord,
          hasTwitchLinked: hasTwitch,
          hasKickLinked: hasKick,
          hasGoogleLinked: hasGoogle,
          steamInfo: newSteamInfo,
          twitchInfo: newTwitchInfo,
          kickInfo: newKickInfo,
          googleInfo: newGoogleInfo,
          primaryStreamingPlatform,
        };
      }
    } catch (e) {
      console.error("Error fetching accounts:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCasterStatus = async () => {
    try {
      const res = await fetch("/api/casters/apply");
      const data = await res.json();
      setCasterApp(data.application || null);
      if (data.application) {
        setCasterAlias(data.application.alias || data.verifiedTwitchAlias || data.verifiedKickAlias || data.verifiedGoogleAlias || "");
        setCasterBio(data.application.bio || "");
        setCasterTwitch(data.application.twitch_channel || data.verifiedTwitchChannel || "");
        setCasterLanguages(normalizeLanguages(data.application.languages || data.caster?.languages).join(", "));
      } else {
        if (data.caster) {
          setCasterLanguages(normalizeLanguages(data.caster.languages).join(", "));
        }
        if (data.verifiedTwitchAlias) {
          setCasterAlias(data.verifiedTwitchAlias);
        } else if (data.verifiedKickAlias) {
          setCasterAlias(data.verifiedKickAlias);
        } else if (data.verifiedGoogleAlias) {
          setCasterAlias(data.verifiedGoogleAlias);
        }

        if (data.verifiedTwitchChannel) {
          setCasterTwitch(data.verifiedTwitchChannel);
        }
        if (data.verifiedKickChannel || data.caster?.kick_channel) {
          setCasterKick(data.verifiedKickChannel || data.caster?.kick_channel || "");
        }
        if (data.caster?.youtube_channel) {
          setCasterYoutube(data.caster?.youtube_channel || "");
        }
      }

      if (data.hasTwitchLinked !== undefined) setHasTwitchLinked(data.hasTwitchLinked);
      if (data.hasKickLinked !== undefined) setHasKickLinked(data.hasKickLinked);
      if (data.hasGoogleLinked !== undefined) setHasGoogleLinked(data.hasGoogleLinked);

      if (data.primaryPlatform) {
        setPrimaryStreamingPlatform(data.primaryPlatform);
        setSelectedPrimaryPlatform(data.primaryPlatform);
      }

      setCasterProfile(data.caster || null);
      setIsCaster(Boolean(data.isCaster || data.caster || data.application?.status === "approved"));
      if (session?.user?.id && data) {
        setCachedCasterStatus(session.user.id, data);
      }
    } catch (e) {
      console.error("Error fetching caster status:", e);
    }
  };

  const fetchAdminApplications = async () => {
    if (!isSystemAdmin(session?.user)) {
      setAdminApplications([]);
      return;
    }

    try {
      const res = await fetch("/api/casters/admin/applications");
      if (res.ok) {
        const data = await res.json();
        setAdminApplications(data.applications || []);
      } else {
        setAdminApplications([]);
      }
    } catch (e) {
      console.error("Error fetching admin applications:", e);
      setAdminApplications([]);
    }
  };

  const handleSaveUsername = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempName.trim() || tempName.trim().length < 2) {
      toast.error("El nombre de usuario debe tener al menos 2 caracteres.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tempName.trim(), email }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar el nombre de usuario.");
      } else {
        toast.success("Nombre de usuario actualizado con éxito.");
        setName(tempName.trim());
        setIsEditingUsername(false);
        await update({ name: tempName.trim(), email });
      }
    } catch (err) {
      toast.error("Error de conexión al guardar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempEmail.trim() || !tempEmail.includes("@")) {
      toast.error("Ingresa un correo electrónico válido.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: tempEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar el correo electrónico.");
      } else {
        toast.success("Correo electrónico actualizado con éxito.");
        setEmail(tempEmail.trim());
        setIsEditingEmail(false);
        await update({ name, email: tempEmail.trim() });
      }
    } catch (err) {
      toast.error("Error de conexión al guardar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al cambiar la contraseña.");
      } else {
        toast.success("Contraseña actualizada con éxito.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordForm(false);
      }
    } catch (err) {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleUnlink = async () => {
    try {
      const res = await fetch(`/api/user/accounts?provider=${unlinkProvider}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Cuenta de ${unlinkProvider.toUpperCase()} desvinculada.`);
        if (unlinkProvider === "steam") {
          setHasSteamLinked(false);
          setSteamInfo(null);
        } else if (unlinkProvider === "discord") {
          setHasDiscordLinked(false);
        } else if (unlinkProvider === "twitch") {
          setHasTwitchLinked(false);
          setTwitchInfo(null);
        } else if (unlinkProvider === "kick") {
          setHasKickLinked(false);
          setKickInfo(null);
        } else if (unlinkProvider === "google") {
          setHasGoogleLinked(false);
          setGoogleInfo(null);
        }
        fetchAccounts();
        fetchCasterStatus();
      } else {
        toast.error(data.error || "Error al desvincular la cuenta.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de red al desvincular.");
    } finally {
      setShowConfirmModal(false);
    }
  };

  const handleSubmitCasterApp = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasAnyStreaming = hasTwitchLinked || hasKickLinked || hasGoogleLinked;
    if (!hasAnyStreaming) {
      toast.error("Debes vincular al menos una cuenta (Twitch, Kick o Google) mediante autenticación.");
      return;
    }

    if (selectedPrimaryPlatform === "twitch" && !hasTwitchLinked) {
      toast.error("Debes vincular tu cuenta de Twitch para seleccionarla como plataforma principal.");
      return;
    }
    if (selectedPrimaryPlatform === "kick" && !hasKickLinked) {
      toast.error("Debes vincular tu cuenta de Kick para seleccionarla como plataforma principal.");
      return;
    }
    if (selectedPrimaryPlatform === "youtube" && !hasGoogleLinked) {
      toast.error("Debes vincular tu cuenta de Google para seleccionarla como plataforma principal.");
      return;
    }

    setSubmittingCasterApp(true);

    const languagesArray = casterLanguages
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/casters/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: casterAlias.trim() || session?.user?.name || "Caster",
          bio: casterBio.trim(),
          twitch_channel: hasTwitchLinked ? (twitchInfo?.username || casterTwitch) : null,
          kick_channel: hasKickLinked ? (kickInfo?.username || casterKick) : null,
          youtube_channel: casterYoutube.trim() || null,
          languages: languagesArray,
          primary_platform: selectedPrimaryPlatform,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al enviar la solicitud.");
      } else {
        toast.success(data.message || "Solicitud enviada para revisión.");
        setCasterApp(data.application);
        setShowCasterModal(false);
        fetchCasterStatus();
        if (isAdmin) {
          fetchAdminApplications();
        }
      }
    } catch (err) {
      toast.error("Error de conexión al enviar la solicitud.");
    } finally {
      setSubmittingCasterApp(false);
    }
  };

  const handleReviewApplication = async (applicationId: string, action: "approve" | "reject" | "revoke") => {
    try {
      const res = await fetch("/api/casters/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al procesar la solicitud.");
      } else {
        toast.success(data.message || (action === "approve" ? "Caster aprobado con éxito." : "Solicitud procesada."));
        fetchAdminApplications();
        fetchCasterStatus();
      }
    } catch (err) {
      toast.error("Error de red al revisar la solicitud.");
    }
  };

  const handleCancelEdit = async () => {
    try {
      const res = await fetch("/api/casters/apply?action=cancel_edit", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Solicitud de cambios cancelada. Tu perfil actual sigue activo.");
        fetchCasterStatus();
        if (isAdmin) fetchAdminApplications();
      } else {
        toast.error(data.error || "No se pudo cancelar la solicitud.");
      }
    } catch (e) {
      toast.error("Error al cancelar la solicitud de edición.");
    }
  };

  const handleCancelApplication = async () => {
    try {
      const res = await fetch("/api/casters/apply?action=cancel_application", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Solicitud de Caster cancelada.");
        fetchCasterStatus();
        if (isAdmin) fetchAdminApplications();
      } else {
        toast.error(data.error || "No se pudo cancelar la solicitud.");
      }
    } catch (e) {
      toast.error("Error al cancelar la solicitud de Caster.");
    }
  };

  const handleDeleteCasterStatus = async () => {
    setIsDeletingCaster(true);
    try {
      const res = await fetch("/api/casters/apply", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Tu estado de Caster Oficial ha sido eliminado.");
        setIsCaster(false);
        setCasterApp(null);
        setCasterProfile(null);
        if (session?.user?.id) {
          clearCasterStatusCache(session.user.id);
        }
      } else {
        toast.error(data.error || "No se pudo eliminar el status de caster.");
      }
    } catch (e) {
      toast.error("Error de red al eliminar status de caster.");
    } finally {
      setIsDeletingCaster(false);
      setShowDeleteCasterModal(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Tu cuenta ha sido eliminada permanentemente.");
        setTimeout(() => {
          signOut({ callbackUrl: "/" });
        }, 1000);
      } else {
        toast.error(data.error || "No se pudo eliminar tu cuenta.");
        setIsDeletingAccount(false);
      }
    } catch (e) {
      toast.error("Error de red al eliminar la cuenta.");
      setIsDeletingAccount(false);
    } finally {
      setShowDeleteAccountModal(false);
    }
  };

  const maskEmail = (emailStr: string) => {
    if (!emailStr) return "";
    const parts = emailStr.split("@");
    if (parts.length < 2) return emailStr;
    const userPart = parts[0];
    const domainPart = parts[1];
    const masked = userPart.length <= 2 ? userPart[0] + "***" : userPart.slice(0, 2) + "*".repeat(Math.max(4, userPart.length - 2));
    return `${masked}@${domainPart}`;
  };

  const handleCopyId = () => {
    if (session?.user?.id) {
      navigator.clipboard.writeText(session.user.id);
      setCopiedId(true);
      toast.success("ID de usuario copiado al portapapeles.");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if ((status === "loading" || isLoading) && !cachedSettingsData) {
    return <LoadingSpinner text="Cargando Ajustes..." fullHeight={true} />;
  }

  if (!session) return null;

  const pendingAdminCount = adminApplications.filter((a) => a.status === "pending").length;

  return (
    <div className="discord-settings-wrapper">
      {/* LEFT SIDEBAR */}
      <aside className="discord-settings-sidebar">
        {/* User Mini Profile Header */}
        <div className="discord-sidebar-profile">
          <div className="discord-sidebar-avatar-wrap">
            <img
              src={session.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user?.name || "User")}`}
              alt={session.user?.name || "User"}
              className="discord-sidebar-avatar"
            />
            <div className="discord-status-dot" />
          </div>
          <div className="discord-sidebar-user-meta">
            <span className="discord-sidebar-username">{session.user?.name || "Usuario"}</span>
            <span className="discord-sidebar-subtext" onClick={() => setActiveTab("account")}>
              Editar Perfil
            </span>
          </div>
        </div>

        {/* Search bar */}
        <div className="discord-search-box">
          <Search size={14} className="discord-search-icon" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="discord-search-input"
          />
        </div>

        {/* NAVIGATION SECTIONS */}
        <nav className="discord-nav-container">
          {/* Section: USER SETTINGS */}
          <div className="discord-nav-section-title">{t("settings.user_settings_category", { defaultValue: "AJUSTES DE USUARIO" })}</div>

          <button
            className={`discord-nav-item ${activeTab === "account" ? "active" : ""}`}
            onClick={() => setActiveTab("account")}
          >
            {activeTab === "account" && <div className="discord-active-indicator" />}
            <User size={18} />
            <span>{t("settings.tab_account")}</span>
          </button>

          <button
            className={`discord-nav-item ${activeTab === "connections" ? "active" : ""}`}
            onClick={() => setActiveTab("connections")}
          >
            {activeTab === "connections" && <div className="discord-active-indicator" />}
            <LinkIcon size={18} />
            <span>{t("settings.tab_connections")}</span>
          </button>

          <button
            className={`discord-nav-item ${activeTab === "caster" ? "active" : ""}`}
            onClick={() => setActiveTab("caster")}
          >
            {activeTab === "caster" && <div className="discord-active-indicator" />}
            <Tv size={18} />
            <span>{t("settings.tab_caster")}</span>
            {isCaster && <div className="discord-pill-dot green" />}
            {casterApp?.status === "pending" && <div className="discord-pill-dot yellow" />}
          </button>

          {/* Section: ADMINISTRATION */}
          {isAdmin && (
            <>
              <div className="discord-nav-divider" />
              <div className="discord-nav-section-title">{t("settings.admin_category", { defaultValue: "ADMINISTRACIÓN" })}</div>

              <button
                className={`discord-nav-item ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => setActiveTab("admin")}
              >
                {activeTab === "admin" && <div className="discord-active-indicator" />}
                <ShieldCheck size={18} />
                <span>{t("settings.tab_admin")}</span>
                {pendingAdminCount > 0 && (
                  <span className="discord-badge alert">{pendingAdminCount}</span>
                )}
              </button>
            </>
          )}

          {/* Section: DANGER ZONE & ACTIONS */}
          <div className="discord-nav-divider" />
          <div className="discord-nav-section-title">{t("settings.account_actions_category", { defaultValue: "ACCIONES DE CUENTA" })}</div>

          <button
            className="discord-nav-item danger"
            onClick={() => setShowDeleteAccountModal(true)}
          >
            <Trash2 size={18} />
            <span>{t("settings.delete_account_btn")}</span>
          </button>

          <button
            className="discord-nav-item danger"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut size={18} />
            <span>{t("nav.sign_out")}</span>
          </button>
        </nav>

        {/* Footer info */}
        <div className="discord-sidebar-footer">
          <span>L4D2 SIGNUPS v2.4.0</span>
          <span>Hecho para la Comunidad</span>
        </div>
      </aside>

      {/* RIGHT CONTENT AREA */}
      <main className="discord-settings-content">
        {/* ESC Button (Top Right Header) */}
        <div className="discord-esc-container">
          <button
            className="discord-esc-btn"
            onClick={() => router.back()}
            title="Cerrar ajustes (ESC)"
          >
            <X size={18} />
          </button>
          <span className="discord-esc-label">ESC</span>
        </div>

        <div className="discord-content-inner">
          {/* TAB 1: MI CUENTA / ACCOUNT INFO */}
          {activeTab === "account" && (
            <div className="discord-tab-pane">
              <h2 className="discord-main-title">{t("settings.tab_account")}</h2>

              {/* Discord Profile Banner Box */}
              <div className="discord-profile-card">
                <div className="discord-profile-banner" />
                <div className="discord-profile-body">
                  <div className="discord-profile-header-row">
                    <div className="discord-profile-avatar-outer">
                      <img
                        src={session.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user?.name || "User")}`}
                        alt={session.user?.name || "Avatar"}
                        className="discord-profile-avatar-large"
                      />
                      <div className="discord-status-dot-large" />
                    </div>

                    <button
                      className="discord-btn-primary"
                      onClick={() => {
                        setIsEditingUsername(true);
                        setTempName(name);
                      }}
                    >
                      {t("settings.edit_profile_btn", { defaultValue: "Editar Perfil" })}
                    </button>
                  </div>

                  <div className="discord-profile-info-header">
                    <h3 className="discord-profile-name">{session.user?.name}</h3>
                  </div>

                  {/* Account Info Inner Box */}
                  <div className="discord-account-info-box">
                    {/* Username Row */}
                    <div className="discord-info-row">
                      <div>
                        <div className="discord-info-label">{t("settings.username_label").toUpperCase()}</div>
                        {isEditingUsername ? (
                          <div className="discord-inline-edit-wrap">
                            <input
                              type="text"
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              className="discord-inline-input"
                              autoFocus
                            />
                            <div className="discord-inline-actions">
                              <button
                                className="discord-btn-small-cancel"
                                onClick={() => setIsEditingUsername(false)}
                                disabled={savingProfile}
                              >
                                {t("common.cancel")}
                              </button>
                              <button
                                className="discord-btn-small-save"
                                onClick={() => handleSaveUsername()}
                                disabled={savingProfile}
                              >
                                {savingProfile ? t("common.saving") : t("common.save")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="discord-info-value">{name}</div>
                        )}
                      </div>
                      {!isEditingUsername && (
                        <button
                          className="discord-btn-edit"
                          onClick={() => {
                            setIsEditingUsername(true);
                            setTempName(name);
                          }}
                        >
                          {t("common.edit")}
                        </button>
                      )}
                    </div>

                    {/* Email Row */}
                    <div className="discord-info-row">
                      <div>
                        <div className="discord-info-label">{t("settings.email_label").toUpperCase()}</div>
                        {isEditingEmail ? (
                          <div className="discord-inline-edit-wrap">
                            <input
                              type="email"
                              value={tempEmail}
                              onChange={(e) => setTempEmail(e.target.value)}
                              className="discord-inline-input"
                              autoFocus
                            />
                            <div className="discord-inline-actions">
                              <button
                                className="discord-btn-small-cancel"
                                onClick={() => setIsEditingEmail(false)}
                                disabled={savingProfile}
                              >
                                {t("common.cancel")}
                              </button>
                              <button
                                className="discord-btn-small-save"
                                onClick={() => handleSaveEmail()}
                                disabled={savingProfile}
                              >
                                {savingProfile ? t("common.saving") : t("common.save")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="discord-info-value">
                            <span>{revealEmail ? email : maskEmail(email)}</span>
                            <button
                              className="discord-reveal-link"
                              onClick={() => setRevealEmail(!revealEmail)}
                            >
                              {revealEmail ? "Ocultar" : "Revelar"}
                            </button>
                          </div>
                        )}
                      </div>
                      {!isEditingEmail && (
                        <button
                          className="discord-btn-edit"
                          onClick={() => {
                            setIsEditingEmail(true);
                            setTempEmail(email);
                          }}
                        >
                          {t("common.edit")}
                        </button>
                      )}
                    </div>

                    {/* User ID Row */}
                    <div className="discord-info-row">
                      <div>
                        <div className="discord-info-label">{t("settings.user_id_label").toUpperCase()}</div>
                        <div className="discord-info-value discord-code-text">
                          {session.user?.id || "N/A"}
                        </div>
                      </div>
                      <button className="discord-btn-edit" onClick={handleCopyId}>
                        {copiedId ? <Check size={14} /> : <Copy size={14} />}
                        <span style={{ marginLeft: "4px" }}>{copiedId ? t("common.copied") : t("common.copy")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Language Preference Setting Box */}
              <div className="discord-section-divider" />
              <h3 className="discord-section-title">{t("settings.language_preference_title")}</h3>

              <div className="discord-card-panel">
                <p className="discord-panel-desc">
                  {t("settings.language_preference_desc")}
                </p>

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => setLanguage("es")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.85rem 1.25rem",
                      borderRadius: "8px",
                      background: language === "es" ? "rgba(111, 175, 58, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      border: language === "es" ? "2px solid var(--primary)" : "1px solid var(--border-light)",
                      color: language === "es" ? "var(--primary)" : "var(--text-main)",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span>🇪🇸</span>
                    <span>{t("settings.spanish_option")}</span>
                    {language === "es" && <Check size={16} color="var(--primary)" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.85rem 1.25rem",
                      borderRadius: "8px",
                      background: language === "en" ? "rgba(111, 175, 58, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      border: language === "en" ? "2px solid var(--primary)" : "1px solid var(--border-light)",
                      color: language === "en" ? "var(--primary)" : "var(--text-main)",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span>🇺🇸</span>
                    <span>{t("settings.english_option")}</span>
                    {language === "en" && <Check size={16} color="var(--primary)" />}
                  </button>
                </div>
              </div>

              {/* Password & Security Quick Card */}
              <div className="discord-section-divider" />
              <h3 className="discord-section-title">{t("settings.change_password_title")}</h3>

              <div className="discord-card-panel">
                <p className="discord-panel-desc">
                  Mantén tu cuenta segura actualizando tu contraseña periódicamente.
                </p>

                {showPasswordForm ? (
                  <form onSubmit={handleChangePassword} className="discord-password-form">
                    <div className="discord-form-group">
                      <label className="discord-form-label">{t("settings.current_password").toUpperCase()}</label>
                      <input
                        type="password"
                        className="discord-input"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Ingresa tu contraseña actual"
                      />
                    </div>

                    <div className="discord-form-group">
                      <label className="discord-form-label">{t("settings.new_password").toUpperCase()}</label>
                      <input
                        type="password"
                        className="discord-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        minLength={8}
                        required
                      />
                    </div>

                    <div className="discord-form-group">
                      <label className="discord-form-label">{t("settings.confirm_new_password").toUpperCase()}</label>
                      <input
                        type="password"
                        className="discord-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite la nueva contraseña"
                        minLength={8}
                        required
                      />
                    </div>

                    <div className="discord-form-actions">
                      <button
                        type="button"
                        className="discord-btn-cancel"
                        onClick={() => setShowPasswordForm(false)}
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="discord-btn-primary"
                      >
                        {savingPassword ? t("settings.updating_password_btn") : t("settings.update_password_btn")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="discord-btn-primary"
                    onClick={() => setShowPasswordForm(true)}
                  >
                    {t("settings.update_password_btn")}
                  </button>
                )}
              </div>

              {/* Danger Zone */}
              <div className="discord-section-divider" />
              <h3 className="discord-section-title danger-text">{t("settings.delete_account_title")}</h3>

              <div className="discord-danger-panel">
                <div>
                  <h4 className="discord-danger-title">{t("settings.delete_account_title")}</h4>
                  <p className="discord-danger-desc">
                    {t("settings.delete_account_desc")}
                  </p>
                </div>
                <button
                  className="discord-btn-danger"
                  onClick={() => setShowDeleteAccountModal(true)}
                  disabled={isDeletingAccount}
                >
                  {t("settings.delete_account_btn")}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CONEXIONES */}
          {activeTab === "connections" && (
            <div className="discord-tab-pane">
              <h2 className="discord-main-title">{t("settings.tab_connections")}</h2>
              <p className="discord-main-desc">
                {t("settings.connected_accounts_desc")}
              </p>

              <div className="discord-connections-grid">
                {/* Steam Card */}
                <div className="discord-connection-item">
                  <div className="discord-connection-left">
                    <div className="discord-conn-icon steam">
                      <SteamIcon size={24} />
                    </div>
                    <div>
                      <div className="discord-conn-name">Steam</div>
                      <div className={`discord-conn-status ${hasSteamLinked ? "connected" : ""}`}>
                        {hasSteamLinked ? `${t("settings.linked_badge")}: ${steamInfo?.name || "Steam User"}` : "No conectado"}
                      </div>
                    </div>
                  </div>

                  {hasSteamLinked ? (
                    <button
                      className="discord-btn-disconnect"
                      onClick={() => {
                        setUnlinkProvider("steam");
                        setShowConfirmModal(true);
                      }}
                    >
                      <Unlink size={16} /> {t("settings.unlink_btn")}
                    </button>
                  ) : (
                    <button className="discord-btn-connect steam-btn" onClick={() => signIn("steam")}>
                      <LinkIcon size={16} /> {t("settings.connect_steam")}
                    </button>
                  )}
                </div>

                {/* Discord Card */}
                <div className="discord-connection-item">
                  <div className="discord-connection-left">
                    <div className="discord-conn-icon discord">
                      <DiscordIcon size={24} />
                    </div>
                    <div>
                      <div className="discord-conn-name">Discord</div>
                      <div className={`discord-conn-status ${hasDiscordLinked ? "connected" : ""}`}>
                        {hasDiscordLinked ? t("settings.linked_badge") : "No conectado"}
                      </div>
                    </div>
                  </div>

                  {hasDiscordLinked ? (
                    <button
                      className="discord-btn-disconnect"
                      onClick={() => {
                        setUnlinkProvider("discord");
                        setShowConfirmModal(true);
                      }}
                    >
                      <Unlink size={16} /> {t("settings.unlink_btn")}
                    </button>
                  ) : (
                    <button className="discord-btn-connect discord-btn" onClick={() => signIn("discord")}>
                      <LinkIcon size={16} /> {t("settings.connect_discord")}
                    </button>
                  )}
                </div>

                {/* Twitch Card */}
                <div className="discord-connection-item">
                  <div className="discord-connection-left">
                    <div className="discord-conn-icon twitch">
                      <TwitchIcon size={24} />
                    </div>
                    <div>
                      <div className="discord-conn-name">Twitch</div>
                      <div className={`discord-conn-status ${hasTwitchLinked ? "connected" : ""}`}>
                        {hasTwitchLinked ? `${t("settings.linked_badge")}: twitch.tv/${twitchInfo?.username || "canal"}` : "No conectado"}
                      </div>
                    </div>
                  </div>

                  {hasTwitchLinked ? (
                    <button
                      className="discord-btn-disconnect"
                      onClick={() => {
                        setUnlinkProvider("twitch");
                        setShowConfirmModal(true);
                      }}
                    >
                      <Unlink size={16} /> Desvincular
                    </button>
                  ) : (
                    <button className="discord-btn-connect twitch-btn" onClick={() => signIn("twitch")}>
                      <LinkIcon size={16} /> Conectar
                    </button>
                  )}
                </div>

                {/* Kick Card */}
                <div className="discord-connection-item">
                  <div className="discord-connection-left">
                    <div
                      className="discord-conn-icon"
                      style={{
                        background: "#53FC18",
                        color: "#000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "10px",
                        width: "42px",
                        height: "42px",
                      }}
                    >
                      <KickIcon size={22} />
                    </div>
                    <div>
                      <div className="discord-conn-name">Kick</div>
                      <div className={`discord-conn-status ${hasKickLinked ? "connected" : ""}`}>
                        {hasKickLinked ? `Conectado: kick.com/${kickInfo?.username || "canal"}` : "No conectado"}
                      </div>
                    </div>
                  </div>

                  {hasKickLinked ? (
                    <button
                      className="discord-btn-disconnect"
                      onClick={() => {
                        setUnlinkProvider("kick");
                        setShowConfirmModal(true);
                      }}
                    >
                      <Unlink size={16} /> Desvincular
                    </button>
                  ) : (
                    <button
                      className="discord-btn-connect"
                      onClick={() => signIn("kick")}
                      style={{
                        background: "rgba(83, 252, 24, 0.15)",
                        border: "1px solid rgba(83, 252, 24, 0.4)",
                        color: "#53FC18",
                      }}
                    >
                      <LinkIcon size={16} /> Conectar
                    </button>
                  )}
                </div>

                {/* Google Card */}
                <div className="discord-connection-item">
                  <div className="discord-connection-left">
                    <div
                      className="discord-conn-icon"
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "10px",
                        width: "42px",
                        height: "42px",
                      }}
                    >
                      <GoogleIcon size={22} />
                    </div>
                    <div>
                      <div className="discord-conn-name">Google</div>
                      <div className={`discord-conn-status ${hasGoogleLinked ? "connected" : ""}`}>
                        {hasGoogleLinked ? `Conectado: ${googleInfo?.username || "Google User"}` : "No conectado"}
                      </div>
                    </div>
                  </div>

                  {hasGoogleLinked ? (
                    <button
                      className="discord-btn-disconnect"
                      onClick={() => {
                        setUnlinkProvider("google");
                        setShowConfirmModal(true);
                      }}
                    >
                      <Unlink size={16} /> Desvincular
                    </button>
                  ) : (
                    <button
                      className="discord-btn-connect"
                      onClick={() => signIn("google")}
                      style={{
                        background: "rgba(66, 133, 244, 0.15)",
                        border: "1px solid rgba(66, 133, 244, 0.4)",
                        color: "#60A5FA",
                      }}
                    >
                      <LinkIcon size={16} /> Conectar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CASTER OFICIAL */}
          {activeTab === "caster" && (
            <div className="discord-tab-pane">
              <div className="discord-caster-header-row">
                <div>
                  <h2 className="discord-main-title">Caster Oficial</h2>
                  <p className="discord-main-desc">
                    Transmite partidas oficiales de torneos de Left 4 Dead 2 en tu canal de streaming.
                  </p>
                </div>

                {isCaster ? (
                  <span className="discord-status-badge approved">
                    <CheckCircle2 size={16} /> Caster Oficial Aprobado
                  </span>
                ) : casterApp?.status === "pending" ? (
                  <span className="discord-status-badge pending">
                    <Clock size={16} /> Solicitud en Revisión
                  </span>
                ) : casterApp?.status === "rejected" ? (
                  <span className="discord-status-badge rejected">
                    <XCircle size={16} /> Solicitud Rechazada
                  </span>
                ) : null}
              </div>

              {isCaster ? (
                <div className="discord-caster-body">
                  {casterApp?.status === "pending" && (
                    <div
                      style={{
                        marginBottom: "1.5rem",
                        padding: "1rem 1.25rem",
                        background: "rgba(250, 204, 21, 0.1)",
                        border: "1px solid rgba(250, 204, 21, 0.3)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <Clock size={20} color="#facc15" style={{ flexShrink: 0 }} />
                        <div>
                          <strong style={{ color: "#facc15", fontSize: "0.9rem" }}>Solicitud de Edición en Revisión</strong>
                          <div className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.15rem" }}>
                            Tu perfil actual sigue activo y visible en torneos mientras moderación revisa los cambios.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="discord-btn-secondary"
                        style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem", whiteSpace: "nowrap" }}
                      >
                        Cancelar Edición
                      </button>
                    </div>
                  )}

                  {casterApp?.reviewer_notes && casterApp?.status !== "pending" && (
                    <div
                      style={{
                        marginBottom: "1.5rem",
                        padding: "1rem 1.25rem",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: "#ef4444" }}>Aviso de Edición:</strong>{" "}
                        <span>{casterApp.reviewer_notes}</span>
                        <div className="text-muted text-xs" style={{ marginTop: "0.35rem" }}>
                          Tus datos actuales no fueron modificados y tu perfil de Caster Oficial sigue activo. Si lo requieres, puedes intentar de nuevo o contactar al administrador.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="discord-card-panel">
                    <h3 className="discord-panel-title">Perfil de Caster Activo</h3>
                    <div className="discord-caster-details-list">
                      <div className="discord-detail-item">
                        <span className="discord-detail-label">Alias de Caster:</span>
                        <span className="discord-detail-val">
                          {casterProfile?.alias || casterApp?.alias || session.user?.name}
                        </span>
                      </div>
                      <div className="discord-detail-item">
                        <span className="discord-detail-label">Twitch:</span>
                        <span className="discord-detail-val">
                          {casterProfile?.twitch_channel || casterApp?.twitch_channel ? (
                            <a
                              href={`https://twitch.tv/${extractPlatformUsername(casterProfile?.twitch_channel || casterApp?.twitch_channel)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#9146FF", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: "bold" }}
                              title={`Twitch: ${extractPlatformUsername(casterProfile?.twitch_channel || casterApp?.twitch_channel)}`}
                            >
                              <TwitchIcon size={16} color="#9146FF" /> {extractPlatformUsername(casterProfile?.twitch_channel || casterApp?.twitch_channel)}
                            </a>
                          ) : (
                            "No configurado"
                          )}
                        </span>
                      </div>
                      {(casterProfile?.kick_channel || casterApp?.kick_channel) && (
                        <div className="discord-detail-item">
                          <span className="discord-detail-label">Kick:</span>
                          <span className="discord-detail-val">
                            <a
                              href={`https://kick.com/${extractPlatformUsername(casterProfile?.kick_channel || casterApp?.kick_channel)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#53FC18", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: "bold" }}
                              title={`Kick: ${extractPlatformUsername(casterProfile?.kick_channel || casterApp?.kick_channel)}`}
                            >
                              <KickIcon size={16} color="#53FC18" /> {extractPlatformUsername(casterProfile?.kick_channel || casterApp?.kick_channel)}
                            </a>
                          </span>
                        </div>
                      )}
                      {(casterProfile?.youtube_channel || casterApp?.youtube_channel) && (
                        <div className="discord-detail-item">
                          <span className="discord-detail-label">YouTube:</span>
                          <span className="discord-detail-val">
                            <a
                              href={formatYoutubeUrl(casterProfile?.youtube_channel || casterApp?.youtube_channel)}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#FF0000", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: "bold" }}
                              title={`YouTube: ${extractPlatformUsername(casterProfile?.youtube_channel || casterApp?.youtube_channel)}`}
                            >
                              <YoutubeIcon size={16} color="#FF0000" /> {extractPlatformUsername(casterProfile?.youtube_channel || casterApp?.youtube_channel)}
                            </a>
                          </span>
                        </div>
                      )}
                      {(casterProfile?.bio || casterApp?.bio) && (
                        <div className="discord-detail-item bio">
                          <span className="discord-detail-label">Biografía:</span>
                          <span className="discord-detail-val">{casterProfile?.bio || casterApp?.bio}</span>
                        </div>
                      )}
                    </div>

                    <div className="discord-caster-actions">
                      <button
                        className="discord-btn-primary"
                        onClick={() => router.push("/caster")}
                      >
                        <Radio size={16} /> Abrir Panel de Caster (Cabina)
                      </button>
                      <button
                        className="discord-btn-secondary"
                        onClick={() => router.push("/matches")}
                      >
                        <Swords size={16} /> Ver Matches Públicos
                      </button>
                      <button
                        className="discord-btn-secondary"
                        onClick={() => {
                          setCasterAlias(casterProfile?.alias || casterApp?.alias || "");
                          setCasterTwitch(casterProfile?.twitch_channel || casterApp?.twitch_channel || "");
                          setCasterKick(casterProfile?.kick_channel || casterApp?.kick_channel || "");
                          setCasterYoutube(casterProfile?.youtube_channel || casterApp?.youtube_channel || "");
                          setCasterBio(casterProfile?.bio || casterApp?.bio || "");
                          setShowCasterModal(true);
                        }}
                      >
                        <Edit3 size={16} /> Editar Datos
                      </button>
                      <button
                        className="discord-btn-danger"
                        onClick={() => setShowDeleteCasterModal(true)}
                      >
                        <Trash2 size={16} /> Renunciar a Caster
                      </button>
                    </div>
                  </div>
                </div>
              ) : casterApp?.status === "pending" ? (
                <div className="discord-card-panel pending-box">
                  <h3 className="discord-panel-title">
                    {isCaster ? "Solicitud de actualización enviada para revisión" : "Postulación enviada para revisión"}
                  </h3>
                  <p className="discord-panel-desc">
                    {isCaster ? (
                      <>
                        Has solicitado actualizar tus datos de Caster (Nuevo Alias: <strong>{casterApp.alias}</strong>, Twitch: twitch.tv/{casterApp.twitch_channel}). Un administrador revisará y aprobará tus cambios en breve.
                      </>
                    ) : (
                      <>
                        Alias enviado: <strong>{casterApp.alias}</strong> (Canal: twitch.tv/{casterApp.twitch_channel}). Un administrador evaluará tu solicitud en breve.
                      </>
                    )}
                  </p>
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
                    <button
                      className="discord-btn-secondary"
                      onClick={() => setShowCasterModal(true)}
                    >
                      <Edit3 size={16} /> Modificar Solicitud
                    </button>
                    <button
                      className="discord-btn-danger"
                      onClick={() => setShowDeleteCasterModal(true)}
                    >
                      <Trash2 size={16} /> Cancelar Solicitud
                    </button>
                  </div>
                </div>
              ) : (
                <div className="discord-card-panel">
                  <h3 className="discord-panel-title">Conviértete en Caster Oficial</h3>
                  <p className="discord-panel-desc">
                    ¿Te gusta narrar o castear torneos de Left 4 Dead 2? Envía tu solicitud para obtener el rol de Caster Oficial y transmitir partidas oficiales en tu canal de streaming.
                  </p>

                  {!(hasTwitchLinked || hasKickLinked || hasGoogleLinked) ? (
                    <div className="discord-caster-notice-card">
                      <div className="discord-caster-notice-header">
                        <div className="discord-caster-notice-icon-box">
                          <Radio size={20} color="#C499FF" />
                        </div>
                        <div>
                          <h4 className="discord-caster-notice-title">Autenticación Requerida</h4>
                          <p className="discord-caster-notice-subtitle">
                            Para postularte como Caster Oficial y blindar tu identidad contra suplantaciones, debes vincular al menos una cuenta oficial (Twitch, Kick o Google).
                          </p>
                        </div>
                      </div>
                      <div className="discord-caster-notice-buttons">
                        <button
                          type="button"
                          className="discord-auth-chip-btn twitch"
                          onClick={() => signIn("twitch")}
                        >
                          <TwitchIcon size={15} /> Conectar Twitch
                        </button>
                        <button
                          type="button"
                          className="discord-auth-chip-btn kick"
                          onClick={() => signIn("kick")}
                        >
                          <KickIcon size={15} /> Conectar Kick
                        </button>
                        <button
                          type="button"
                          className="discord-auth-chip-btn google"
                          onClick={() => signIn("google")}
                        >
                          <GoogleIcon size={15} /> Conectar Google
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="discord-caster-verified-box">
                        <div className="discord-caster-verified-header">
                          <ShieldCheck size={18} color="#22C55E" />
                          <span>Cuentas Verificadas para Identidad:</span>
                        </div>
                        <div className="discord-caster-verified-chips">
                          {hasTwitchLinked && (
                            <span className="discord-verified-chip twitch">
                              <TwitchIcon size={13} /> twitch.tv/{twitchInfo?.username}
                            </span>
                          )}
                          {hasKickLinked && (
                            <span className="discord-verified-chip kick">
                              <KickIcon size={13} /> kick.com/{kickInfo?.username}
                            </span>
                          )}
                          {hasGoogleLinked && (
                            <span className="discord-verified-chip google">
                              <GoogleIcon size={13} /> {googleInfo?.username || session?.user?.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {casterApp?.status === "pending" && (
                        <div
                          style={{
                            margin: "1.25rem 0",
                            padding: "1rem 1.25rem",
                            background: "rgba(250, 204, 21, 0.1)",
                            border: "1px solid rgba(250, 204, 21, 0.3)",
                            borderRadius: "var(--radius-md)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "1rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <Clock size={20} color="#facc15" style={{ flexShrink: 0 }} />
                            <div>
                              <strong style={{ color: "#facc15", fontSize: "0.9rem" }}>Postulación en Revisión</strong>
                              <div className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.15rem" }}>
                                Tu postulación como Caster Oficial está siendo revisada por la administración.
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleCancelApplication}
                            className="discord-btn-secondary"
                            style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem", whiteSpace: "nowrap" }}
                          >
                            Cancelar Solicitud
                          </button>
                        </div>
                      )}

                      {casterApp?.status === "rejected" && (
                        <div
                          style={{
                            margin: "1.25rem 0",
                            padding: "0.85rem 1.25rem",
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            borderRadius: "var(--radius-md)",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                            fontSize: "0.85rem",
                          }}
                        >
                          <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
                          <div>
                            <strong style={{ color: "#ef4444" }}>Postulación no aprobada:</strong>{" "}
                            <span className="text-muted">{casterApp.reviewer_notes || "No cumple los requisitos actuales."}</span>
                            <div className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
                              Puedes volver a postularte completando el formulario a continuación.
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        className="discord-btn-primary"
                        onClick={() => setShowCasterModal(true)}
                        style={{
                          background: "linear-gradient(135deg, #9146FF 0%, #772ce8 100%)",
                          boxShadow: "0 4px 14px rgba(145, 70, 255, 0.35)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontWeight: "600",
                        }}
                      >
                        <Tv size={16} /> {casterApp?.status === "rejected" ? "Volver a Postularse" : "Postularse como Caster Oficial"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PANEL ADMIN DE APROBACIÓN DE CASTERS */}
          {isAdmin && activeTab === "admin" && (
            <div>
              <div className="discord-panel-header">
                <div>
                  <h2 className="discord-main-title">Administración de Casters Oficiales</h2>
                  <p className="discord-main-desc">
                    Revisa y gestiona las solicitudes y postulaciones de usuarios para ser Caster Oficial del sistema.
                  </p>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="discord-admin-filter-tabs">
                <button
                  type="button"
                  onClick={() => setAdminStatusFilter("all")}
                  className={`discord-filter-tab-btn ${adminStatusFilter === "all" ? "active" : ""}`}
                >
                  Todas ({adminApplications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminStatusFilter("pending")}
                  className={`discord-filter-tab-btn pending ${adminStatusFilter === "pending" ? "active" : ""}`}
                >
                  Pendientes ({adminApplications.filter((a) => a.status === "pending").length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminStatusFilter("approved")}
                  className={`discord-filter-tab-btn approved ${adminStatusFilter === "approved" ? "active" : ""}`}
                >
                  Aprobadas ({adminApplications.filter((a) => a.status === "approved").length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminStatusFilter("rejected")}
                  className={`discord-filter-tab-btn rejected ${adminStatusFilter === "rejected" ? "active" : ""}`}
                >
                  Rechazadas ({adminApplications.filter((a) => a.status === "rejected").length})
                </button>
              </div>

              {filteredAdminApps.length === 0 ? (
                <div className="discord-empty-panel">
                  <Tv size={44} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No hay solicitudes de caster en esta categoría.</p>
                </div>
              ) : (
                <div className="discord-admin-cards-grid">
                  {filteredAdminApps.map((app) => (
                    <div key={app.id} className={`discord-admin-app-card ${app.status}`}>
                      <div className="discord-admin-app-header">
                        <div className="discord-admin-app-user-info">
                          <div className="discord-user-avatar medium">
                            {app.users?.image ? (
                              <img src={app.users.image} alt={app.alias} />
                            ) : (
                              <div className="discord-avatar-placeholder medium">
                                {app.alias ? app.alias[0].toUpperCase() : "C"}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="discord-admin-app-alias-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                              <span className="discord-admin-app-alias">{app.alias}</span>
                              {app.isEdit ? (
                                <span
                                  style={{
                                    background: "rgba(250, 204, 21, 0.15)",
                                    color: "#facc15",
                                    border: "1px solid rgba(250, 204, 21, 0.35)",
                                    padding: "0.15rem 0.5rem",
                                    borderRadius: "6px",
                                    fontSize: "0.72rem",
                                    fontWeight: "bold",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                  }}
                                >
                                  <RefreshCw size={11} /> Edición de Perfil
                                </span>
                              ) : (
                                <span
                                  style={{
                                    background: "rgba(111, 175, 58, 0.15)",
                                    color: "var(--primary)",
                                    border: "1px solid rgba(111, 175, 58, 0.35)",
                                    padding: "0.15rem 0.5rem",
                                    borderRadius: "6px",
                                    fontSize: "0.72rem",
                                    fontWeight: "bold",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                  }}
                                >
                                  <Sparkles size={11} /> Primera Postulación
                                </span>
                              )}
                              <span className="discord-admin-app-verified-tag">
                                <ShieldCheck size={13} /> Identidad Autenticada
                              </span>
                            </div>
                            <div className="discord-admin-app-user-name">
                              {app.users?.name || app.users?.email || "Usuario"}
                              {app.isEdit && <span className="text-muted text-xs" style={{ marginLeft: "0.5rem" }}>(Caster Oficial Activo)</span>}
                            </div>
                          </div>
                        </div>

                        <div className="discord-admin-app-status-badge-wrap">
                          <span
                            className={`discord-status-badge ${
                              app.status === "approved"
                                ? "approved"
                                : app.status === "rejected"
                                ? "rejected"
                                : "pending"
                            }`}
                          >
                            {app.status === "approved"
                              ? "Aprobada"
                              : app.status === "rejected"
                              ? "Rechazada"
                              : "Pendiente de Revisión"}
                          </span>
                          <span className="discord-admin-app-date">
                            {new Date(app.created_at).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Streaming Channels Chips */}
                      <div className="discord-admin-app-channels-row">
                        <span className="discord-admin-app-section-label">Canales Vinculados:</span>
                        <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", alignItems: "center" }}>
                          {app.twitch_channel && (
                            <a
                              href={`https://twitch.tv/${extractPlatformUsername(app.twitch_channel)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                color: "#9146FF",
                                textDecoration: "none",
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                                background: "transparent",
                              }}
                              title={`Twitch: ${extractPlatformUsername(app.twitch_channel)}`}
                            >
                              <TwitchIcon size={14} color="#9146FF" />
                              <span>{extractPlatformUsername(app.twitch_channel)}</span>
                            </a>
                          )}
                          {app.kick_channel && (
                            <a
                              href={`https://kick.com/${extractPlatformUsername(app.kick_channel)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                color: "#53FC18",
                                textDecoration: "none",
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                                background: "transparent",
                              }}
                              title={`Kick: ${extractPlatformUsername(app.kick_channel)}`}
                            >
                              <KickIcon size={14} color="#53FC18" />
                              <span>{extractPlatformUsername(app.kick_channel)}</span>
                            </a>
                          )}
                          {app.youtube_channel && (
                            <a
                              href={formatYoutubeUrl(app.youtube_channel)}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                color: "#FF0000",
                                textDecoration: "none",
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                                background: "transparent",
                              }}
                              title={`YouTube: ${extractPlatformUsername(app.youtube_channel)}`}
                            >
                              <YoutubeIcon size={14} color="#FF0000" />
                              <span>{extractPlatformUsername(app.youtube_channel)}</span>
                            </a>
                          )}
                          {!app.twitch_channel && !app.kick_channel && !app.youtube_channel && (
                            <span className="discord-admin-no-channel">Sin canales configurados</span>
                          )}
                        </div>
                      </div>

                      {/* Idiomas & Bio */}
                      <div className="discord-admin-app-meta-box">
                        <div className="discord-admin-app-meta-item">
                          <span className="discord-admin-app-meta-title">Idiomas de transmisión:</span>
                          <span className="discord-admin-app-meta-value">
                            {Array.isArray(app.languages) ? app.languages.join(", ") : app.languages || "Español"}
                          </span>
                        </div>
                        {app.bio && (
                          <div className="discord-admin-app-bio-box">
                            <span className="discord-admin-app-meta-title">Mensaje / Biografía:</span>
                            <p className="discord-admin-app-bio-text">{app.bio}</p>
                          </div>
                        )}
                      </div>

                      {app.reviewer_notes && (
                        <div className="discord-admin-app-reviewer-notes">
                          <strong>Nota de revisión:</strong> {app.reviewer_notes}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="discord-admin-app-actions">
                        {app.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              className="discord-admin-btn approve"
                              onClick={() => handleReviewApplication(app.id, "approve")}
                            >
                              <CheckCircle2 size={16} /> {app.isEdit ? "Aprobar Cambios" : "Aprobar Caster"}
                            </button>
                            <button
                              type="button"
                              className="discord-admin-btn reject"
                              onClick={() => handleReviewApplication(app.id, "reject")}
                              title={app.isEdit ? "Solo rechaza los cambios propuestos; el usuario mantiene su rol de caster." : "Rechaza la postulación."}
                            >
                              <XCircle size={16} /> {app.isEdit ? "Rechazar Cambios" : "Rechazar Postulación"}
                            </button>
                          </>
                        ) : app.status === "approved" ? (
                          <button
                            type="button"
                            className="discord-admin-btn revoke"
                            onClick={() => handleReviewApplication(app.id, "revoke")}
                          >
                            <XCircle size={15} /> Revocar Rol de Caster
                          </button>
                        ) : (
                          <span className="text-muted text-xs" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <XCircle size={14} color="#ef4444" /> Solicitud archivada
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: POSTULACIÓN O EDICIÓN DE CASTER */}
      {showCasterModal && (
        <div className="discord-modal-overlay" onClick={() => setShowCasterModal(false)}>
          <div className="discord-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "540px" }}>
            <div className="discord-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Tv size={20} color="#9146FF" />
                <h3 className="discord-modal-title">
                  {isCaster ? "Modificar Datos de Caster Oficial" : "Postulación a Caster Oficial"}
                </h3>
              </div>
              <button className="discord-modal-close" onClick={() => setShowCasterModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitCasterApp} className="discord-modal-body">
              {isCaster && (
                <div
                  style={{
                    background: "rgba(250, 204, 21, 0.1)",
                    border: "1px solid rgba(250, 204, 21, 0.3)",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    fontSize: "0.85rem",
                    color: "var(--warning)",
                    marginBottom: "1rem",
                    lineHeight: 1.4,
                  }}
                >
                  Nota: Al modificar tus datos de Caster, se enviará una solicitud de actualización a los administradores para que sea aprobada antes de aplicar los cambios en el sistema.
                </div>
              )}

              {/* Selector de Plataforma Principal si hay más de 1 vinculada */}
              {((hasTwitchLinked ? 1 : 0) + (hasKickLinked ? 1 : 0) + (hasGoogleLinked ? 1 : 0)) > 1 && (
                <div className="discord-form-group">
                  <label className="discord-form-label">SELECCIONA LA PLATAFORMA PRINCIPAL PARA TU ALIAS</label>
                  <div className="discord-platform-pills">
                    {hasTwitchLinked && (
                      <button
                        type="button"
                        onClick={() => setSelectedPrimaryPlatform("twitch")}
                        className={`discord-platform-pill twitch ${selectedPrimaryPlatform === "twitch" ? "active" : ""}`}
                      >
                        <TwitchIcon size={15} /> Twitch <span className="discord-pill-user">({twitchInfo?.username})</span>
                      </button>
                    )}
                    {hasKickLinked && (
                      <button
                        type="button"
                        onClick={() => setSelectedPrimaryPlatform("kick")}
                        className={`discord-platform-pill kick ${selectedPrimaryPlatform === "kick" ? "active" : ""}`}
                      >
                        <KickIcon size={15} /> Kick <span className="discord-pill-user">({kickInfo?.username})</span>
                      </button>
                    )}
                    {hasGoogleLinked && (
                      <button
                        type="button"
                        onClick={() => setSelectedPrimaryPlatform("youtube")}
                        className={`discord-platform-pill google ${selectedPrimaryPlatform === "youtube" ? "active" : ""}`}
                      >
                        <GoogleIcon size={15} /> Google <span className="discord-pill-user">({googleInfo?.username || session?.user?.name})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Alias Ineditable obtenido de la plataforma principal */}
              <div className="discord-form-group">
                <label className="discord-form-label">
                  ALIAS DE CASTER (VERIFICADO POR {selectedPrimaryPlatform === "youtube" ? "GOOGLE" : selectedPrimaryPlatform.toUpperCase()})
                </label>
                <div className="discord-locked-input-wrap">
                  <input
                    type="text"
                    className={`discord-input discord-locked-input ${selectedPrimaryPlatform}`}
                    value={
                      selectedPrimaryPlatform === "twitch"
                        ? (twitchInfo?.displayName || twitchInfo?.username || "")
                        : selectedPrimaryPlatform === "kick"
                        ? (kickInfo?.username || "")
                        : (googleInfo?.username || session?.user?.name || "")
                    }
                    readOnly
                  />
                  <div className="discord-input-lock-badge">
                    <ShieldCheck size={16} />
                  </div>
                </div>
                <span className="discord-input-caption">
                  El alias se obtiene automáticamente de tu cuenta autenticada y queda protegido para evitar suplantaciones.
                </span>
              </div>

              {/* Canales de Transmisión */}
              <div className="discord-form-group">
                <label className="discord-form-label">CANALES DE TRANSMISIÓN DE STREAMING</label>
                <div className="discord-channels-list">
                  {/* Twitch */}
                  <div className={`discord-channel-card ${hasTwitchLinked ? "connected" : ""}`}>
                    <div className="discord-channel-card-left">
                      <div className="discord-channel-icon-wrap twitch">
                        <TwitchIcon size={18} />
                      </div>
                      <div>
                        <div className="discord-channel-card-name">Twitch</div>
                        <div className="discord-channel-card-sub">
                          {hasTwitchLinked ? `twitch.tv/${twitchInfo?.username}` : "No conectado"}
                        </div>
                      </div>
                    </div>
                    {hasTwitchLinked ? (
                      <span className="discord-channel-verified-badge">
                        <ShieldCheck size={14} /> Autenticado
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => signIn("twitch")}
                        className="discord-channel-action-btn twitch"
                      >
                        Vincular Twitch
                      </button>
                    )}
                  </div>

                  {/* Kick */}
                  <div className={`discord-channel-card ${hasKickLinked ? "connected" : ""}`}>
                    <div className="discord-channel-card-left">
                      <div className="discord-channel-icon-wrap kick">
                        <KickIcon size={18} />
                      </div>
                      <div>
                        <div className="discord-channel-card-name">Kick</div>
                        <div className="discord-channel-card-sub">
                          {hasKickLinked ? `kick.com/${kickInfo?.username}` : "No conectado"}
                        </div>
                      </div>
                    </div>
                    {hasKickLinked ? (
                      <span className="discord-channel-verified-badge">
                        <ShieldCheck size={14} /> Autenticado
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => signIn("kick")}
                        className="discord-channel-action-btn kick"
                      >
                        Vincular Kick
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* YouTube Channel Input */}
              <div className="discord-form-group">
                <label className="discord-form-label">
                  CANAL DE YOUTUBE {selectedPrimaryPlatform === "youtube" ? "*" : "(OPCIONAL)"}
                </label>
                <div className="discord-input-with-prefix">
                  <div className="discord-input-prefix-icon youtube">
                    <YoutubeIcon size={18} />
                  </div>
                  <input
                    type="text"
                    className="discord-input discord-input-prefixed"
                    placeholder="ej. @mi_canal o https://youtube.com/@mi_canal"
                    value={casterYoutube}
                    onChange={(e) => setCasterYoutube(e.target.value)}
                    required={selectedPrimaryPlatform === "youtube"}
                  />
                </div>
                <span className="discord-input-caption">
                  Ingresa tu @handle o enlace de canal para que los espectadores puedan ver tus transmisiones en YouTube.
                </span>
              </div>

              {/* Idiomas */}
              <div className="discord-form-group">
                <label className="discord-form-label">IDIOMAS DE TRANSMISIÓN</label>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", paddingTop: "0.4rem" }}>
                  {MAIN_CASTER_LANGUAGES.map((lang) => {
                    const selectedLangs = normalizeLanguages(casterLanguages);
                    const isChecked = selectedLangs.includes(lang);
                    return (
                      <label
                        key={lang}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 0.95rem",
                          borderRadius: "8px",
                          cursor: "pointer",
                          userSelect: "none",
                          fontSize: "0.85rem",
                          fontWeight: isChecked ? "bold" : "500",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          background: isChecked
                            ? "rgba(111, 175, 58, 0.15)"
                            : "rgba(255, 255, 255, 0.03)",
                          border: isChecked
                            ? "1px solid var(--primary)"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                          boxShadow: isChecked
                            ? "0 0 14px rgba(111, 175, 58, 0.35), inset 0 0 8px rgba(111, 175, 58, 0.1)"
                            : "none",
                          color: isChecked ? "#ffffff" : "var(--muted)",
                          transform: isChecked ? "translateY(-1px)" : "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let next: string[];
                            if (e.target.checked) {
                              next = normalizeLanguages([...selectedLangs, lang]);
                            } else {
                              next = selectedLangs.filter((l) => l !== lang);
                            }
                            setCasterLanguages(next.join(", "));
                          }}
                          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
                        />
                        <div
                          style={{
                            width: "14px",
                            height: "14px",
                            borderRadius: "4px",
                            border: isChecked ? "1px solid var(--primary)" : "1px solid rgba(255, 255, 255, 0.2)",
                            background: isChecked ? "var(--primary)" : "rgba(0, 0, 0, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isChecked && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#000"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span>{lang}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Biografía */}
              <div className="discord-form-group">
                <label className="discord-form-label">BIOGRAFÍA / EXPERIENCIA (OPCIONAL)</label>
                <textarea
                  className="discord-input"
                  rows={3}
                  placeholder="Cuéntanos brevemente sobre tu experiencia..."
                  value={casterBio}
                  onChange={(e) => setCasterBio(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="discord-modal-actions">
                <button type="button" className="discord-btn-cancel" onClick={() => setShowCasterModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="discord-btn-primary"
                  disabled={submittingCasterApp}
                  style={{
                    background: "#9146FF",
                    cursor: "pointer",
                  }}
                >
                  <Send size={16} /> {submittingCasterApp ? "Enviando..." : isCaster ? "Enviar Solicitud de Actualización" : "Enviar Solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal for unlinking */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title={`Desvincular ${unlinkProvider.toUpperCase()}`}
        message={`¿Estás seguro de que deseas desvincular tu cuenta de ${unlinkProvider.toUpperCase()}?`}
        onConfirm={handleUnlink}
        onCancel={() => setShowConfirmModal(false)}
        confirmText="Sí, Desvincular"
        cancelText="Cancelar"
        isDanger={true}
      />

      {/* Confirm Modal for deleting Caster status */}
      <ConfirmModal
        isOpen={showDeleteCasterModal}
        title={isCaster ? "Renunciar a Caster Oficial" : "Cancelar Solicitud de Caster"}
        message={
          isCaster
            ? "¿Estás seguro de que deseas eliminar tu status de Caster Oficial? Se desvinculará tu perfil de caster de la plataforma."
            : "¿Estás seguro de que deseas cancelar tu solicitud de Caster Oficial?"
        }
        onConfirm={handleDeleteCasterStatus}
        onCancel={() => setShowDeleteCasterModal(false)}
        confirmText={isCaster ? "Eliminar Status" : "Cancelar Solicitud"}
        cancelText="Volver"
        isDanger={true}
      />

      {/* Confirm Modal for deleting Account */}
      <ConfirmModal
        isOpen={showDeleteAccountModal}
        title="Eliminar Cuenta Permanentemente"
        message="¿Estás completamente seguro de que deseas eliminar tu cuenta? Esta acción borrará de forma definitiva tu usuario, datos personales y accesos a la plataforma."
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteAccountModal(false)}
        confirmText="Sí, Eliminar Mi Cuenta"
        cancelText="Cancelar"
        isDanger={true}
      />

      {/* SITE THEMED DISCORD-STYLE STYLES */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .discord-settings-wrapper {
          display: flex;
          min-height: 100vh;
          background: var(--bg-base);
          color: var(--text-main);
          font-family: inherit;
        }

        /* SIDEBAR */
        .discord-settings-sidebar {
          width: 260px;
          min-width: 260px;
          background: var(--bg-surface);
          padding: 2.5rem 1rem 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border-light);
        }

        .discord-sidebar-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          padding: 0 0.5rem;
        }

        .discord-sidebar-avatar-wrap {
          position: relative;
          width: 40px;
          height: 40px;
        }

        .discord-sidebar-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--border-light);
        }

        .discord-status-dot {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 12px;
          height: 12px;
          background: var(--primary);
          border-radius: 50%;
          border: 2px solid var(--bg-surface);
          box-shadow: 0 0 6px var(--primary-glow);
        }

        .discord-sidebar-user-meta {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .discord-sidebar-username {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .discord-sidebar-subtext {
          font-size: 0.75rem;
          color: var(--text-muted);
          cursor: pointer;
          transition: color var(--transition);
        }
        .discord-sidebar-subtext:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        .discord-search-box {
          position: relative;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
        }

        .discord-search-icon {
          position: absolute;
          left: 10px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .discord-search-input {
          width: 100%;
          background: var(--bg-base);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 7px 10px 7px 30px;
          color: var(--text-main);
          font-size: 0.85rem;
          outline: none;
          transition: all var(--transition);
        }
        .discord-search-input:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 2px var(--primary-glow);
        }

        .discord-nav-container {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }

        .discord-nav-section-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          padding: 10px 8px 4px 8px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .discord-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px;
          border-radius: var(--radius-md);
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.92rem;
          font-weight: 500;
          cursor: pointer;
          position: relative;
          text-align: left;
          transition: all var(--transition);
        }
        .discord-nav-item:hover {
          background: var(--bg-surface-elevated);
          color: var(--text-main);
        }
        .discord-nav-item.active {
          background: rgba(111, 175, 58, 0.12);
          color: #ffffff;
          border: 1px solid rgba(111, 175, 58, 0.3);
          font-weight: 600;
        }
        .discord-nav-item.danger:hover {
          background: rgba(179, 32, 37, 0.15);
          color: var(--danger-hover);
          border-color: rgba(179, 32, 37, 0.3);
        }

        .discord-active-indicator {
          position: absolute;
          left: -6px;
          width: 3px;
          height: 18px;
          background: var(--primary);
          border-radius: 2px;
          box-shadow: 0 0 8px var(--primary-glow);
        }

        .discord-nav-sublist {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 4px;
        }

        .discord-nav-subitem {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px 5px 28px;
          font-size: 0.85rem;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: var(--radius-md);
          transition: all var(--transition);
        }
        .discord-nav-subitem:hover {
          color: var(--text-main);
          background: var(--bg-surface-elevated);
        }
        .discord-nav-subitem.active {
          color: var(--primary-hover);
          font-weight: 600;
        }
        .discord-subitem-bar {
          font-weight: bold;
          color: var(--primary);
        }

        .discord-badge {
          margin-left: auto;
          background: var(--bg-surface-elevated);
          color: var(--text-main);
          border: 1px solid var(--border-light);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: var(--radius-full);
        }
        .discord-badge.alert {
          background: rgba(250, 204, 21, 0.2);
          color: var(--warning);
          border-color: rgba(250, 204, 21, 0.4);
        }

        .discord-pill-dot {
          margin-left: auto;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .discord-pill-dot.green { background: var(--primary); box-shadow: 0 0 6px var(--primary-glow); }
        .discord-pill-dot.yellow { background: var(--warning); }

        .discord-nav-divider {
          height: 1px;
          background: var(--border-light);
          margin: 10px 6px;
        }

        .discord-sidebar-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.72rem;
          color: var(--text-disabled);
          padding: 10px 8px 0 8px;
        }

        /* MAIN CONTENT */
        .discord-settings-content {
          flex: 1;
          padding: 2.5rem 2rem;
          position: relative;
          min-height: 100vh;
          overflow-y: auto;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .discord-esc-container {
          position: fixed;
          top: 2.5rem;
          right: 2.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          z-index: 50;
        }

        .discord-esc-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid var(--border-light);
          background: var(--bg-surface);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all var(--transition);
        }
        .discord-esc-btn:hover {
          transform: scale(1.08);
          border-color: var(--primary);
          color: var(--primary-hover);
          background: var(--bg-surface-elevated);
        }

        .discord-esc-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .discord-content-inner {
          width: 100%;
          max-width: 740px;
          margin: 0 auto;
          padding-bottom: 4rem;
        }

        .discord-main-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0 0 1.25rem 0;
        }

        .discord-main-desc {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0 0 1.5rem 0;
          line-height: 1.45;
        }

        /* DISCORD PROFILE CARD */
        .discord-profile-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-bottom: 2rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .discord-profile-banner {
          height: 110px;
          background: linear-gradient(135deg, rgba(111, 175, 58, 0.4) 0%, rgba(27, 30, 34, 0.9) 50%, rgba(179, 32, 37, 0.35) 100%);
          border-bottom: 1px solid var(--border-light);
        }

        .discord-profile-body {
          padding: 0 1.5rem 1.5rem 1.5rem;
        }

        .discord-profile-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: -46px;
          margin-bottom: 0.75rem;
        }

        .discord-profile-avatar-outer {
          position: relative;
          width: 88px;
          height: 88px;
          border-radius: 50%;
          border: 4px solid var(--bg-surface);
          background: var(--bg-surface);
        }

        .discord-profile-avatar-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
        }

        .discord-status-dot-large {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 18px;
          height: 18px;
          background: var(--primary);
          border-radius: 50%;
          border: 3px solid var(--bg-surface);
          box-shadow: 0 0 8px var(--primary-glow);
        }

        .discord-profile-info-header {
          margin-bottom: 1.25rem;
        }

        .discord-profile-name {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .discord-profile-handle {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        /* INFO ROWS BOX */
        .discord-account-info-box {
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 0.5rem 1.25rem;
          display: flex;
          flex-direction: column;
        }

        .discord-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 0;
          border-bottom: 1px solid var(--border-light);
        }
        .discord-info-row:last-child {
          border-bottom: none;
        }

        .discord-info-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 4px;
          letter-spacing: 0.03em;
        }

        .discord-info-value {
          font-size: 0.95rem;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .discord-code-text {
          font-family: monospace;
          font-size: 0.82rem;
          color: var(--text-muted);
        }

        .discord-reveal-link {
          background: transparent;
          border: none;
          color: var(--primary-hover);
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0;
        }
        .discord-reveal-link:hover {
          text-decoration: underline;
        }

        .discord-btn-edit {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          color: var(--text-main);
          border-radius: var(--radius-md);
          padding: 6px 14px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          transition: all var(--transition);
        }
        .discord-btn-edit:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--primary);
        }

        .discord-inline-edit-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .discord-inline-input {
          background: var(--bg-base);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 6px 10px;
          color: var(--text-main);
          font-size: 0.9rem;
          outline: none;
        }
        .discord-inline-input:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 2px var(--primary-glow);
        }

        .discord-inline-actions {
          display: flex;
          gap: 8px;
        }

        .discord-btn-small-cancel {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.8rem;
          cursor: pointer;
        }
        .discord-btn-small-cancel:hover {
          color: var(--text-main);
          text-decoration: underline;
        }

        .discord-btn-small-save {
          background: var(--primary);
          color: #000;
          border: none;
          border-radius: 4px;
          padding: 4px 12px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition);
        }
        .discord-btn-small-save:hover {
          background: var(--primary-hover);
        }

        .discord-section-divider {
          height: 1px;
          background: var(--border-light);
          margin: 2rem 0 1.5rem 0;
        }

        .discord-section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0 0 1rem 0;
        }
        .discord-section-title.danger-text {
          color: var(--danger-hover);
        }

        .discord-card-panel {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
        }

        .discord-panel-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-main);
          margin: 0 0 0.5rem 0;
        }

        .discord-panel-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0 0 1.25rem 0;
          line-height: 1.45;
        }

        .discord-btn-primary {
          background: var(--primary);
          color: #000;
          font-weight: 700;
          border: none;
          border-radius: var(--radius-md);
          padding: 8px 18px;
          font-size: 0.9rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 14px var(--primary-glow);
          transition: all var(--transition);
        }
        .discord-btn-primary:hover {
          background: var(--primary-hover);
          transform: translateY(-1px);
        }

        .discord-btn-secondary {
          background: var(--bg-surface-elevated);
          color: var(--text-main);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 8px 18px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all var(--transition);
        }
        .discord-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .discord-btn-danger {
          background: rgba(179, 32, 37, 0.15);
          color: var(--danger-hover);
          border: 1px solid rgba(179, 32, 37, 0.3);
          border-radius: var(--radius-md);
          padding: 8px 18px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all var(--transition);
        }
        .discord-btn-danger:hover {
          background: rgba(230, 57, 70, 0.25);
          border-color: rgba(230, 57, 70, 0.5);
        }

        .discord-btn-cancel {
          background: transparent;
          color: var(--text-muted);
          border: none;
          padding: 8px 16px;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .discord-btn-cancel:hover {
          color: var(--text-main);
          text-decoration: underline;
        }

        /* FORMS */
        .discord-form-group {
          margin-bottom: 1rem;
        }

        .discord-form-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 6px;
          letter-spacing: 0.03em;
        }

        .discord-input {
          width: 100%;
          background: var(--bg-base);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          color: var(--text-main);
          font-size: 0.92rem;
          outline: none;
          transition: all var(--transition);
        }
        .discord-input:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 2px var(--primary-glow);
        }

        .discord-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 1.25rem;
        }

        /* DANGER PANEL */
        .discord-danger-panel {
          background: rgba(179, 32, 37, 0.05);
          border: 1px solid rgba(179, 32, 37, 0.25);
          border-left: 4px solid var(--danger);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .discord-danger-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0 0 4px 0;
        }

        .discord-danger-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0;
          max-width: 440px;
          line-height: 1.4;
        }

        /* CONNECTIONS GRID */
        .discord-connections-grid {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .discord-connection-item {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 1.15rem 1.4rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all var(--transition);
        }
        .discord-connection-item:hover {
          border-color: rgba(111, 175, 58, 0.25);
        }

        .discord-connection-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .discord-conn-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .discord-conn-icon.steam { background: linear-gradient(135deg, #171a21 0%, #1b2838 100%); color: white; border: 1px solid rgba(255, 255, 255, 0.12); }
        .discord-conn-icon.discord { background: rgba(88, 101, 242, 0.15); color: #5865f2; }
        .discord-conn-icon.twitch { background: rgba(145, 70, 255, 0.15); color: #9146ff; }

        .discord-conn-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text-main);
          margin-bottom: 2px;
        }

        .discord-conn-status {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .discord-conn-status.connected {
          color: var(--primary);
          font-weight: 600;
        }

        .discord-btn-connect {
          background: var(--primary);
          color: #000;
          border: none;
          border-radius: var(--radius-md);
          padding: 8px 16px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px var(--primary-glow);
          transition: all var(--transition);
        }
        .discord-btn-connect:hover {
          background: var(--primary-hover);
        }
        .discord-btn-connect.steam-btn { background: #171a21; color: white; border: 1px solid rgba(255, 255, 255, 0.2); }
        .discord-btn-connect.steam-btn:hover { background: #2a475e; }
        .discord-btn-connect.discord-btn { background: #5865f2; color: white; }
        .discord-btn-connect.discord-btn:hover { background: #4752c4; }
        .discord-btn-connect.twitch-btn { background: #9146ff; color: white; }
        .discord-btn-connect.twitch-btn:hover { background: #772ce8; }

        .discord-btn-disconnect {
          background: rgba(179, 32, 37, 0.15);
          color: var(--danger-hover);
          border: 1px solid rgba(179, 32, 37, 0.3);
          border-radius: var(--radius-md);
          padding: 8px 16px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all var(--transition);
        }
        .discord-btn-disconnect:hover {
          background: rgba(230, 57, 70, 0.25);
          border-color: rgba(230, 57, 70, 0.5);
        }

        /* CASTER STATUS BADGES */
        .discord-caster-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .discord-status-badge {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .discord-status-badge.approved {
          background: rgba(111, 175, 58, 0.15);
          color: var(--primary);
          border: 1px solid rgba(111, 175, 58, 0.3);
        }
        .discord-status-badge.pending {
          background: rgba(250, 204, 21, 0.15);
          color: var(--warning);
          border: 1px solid rgba(250, 204, 21, 0.3);
        }
        .discord-status-badge.rejected {
          background: rgba(179, 32, 37, 0.15);
          color: var(--danger-hover);
          border: 1px solid rgba(179, 32, 37, 0.3);
        }

        .discord-caster-details-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .discord-detail-item {
          display: flex;
          gap: 8px;
          font-size: 0.9rem;
        }
        .discord-detail-item.bio {
          flex-direction: column;
          gap: 4px;
        }

        .discord-detail-label {
          font-weight: 700;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .discord-detail-val {
          color: var(--text-main);
        }

        .discord-twitch-link {
          color: #9146ff;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .discord-twitch-link:hover {
          text-decoration: underline;
        }

        .discord-caster-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .discord-rejected-note {
          background: rgba(179, 32, 37, 0.1);
          border: 1px solid rgba(179, 32, 37, 0.25);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          color: var(--danger-hover);
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }

        /* ADMIN SECTION */
        .discord-admin-filter-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }

        .discord-filter-tab-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-light);
          border-radius: 20px;
          padding: 0.4rem 0.9rem;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .discord-filter-tab-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-main);
        }
        .discord-filter-tab-btn.active {
          background: rgba(145, 70, 255, 0.2);
          border-color: #9146FF;
          color: #C499FF;
        }
        .discord-filter-tab-btn.pending.active {
          background: rgba(250, 204, 21, 0.2);
          border-color: #FACC15;
          color: #FDE047;
        }
        .discord-filter-tab-btn.approved.active {
          background: rgba(34, 197, 94, 0.2);
          border-color: #22C55E;
          color: #86EFAC;
        }
        .discord-filter-tab-btn.rejected.active {
          background: rgba(239, 68, 68, 0.2);
          border-color: #EF4444;
          color: #FCA5A5;
        }

        .discord-admin-cards-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .discord-admin-app-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(20, 20, 28, 0.6) 100%);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        .discord-admin-app-card.approved {
          border-left: 4px solid #22C55E;
        }
        .discord-admin-app-card.pending {
          border-left: 4px solid #FACC15;
        }
        .discord-admin-app-card.rejected {
          border-left: 4px solid #EF4444;
        }

        .discord-admin-app-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .discord-admin-app-user-info {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .discord-admin-app-alias-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .discord-admin-app-alias {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .discord-admin-app-verified-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          font-weight: 600;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.35);
          color: #22C55E;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }

        .discord-admin-app-user-name {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.15rem;
        }

        .discord-admin-app-status-badge-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .discord-admin-app-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .discord-admin-app-channels-row {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .discord-admin-app-section-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .discord-admin-app-chips-wrap {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .discord-admin-channel-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .discord-admin-channel-pill.twitch {
          background: rgba(145, 70, 255, 0.15);
          border: 1px solid rgba(145, 70, 255, 0.35);
          color: #C499FF;
        }
        .discord-admin-channel-pill.twitch:hover {
          background: rgba(145, 70, 255, 0.25);
          border-color: #9146FF;
        }
        .discord-admin-channel-pill.kick {
          background: rgba(83, 252, 24, 0.15);
          border: 1px solid rgba(83, 252, 24, 0.35);
          color: #53FC18;
        }
        .discord-admin-channel-pill.kick:hover {
          background: rgba(83, 252, 24, 0.25);
          border-color: #53FC18;
        }
        .discord-admin-channel-pill.youtube {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #F87171;
        }
        .discord-admin-channel-pill.youtube:hover {
          background: rgba(239, 68, 68, 0.25);
          border-color: #EF4444;
        }
        .discord-admin-no-channel {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .discord-admin-app-meta-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .discord-admin-app-meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
        }

        .discord-admin-app-meta-title {
          font-weight: 700;
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        .discord-admin-app-meta-value {
          color: var(--text-main);
        }

        .discord-admin-app-bio-box {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-top: 0.25rem;
          padding-top: 0.4rem;
          border-top: 1px dashed rgba(255, 255, 255, 0.08);
        }

        .discord-admin-app-bio-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.4;
          margin: 0;
        }

        .discord-admin-app-reviewer-notes {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          color: #FCA5A5;
          font-size: 0.75rem;
        }

        .discord-admin-app-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.25rem;
          flex-wrap: wrap;
        }

        .discord-admin-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .discord-admin-btn.approve {
          background: #22C55E;
          color: #000000;
          font-weight: 700;
        }
        .discord-admin-btn.approve:hover {
          background: #16A34A;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.35);
        }
        .discord-admin-btn.reject {
          background: rgba(239, 68, 68, 0.15);
          color: #FCA5A5;
          border: 1px solid rgba(239, 68, 68, 0.35);
        }
        .discord-admin-btn.reject:hover {
          background: rgba(239, 68, 68, 0.25);
          border-color: #EF4444;
        }
        .discord-admin-btn.revoke {
          background: rgba(239, 68, 68, 0.1);
          color: #FCA5A5;
          border: 1px solid rgba(239, 68, 68, 0.3);
          font-size: 0.75rem;
        }
        .discord-admin-btn.revoke:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .discord-empty-panel {
          background: var(--bg-surface);
          border: 1px dashed var(--border-light);
          padding: 2.5rem;
          text-align: center;
          border-radius: var(--radius-lg);
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        /* MODAL */
        .discord-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .discord-modal-box {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 520px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .discord-modal-header {
          padding: 1.25rem 1.5rem;
          background: var(--bg-surface-elevated);
          border-bottom: 1px solid var(--border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .discord-modal-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .discord-modal-close:hover {
          color: var(--text-main);
        }

        .discord-modal-form {
          padding: 1.5rem;
        }

        .discord-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-light);
        }

        /* CASTER NOTICE & VERIFIED CARDS */
        .discord-caster-notice-card {
          margin: 1.25rem 0;
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, rgba(145, 70, 255, 0.08) 0%, rgba(20, 20, 28, 0.7) 100%);
          border: 1px solid rgba(145, 70, 255, 0.3);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }

        .discord-caster-notice-header {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          margin-bottom: 1rem;
        }

        .discord-caster-notice-icon-box {
          background: rgba(145, 70, 255, 0.15);
          border: 1px solid rgba(145, 70, 255, 0.35);
          border-radius: 10px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .discord-caster-notice-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #C499FF;
          margin: 0 0 0.25rem 0;
        }

        .discord-caster-notice-subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.45;
          margin: 0;
        }

        .discord-caster-notice-buttons {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .discord-auth-chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.1rem;
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .discord-auth-chip-btn.twitch {
          background: #9146FF;
          color: #FFFFFF;
        }
        .discord-auth-chip-btn.twitch:hover {
          background: #772CE8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(145, 70, 255, 0.35);
        }
        .discord-auth-chip-btn.kick {
          background: #53FC18;
          color: #000000;
          font-weight: 700;
        }
        .discord-auth-chip-btn.kick:hover {
          background: #46e012;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(83, 252, 24, 0.35);
        }
        .discord-auth-chip-btn.google {
          background: rgba(66, 133, 244, 0.15);
          color: #93C5FD;
          border: 1px solid rgba(66, 133, 244, 0.35);
        }
        .discord-auth-chip-btn.google:hover {
          background: rgba(66, 133, 244, 0.25);
          border-color: rgba(66, 133, 244, 0.5);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(66, 133, 244, 0.25);
        }

        .discord-caster-verified-box {
          margin: 1.25rem 0;
          padding: 0.95rem 1.25rem;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(20, 20, 28, 0.7) 100%);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .discord-caster-verified-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: #22C55E;
        }

        .discord-caster-verified-chips {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
          margin-top: 0.2rem;
        }

        .discord-verified-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.3rem 0.75rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .discord-verified-chip.twitch {
          background: rgba(145, 70, 255, 0.15);
          border: 1px solid rgba(145, 70, 255, 0.4);
          color: #C499FF;
        }
        .discord-verified-chip.kick {
          background: rgba(83, 252, 24, 0.15);
          border: 1px solid rgba(83, 252, 24, 0.4);
          color: #53FC18;
        }
        .discord-verified-chip.google {
          background: rgba(66, 133, 244, 0.15);
          border: 1px solid rgba(66, 133, 244, 0.4);
          color: #93C5FD;
        }

        /* PLATFORM PILLS IN MODAL */
        .discord-platform-pills {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .discord-platform-pill {
          padding: 0.5rem 0.9rem;
          border-radius: 8px;
          font-size: 0.8rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-light);
          color: var(--text-muted);
        }
        .discord-platform-pill .discord-pill-user {
          opacity: 0.75;
          font-size: 0.75rem;
        }
        .discord-platform-pill.twitch.active {
          background: rgba(145, 70, 255, 0.25);
          border-color: #9146FF;
          color: #C499FF;
          font-weight: 700;
          box-shadow: 0 0 12px rgba(145, 70, 255, 0.3);
        }
        .discord-platform-pill.kick.active {
          background: rgba(83, 252, 24, 0.2);
          border-color: #53FC18;
          color: #53FC18;
          font-weight: 700;
          box-shadow: 0 0 12px rgba(83, 252, 24, 0.25);
        }
        .discord-platform-pill.google.active {
          background: rgba(66, 133, 244, 0.25);
          border-color: #4285F4;
          color: #93C5FD;
          font-weight: 700;
          box-shadow: 0 0 12px rgba(66, 133, 244, 0.3);
        }

        /* LOCKED INPUT WRAP */
        .discord-locked-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .discord-locked-input {
          padding-right: 2.5rem !important;
          cursor: not-allowed;
          font-weight: 700 !important;
        }
        .discord-locked-input.twitch {
          background: rgba(145, 70, 255, 0.08) !important;
          border-color: rgba(145, 70, 255, 0.4) !important;
          color: #C499FF !important;
        }
        .discord-locked-input.kick {
          background: rgba(83, 252, 24, 0.08) !important;
          border-color: rgba(83, 252, 24, 0.4) !important;
          color: #53FC18 !important;
        }
        .discord-locked-input.youtube {
          background: rgba(66, 133, 244, 0.08) !important;
          border-color: rgba(66, 133, 244, 0.4) !important;
          color: #93C5FD !important;
        }
        .discord-input-lock-badge {
          position: absolute;
          right: 0.85rem;
          display: flex;
          align-items: center;
          color: var(--success);
          pointer-events: none;
        }
        .discord-input-caption {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.4;
          margin-top: 0.35rem;
          display: block;
        }

        /* CHANNELS LIST IN MODAL */
        .discord-channels-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .discord-channel-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border-light);
          transition: all 0.2s ease;
        }
        .discord-channel-card.connected {
          background: rgba(255, 255, 255, 0.04);
          border-style: solid;
          border-color: rgba(255, 255, 255, 0.12);
        }
        .discord-channel-card-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .discord-channel-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .discord-channel-icon-wrap.twitch {
          background: rgba(145, 70, 255, 0.15);
          color: #9146FF;
        }
        .discord-channel-icon-wrap.kick {
          background: rgba(83, 252, 24, 0.15);
          color: #53FC18;
        }
        .discord-channel-card-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .discord-channel-card-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .discord-channel-verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--success);
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
        }
        .discord-channel-action-btn {
          padding: 0.35rem 0.85rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .discord-channel-action-btn.twitch {
          background: #9146FF;
          color: #FFFFFF;
        }
        .discord-channel-action-btn.twitch:hover {
          background: #772CE8;
        }
        .discord-channel-action-btn.kick {
          background: #53FC18;
          color: #000000;
          font-weight: 700;
        }
        .discord-channel-action-btn.kick:hover {
          background: #46e012;
        }

        /* PREFIXED INPUT */
        .discord-input-with-prefix {
          position: relative;
          display: flex;
          align-items: center;
        }
        .discord-input-prefix-icon {
          position: absolute;
          left: 0.85rem;
          display: flex;
          align-items: center;
          pointer-events: none;
          z-index: 1;
        }
        .discord-input-prefix-icon.youtube {
          color: #EF4444;
        }
        .discord-input-prefixed {
          padding-left: 2.5rem !important;
        }

        @media (max-width: 768px) {
          .discord-settings-wrapper {
            flex-direction: column;
          }
          .discord-settings-sidebar {
            width: 100%;
            min-width: unset;
            border-right: none;
            border-bottom: 1px solid var(--border-light);
            padding: 1.5rem 1rem;
          }
          .discord-settings-content {
            padding: 1.5rem 1rem;
          }
          .discord-esc-container {
            top: 1rem;
            right: 1rem;
          }
        }
      `,
        }}
      />
    </div>
  );
}
