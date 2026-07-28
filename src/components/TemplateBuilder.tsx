"use client";

import React, { useState } from "react";
import { Plus, Trash2, Link, Copy, Check } from "lucide-react";
import LZString from "lz-string";

interface Field {
  id: number;
  name: string;
  type: string;
  options: string;
}

export default function TemplateBuilder() {
  const [fields, setFields] = useState<Field[]>([
    { id: Date.now(), name: "Team", type: "text", options: "" },
    { id: Date.now() + 1, name: "Country", type: "text", options: "" },
    { id: Date.now() + 2, name: "Tag", type: "text", options: "" },
  ]);
  const [playerFields, setPlayerFields] = useState<Field[]>([
    { id: Date.now() + 3, name: "Discord", type: "text", options: "" },
  ]);

  const [generalFormat, setGeneralFormat] = useState(
    `Team: [Team]\nCountry: [Country]\nTag: [Tag]`
  );

  const [playerFormat, setPlayerFormat] = useState(
    `[ROLE] - [NAME] [STEAMID]\nSteam: [STEAMURL]\nDiscord: [Discord]`
  );

  const [maxPlayers, setMaxPlayers] = useState(8);
  const [defaultRole, setDefaultRole] = useState("Member");

  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);

  const addField = () =>
    setFields([
      ...fields,
      { id: Date.now(), name: "New Field", type: "text", options: "" },
    ]);
  const updateField = (id: number, key: keyof Field, value: string) =>
    setFields(fields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  const removeField = (id: number) => setFields(fields.filter((f) => f.id !== id));

  const addPlayerField = () =>
    setPlayerFields([
      ...playerFields,
      { id: Date.now(), name: "New Field", type: "text", options: "" },
    ]);
  const updatePlayerField = (id: number, key: keyof Field, value: string) =>
    setPlayerFields(
      playerFields.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    );
  const removePlayerField = (id: number) =>
    setPlayerFields(playerFields.filter((f) => f.id !== id));

  const insertAtCursor = (setText: (val: string) => void, elementId: string, textToInsert: string) => {
    const el = document.getElementById(elementId) as HTMLTextAreaElement | null;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setText(before + textToInsert + after);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + textToInsert.length,
        start + textToInsert.length
      );
    }, 0);
  };

  const generatePreview = () => {
    let finalStr = generalFormat || "";
    fields.forEach((f) => {
      const regex = new RegExp(`\\[${f.name}\\]`, "g");
      finalStr = finalStr.replace(regex, `Sample ${f.name}`);
    });

    // The line break between General Format and Players will depend purely on the user's input.

    let block = playerFormat || "";
    block = block.replace(/\[NAME\]/g, "taeyong");
    block = block.replace(/\[STEAMID\]/g, "STEAM_1:1:14174552");
    block = block.replace(/\[STEAMID64\]/g, "76561197988614833");
    block = block.replace(
      /\[STEAMURL\]/g,
      "https://steamcommunity.com/profiles/76561197988614833"
    );
    block = block.replace(/\[ROLE\]/g, defaultRole || "Member");

    playerFields.forEach((f) => {
      const regex = new RegExp(`\\[${f.name}\\]`, "g");
      block = block.replace(regex, `Sample ${f.name}`);
    });

    if (finalStr && !finalStr.endsWith("\n")) {
      finalStr += "\n";
    }
    finalStr += block;
    return finalStr;
  };

  const generateLink = () => {
    const payload = {
      fields: fields.map((f) => ({
        name: f.name,
        type: f.type,
        options: f.options,
      })),
      playerFields: playerFields.map((f) => ({
        name: f.name,
        type: f.type,
        options: f.options,
      })),
      generalFormat,
      playerFormat,
      maxPlayers: Number(maxPlayers) || 8,
      defaultRole,
    };
    const compressed = LZString.compressToEncodedURIComponent(
      JSON.stringify(payload)
    );
    const url = `${window.location.origin}/#${compressed}`;
    setShareLink(url);
    setCopied(false);
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="flex-col gap-6"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div className="glass-panel" style={{ padding: "2rem" }}>
        <h2
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ color: "var(--primary)" }}>1.</span> Team Custom Fields
        </h2>

        <div className="flex-col gap-4" style={{ marginBottom: "1.5rem" }}>
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex gap-4 items-center"
              style={{ flexWrap: "wrap" }}
            >
              <input
                className="input-base"
                style={{ flex: "1 1 200px" }}
                value={field.name}
                onChange={(e) => updateField(field.id, "name", e.target.value)}
                placeholder="Field Name (e.g. Region)"
              />
              <select
                className="input-base"
                style={{ flex: "0 0 150px" }}
                value={field.type}
                onChange={(e) => updateField(field.id, "type", e.target.value)}
              >
                <option value="text">Text Input</option>
                <option value="select">Select Dropdown</option>
              </select>

              {field.type === "select" && (
                <input
                  className="input-base"
                  style={{ flex: "2 1 200px" }}
                  value={field.options}
                  onChange={(e) =>
                    updateField(field.id, "options", e.target.value)
                  }
                  placeholder="Options (comma separated)"
                />
              )}

              <button
                className="btn-icon btn-danger"
                onClick={() => removeField(field.id)}
                title="Remove Field"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <button className="btn btn-secondary" onClick={addField}>
          <Plus size={18} /> Add Field
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "2rem" }}>
        <h2
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ color: "var(--primary)" }}>2.</span> Player-Specific
          Fields
        </h2>
        <p className="text-muted text-sm mb-4">
          These fields will appear for each player you add (e.g. Discord). You
          can reference them inside the player format simply by their name, like{" "}
          <code style={{ color: "var(--primary)" }}>[Discord]</code>.
        </p>

        <div className="flex-col gap-4" style={{ marginBottom: "1.5rem" }}>
          {playerFields.map((field) => (
            <div
              key={field.id}
              className="flex gap-4 items-center"
              style={{ flexWrap: "wrap" }}
            >
              <input
                className="input-base"
                style={{ flex: "1 1 200px" }}
                value={field.name}
                onChange={(e) =>
                  updatePlayerField(field.id, "name", e.target.value)
                }
                placeholder="Field Name (e.g. Discord)"
              />
              <select
                className="input-base"
                style={{ flex: "0 0 150px" }}
                value={field.type}
                onChange={(e) =>
                  updatePlayerField(field.id, "type", e.target.value)
                }
              >
                <option value="text">Text Input</option>
                <option value="select">Select Dropdown</option>
              </select>

              {field.type === "select" && (
                <input
                  className="input-base"
                  style={{ flex: "2 1 200px" }}
                  value={field.options}
                  onChange={(e) =>
                    updatePlayerField(field.id, "options", e.target.value)
                  }
                  placeholder="Options (comma separated)"
                />
              )}

              <button
                className="btn-icon btn-danger"
                onClick={() => removePlayerField(field.id)}
                title="Remove Field"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <button className="btn btn-secondary" onClick={addPlayerField}>
          <Plus size={18} /> Add Player Field
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "2rem" }}>
        <h2
          style={{
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ color: "var(--primary)" }}>3.</span> Layout & Format
        </h2>

        <div
          style={{
            marginBottom: "2rem",
            padding: "1rem",
            background: "rgba(0,0,0,0.2)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <h3 className="text-sm font-semibold mb-3 text-primary">
            Default Tags & Sample Values
          </h3>
          <ul
            style={{
              listStyleType: "disc",
              paddingLeft: "1.5rem",
              fontSize: "0.875rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              margin: 0,
              marginTop: "1rem",
            }}
          >
            <li>
              <code style={{ color: "var(--primary)" }}>[NAME]</code> = taeyong
            </li>
            <li>
              <code style={{ color: "var(--primary)" }}>[STEAMID]</code> =
              STEAM_1:1:14174552
            </li>
            <li>
              <code style={{ color: "var(--primary)" }}>[STEAMID64]</code> =
              76561197988614833
            </li>
            <li style={{ wordBreak: "break-all" }}>
              <code style={{ color: "var(--primary)" }}>[STEAMURL]</code> =
              https://steamcommunity.com/profiles/76561197988614833
            </li>
            <li>
              <code style={{ color: "var(--primary)" }}>[ROLE]</code> = Member
            </li>
          </ul>
        </div>
        <div className="flex gap-4 mb-6" style={{ flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label className="text-sm text-muted font-medium block mb-2">
              Max Players Allowed
            </label>
            <input
              type="number"
              className="input-base"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 8)}
              min="1"
              max="20"
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label className="text-sm text-muted font-medium block mb-2">
              Default Player Role
            </label>
            <input
              type="text"
              className="input-base"
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value)}
              placeholder="e.g. Member"
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
            marginTop: "2rem",
          }}
        >
          <div>
            <h3 className="text-sm font-semibold mb-2">General Format</h3>
            <p className="text-muted text-xs mb-2">
              Click a tag to insert it at your cursor:
            </p>
            <div className="flex gap-2 flex-wrap mb-3">
              {fields.map((f) => (
                <button
                  key={f.id}
                  onClick={() =>
                    insertAtCursor(
                      setGeneralFormat,
                      "generalFormat",
                      `[${f.name}]`
                    )
                  }
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--primary)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    color: "var(--primary)",
                  }}
                >
                  [{f.name}]
                </button>
              ))}
            </div>
            <textarea
              id="generalFormat"
              className="input-base"
              style={{
                minHeight: "150px",
                fontFamily: "monospace",
                resize: "vertical",
              }}
              value={generalFormat}
              onChange={(e) => setGeneralFormat(e.target.value)}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Base Player Format</h3>
            <p className="text-muted text-xs mb-2">
              This block repeats for each player. Click a tag to insert:
            </p>
            <div className="flex gap-2 flex-wrap mb-3">
              {["NAME", "STEAMID", "STEAMID64", "STEAMURL", "ROLE"].map(
                (tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      insertAtCursor(
                        setPlayerFormat,
                        "playerFormat",
                        `[${tag}]`
                      )
                    }
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.2rem 0.5rem",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--primary)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: "var(--primary)",
                    }}
                  >
                    [{tag}]
                  </button>
                )
              )}
              {playerFields.map((f) => (
                <button
                  key={f.id}
                  onClick={() =>
                    insertAtCursor(
                      setPlayerFormat,
                      "playerFormat",
                      `[${f.name}]`
                    )
                  }
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px dashed var(--primary)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    color: "var(--primary)",
                  }}
                >
                  [{f.name}]
                </button>
              ))}
            </div>
            <textarea
              id="playerFormat"
              className="input-base"
              style={{
                minHeight: "150px",
                fontFamily: "monospace",
                resize: "vertical",
              }}
              value={playerFormat}
              onChange={(e) => setPlayerFormat(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <h3 className="text-sm font-semibold mb-2">Live Preview</h3>
          <div
            className="input-base"
            style={{
              minHeight: "100px",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-light)",
            }}
          >
            {generatePreview()}
          </div>
        </div>
      </div>

      <div
        className="glass-panel"
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
          textAlign: "center",
        }}
      >
        <div>
          <h2 style={{ marginBottom: "0.5rem" }}>Ready to Share?</h2>
          <p className="text-muted text-sm">
            Generate a direct link to your registration form. No database
            required.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={generateLink}
          style={{ fontSize: "1.1rem", padding: "1rem 2rem" }}
        >
          <Link size={20} /> Generate Shareable Link
        </button>

        {shareLink && (
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div className="flex gap-2">
              <input
                className="input-base"
                readOnly
                value={shareLink}
                style={{
                  background: "rgba(0,0,0,0.5)",
                  borderColor: "var(--primary)",
                }}
              />
              <button
                className="btn btn-secondary"
                onClick={copyLink}
                style={{ minWidth: "120px" }}
              >
                {copied ? (
                  <Check size={18} className="text-primary" />
                ) : (
                  <Copy size={18} />
                )}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
            <a
              href={shareLink}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "0.875rem" }}
            >
              Open in new tab ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
