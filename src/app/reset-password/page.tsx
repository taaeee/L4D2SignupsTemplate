"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, KeyRound, CheckCircle2 } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!token || !email) {
    return (
      <div className="reset-card card" style={{ textAlign: "center" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>{t("auth.invalid_link_title")}</h2>
        <p className="text-muted">
          {t("auth.invalid_link_desc")}
        </p>
        <Link href="/login" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>
          {t("common.back_to_login")}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      const msg = t("auth.passwords_dont_match");
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || t("common.error_network");
        setErrorMsg(msg);
        toast.error(msg);
      } else {
        setSuccess(true);
        toast.success(t("auth.reset_success_desc"));
        setTimeout(() => {
          router.push("/login");
        }, 2500);
      }
    } catch (err) {
      toast.error(t("common.error_network"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-card card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
        <CheckCircle2 size={56} style={{ color: "#22c55e", margin: "0 auto 1rem" }} />
        <h2 style={{ marginBottom: "0.5rem" }}>{t("auth.reset_success_title")}</h2>
        <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
          {t("auth.reset_success_desc")}
        </p>
        <Link href="/login" className="btn btn-primary">
          {t("common.back_to_login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="reset-card card">
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
          {t("auth.reset_title")} <span className="text-gradient">{t("auth.reset_title_highlight")}</span>
        </h1>
        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
          {t("auth.reset_for")} <strong>{email}</strong>
        </p>
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="input-group">
          <Lock size={18} className="input-icon" />
          <input
            type="password"
            placeholder={t("auth.password_register_placeholder")}
            className="form-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <div className="input-group">
          <KeyRound size={18} className="input-icon" />
          <input
            type="password"
            placeholder={t("auth.confirm_password_placeholder")}
            className="form-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary submit-btn">
          {loading ? t("common.saving") : t("auth.update_password")}
        </button>
      </form>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .reset-card {
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
          padding: 2.5rem 2rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
        }
        .error-banner {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          text-align: center;
        }
        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          color: #6b7280;
          pointer-events: none;
        }
        .form-input {
          width: 100%;
          padding: 0.75rem 0.75rem 0.75rem 2.5rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border, #374151);
          border-radius: 8px;
          color: white;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input:focus {
          border-color: var(--primary, #3b82f6);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .submit-btn {
          width: 100%;
          padding: 0.8rem;
          font-weight: 600;
          font-size: 1rem;
          border-radius: 8px;
          margin-top: 0.5rem;
          cursor: pointer;
        }
      `,
        }}
      />
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  return (
    <div
      className="container"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header style={{ padding: "1.5rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link
          href="/login"
          className="btn btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            border: "none",
            background: "transparent",
          }}
        >
          <ArrowLeft size={18} /> {t("common.back_to_login")}
        </Link>
        <LanguageSwitcher />
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </div>
  );
}
