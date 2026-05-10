import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  isDanger = false
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "1rem"
    }}>
      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "400px",
        padding: "2rem",
        position: "relative",
        animation: "modalFadeIn 0.2s ease-out forwards"
      }}>
        <button 
          onClick={onCancel}
          style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          {isDanger ? (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "1rem", borderRadius: "50%", marginBottom: "1rem", color: "#f87171" }}>
              <AlertTriangle size={32} />
            </div>
          ) : (
            <div style={{ background: "rgba(74, 222, 128, 0.1)", padding: "1rem", borderRadius: "50%", marginBottom: "1rem", color: "var(--primary)" }}>
              <AlertTriangle size={32} />
            </div>
          )}
          
          <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{title}</h3>
          <p className="text-muted" style={{ marginBottom: "2rem", fontSize: "0.95rem" }}>{message}</p>
          
          <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
              {cancelText}
            </button>
            <button className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`} style={{ flex: 1 }} onClick={() => {
              onConfirm();
              onCancel(); // Close automatically
            }}>
              {confirmText}
            </button>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}} />
      </div>
    </div>
  );
}
