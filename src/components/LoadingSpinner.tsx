import React, { CSSProperties } from 'react';
import { useTranslation } from "@/lib/i18n";

interface LoadingSpinnerProps {
  text?: string;
  size?: number;
  fullHeight?: boolean;
  inline?: boolean;
}

export default function LoadingSpinner({ text, size = 40, fullHeight = false, inline = false }: LoadingSpinnerProps) {
  const { t } = useTranslation();
  const displayText = text !== undefined ? text : t("common.loading");
  let containerStyle: CSSProperties = fullHeight 
    ? { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }
    : { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '1rem' };

  if (inline) {
    containerStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' };
  }

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes l4d-pulse {
            0% { transform: scale(0.9); filter: drop-shadow(0 0 5px rgba(220, 38, 38, 0.5)); }
            50% { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(220, 38, 38, 0.9)); }
            100% { transform: scale(0.9); filter: drop-shadow(0 0 5px rgba(220, 38, 38, 0.5)); }
          }
          @keyframes blood-ring {
            0% { transform: rotate(0deg) scale(1); border-color: rgba(220, 38, 38, 0.8) transparent rgba(220, 38, 38, 0.2) transparent; }
            50% { transform: rotate(180deg) scale(1.05); border-color: rgba(220, 38, 38, 0.2) transparent rgba(220, 38, 38, 0.8) transparent; }
            100% { transform: rotate(360deg) scale(1); border-color: rgba(220, 38, 38, 0.8) transparent rgba(220, 38, 38, 0.2) transparent; }
          }
          .l4d-spinner-wrapper {
            position: relative;
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .l4d-spinner-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 3px solid transparent;
            animation: blood-ring 1.5s ease-in-out infinite;
          }
          .l4d-logo-img {
            width: ${size * 0.7}px;
            height: ${size * 0.7}px;
            object-fit: contain;
            animation: l4d-pulse 1.5s ease-in-out infinite;
          }
        `}
      </style>
      <div className="l4d-spinner-wrapper">
        <div className="l4d-spinner-ring"></div>
        <img src="/logos/l4dlogo.webp" alt="Loading..." className="l4d-logo-img" />
      </div>
      {displayText && (
        <span style={{ color: 'var(--muted)', fontSize: '0.95rem', fontWeight: '500', letterSpacing: '0.5px', animation: 'pulse 2s infinite' }}>
          {displayText}
        </span>
      )}
    </div>
  );
}
