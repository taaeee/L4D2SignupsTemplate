"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Users, Shield, Send, Plus, Trash2, LogOut, X, Search } from "lucide-react";

export default function TemplateFiller({ template }) {
  const [customValues, setCustomValues] = useState({});
  const [players, setPlayers] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const [session, setSession] = useState(null);
  const [friends, setFriends] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFriends = friends.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const maxPlayers = template.maxPlayers || 8;
  const defaultRole = template.defaultRole || "Member";

  useEffect(() => {
    // Fetch session
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setSession(data.user);
          setIsLoadingFriends(true);
          fetch("/api/steam/friends")
            .then(res => res.json())
            .then(friendData => {
              if (friendData.friends) setFriends(friendData.friends);
              setIsLoadingFriends(false);
            })
            .catch(() => setIsLoadingFriends(false));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Initialize general custom values
    const initVals = {};
    if (template.fields) {
      template.fields.forEach(f => {
        initVals[f.name] = "";
        if (f.type === "select" && f.options) {
          initVals[f.name] = f.options.split(',')[0].trim();
        }
      });
    }
    setCustomValues(initVals);
    
    // Initialize with 1 player
    addPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const handleLogin = () => {
    window.location.href = "/api/auth/login?returnHash=" + encodeURIComponent(window.location.hash);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    setFriends([]);
  };

  const addFriendToRoster = (friend) => {
    if (players.length >= maxPlayers) return;
    
    const pCustom = {};
    if (template.playerFields) {
      template.playerFields.forEach(f => {
        pCustom[f.name] = "";
        if (f.type === "select" && f.options) {
          pCustom[f.name] = f.options.split(',')[0].trim();
        }
      });
    }
    
    setPlayers(prev => [...prev, { 
      name: friend.name, 
      url: friend.profileUrl || `https://steamcommunity.com/profiles/${friend.steamId}`, 
      custom: pCustom, 
      role: defaultRole, 
      isCustomRole: false 
    }]);
    
    setIsModalOpen(false);
  };

  const addPlayer = () => {
    if (players.length >= maxPlayers) return;
    
    const pCustom = {};
    if (template.playerFields) {
      template.playerFields.forEach(f => {
        pCustom[f.name] = "";
        if (f.type === "select" && f.options) {
          pCustom[f.name] = f.options.split(',')[0].trim();
        }
      });
    }
    
    setPlayers(prev => [...prev, { name: "", url: "", custom: pCustom, role: defaultRole, isCustomRole: false }]);
  };

  const removePlayer = (index) => {
    setPlayers(prev => prev.filter((_, i) => i !== index));
    setResult("");
  };

  const updateCustomValue = (name, value) => {
    setCustomValues(prev => ({ ...prev, [name]: value }));
  };

  const updatePlayer = (index, key, value) => {
    const newPlayers = [...players];
    newPlayers[index][key] = value;
    setPlayers(newPlayers);
  };

  const updatePlayerCustomValue = (index, key, value) => {
    const newPlayers = [...players];
    newPlayers[index].custom[key] = value;
    setPlayers(newPlayers);
  };

  const toggleCustomRole = (index) => {
    const newPlayers = [...players];
    const isCustom = !newPlayers[index].isCustomRole;
    newPlayers[index].isCustomRole = isCustom;
    if (!isCustom) {
      newPlayers[index].role = defaultRole;
    } else {
      newPlayers[index].role = ""; // Clear so they can type
    }
    setPlayers(newPlayers);
  };

  const generateRegistration = async () => {
    setLoading(true);
    setError("");
    setResult("");
    
    try {
      const urls = players.map(p => p.url).filter(Boolean);
      
      const res = await fetch("/api/steam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch Steam data.");
      }
      
      // 1. Substitute General Format Custom Fields
      let finalStr = template.generalFormat || "";
      if (template.fields) {
        template.fields.forEach(f => {
          const regex = new RegExp(`\\[${f.name}\\]`, 'g');
          finalStr = finalStr.replace(regex, customValues[f.name] || "");
        });
      }
      
      // Ensure there's a line break between general format and players
      if (finalStr && !finalStr.endsWith("\n")) {
        finalStr += "\n";
      }

      // 2. Process Each Player using playerFormat
      const playerBlocks = players.map((p) => {
        let block = template.playerFormat || "";
        
        const steamMapping = p.url ? (data.mappings[p.url] || {}) : {};
        const steamID = steamMapping.steamid || (p.url ? "[INVALID_URL]" : "");
        const steam64 = steamMapping.steam64 || "";
        const steamUrlOutput = steam64 ? `https://steamcommunity.com/profiles/${steam64}` : p.url;
        
        block = block.replace(/\[NAME\]/g, p.name);
        block = block.replace(/\[STEAMID\]/g, steamID);
        block = block.replace(/\[STEAMID64\]/g, steam64);
        block = block.replace(/\[STEAMURL\]/g, steamUrlOutput);
        block = block.replace(/\[ROLE\]/g, p.role || defaultRole);
        
        if (template.playerFields) {
          template.playerFields.forEach(f => {
            const regex = new RegExp(`\\[${f.name}\\]`, 'g');
            block = block.replace(regex, p.custom[f.name] || "");
          });
        }
        
        return block;
      });
      
      finalStr += playerBlocks.join("\n");
      
      setResult(finalStr.trim());
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Session Header */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {session ? (
            <>
              <img src={session.avatar} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--primary-glow)' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{session.name}</h3>
                <span className="text-muted text-sm">Authenticated via Steam</span>
              </div>
            </>
          ) : (
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Not Logged In</h3>
              <span className="text-muted text-sm">Log in to add players from your friend list</span>
            </div>
          )}
        </div>
        {session ? (
          <button className="btn btn-secondary" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogOut size={18} /> Logout
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleLogin}>
            Login with Steam
          </button>
        )}
      </div>

      {template.fields && template.fields.length > 0 && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield className="text-primary" /> General Information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {template.fields.map(field => (
              <div key={field.name} className="flex-col gap-2">
                <label className="text-sm text-muted font-medium">{field.name}</label>
                {field.type === "select" ? (
                  <select
                    className="input-base"
                    value={customValues[field.name] || ""}
                    onChange={(e) => updateCustomValue(field.name, e.target.value)}
                  >
                    {field.options.split(',').map(opt => {
                      const trimmed = opt.trim();
                      return <option key={trimmed} value={trimmed}>{trimmed}</option>;
                    })}
                  </select>
                ) : (
                  <input
                    className="input-base"
                    value={customValues[field.name] || ""}
                    onChange={(e) => updateCustomValue(field.name, e.target.value)}
                    placeholder={`Enter ${field.name}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Users className="text-primary" /> Roster ({players.length}/{maxPlayers})
          </h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {session && (
              <button 
                className="btn btn-secondary" 
                onClick={() => setIsModalOpen(true)}
                disabled={players.length >= maxPlayers || isLoadingFriends}
              >
                <Users size={18} /> Add from Friends
              </button>
            )}
            <button 
              className="btn btn-secondary" 
              onClick={addPlayer} 
              disabled={players.length >= maxPlayers}
            >
              <Plus size={18} /> Add Player
            </button>
          </div>
        </div>
        
        <div className="flex-col gap-4">
          {players.map((p, index) => (
            <div key={index} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-primary">Player {index + 1}</h3>
                <button className="btn-icon btn-danger" onClick={() => removePlayer(index)}>
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    id={`customRole-${index}`} 
                    checked={p.isCustomRole} 
                    onChange={() => toggleCustomRole(index)} 
                  />
                  <label htmlFor={`customRole-${index}`} className="text-sm text-muted cursor-pointer">Custom Role</label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {p.isCustomRole && (
                    <input
                      className="input-base"
                      placeholder="Enter Role (e.g. Captain)"
                      value={p.role}
                      onChange={(e) => updatePlayer(index, "role", e.target.value)}
                      style={{ borderColor: 'var(--primary-hover)' }}
                    />
                  )}
                  <input
                    className="input-base"
                    placeholder="In-Game Name"
                    value={p.name}
                    onChange={(e) => updatePlayer(index, "name", e.target.value)}
                  />
                  <input
                    className="input-base"
                    placeholder="Steam Profile URL"
                    value={p.url}
                    onChange={(e) => updatePlayer(index, "url", e.target.value)}
                  />
                  
                  {template.playerFields && template.playerFields.map(field => (
                    field.type === "select" ? (
                      <select
                        key={field.name}
                        className="input-base"
                        value={p.custom[field.name] || ""}
                        onChange={(e) => updatePlayerCustomValue(index, field.name, e.target.value)}
                      >
                        {field.options.split(',').map(opt => {
                          const trimmed = opt.trim();
                          return <option key={trimmed} value={trimmed}>{trimmed}</option>;
                        })}
                      </select>
                    ) : (
                      <input
                        key={field.name}
                        className="input-base"
                        value={p.custom[field.name] || ""}
                        onChange={(e) => updatePlayerCustomValue(index, field.name, e.target.value)}
                        placeholder={`Enter ${field.name}`}
                      />
                    )
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
        <button 
          className="btn btn-primary" 
          onClick={generateRegistration}
          disabled={loading || players.length === 0}
          style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
        >
          {loading ? "Processing..." : <><Send size={20} /> Generate Registration</>}
        </button>
      </div>
      
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '1rem' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-primary">Generated Registration</h2>
            <button className="btn btn-secondary" onClick={copyResult}>
              {copied ? <Check size={18} className="text-primary" /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            className="input-base"
            style={{ minHeight: '300px', fontFamily: 'monospace', resize: 'vertical', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--primary-glow)' }}
            value={result}
            readOnly
          />
        </div>
      )}

      {/* Friends Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          padding: '2rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users className="text-primary" /> Select Friend</h2>
              <button className="btn-icon text-muted" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.1)' }}>
              <Search size={18} className="text-muted" />
              <input 
                type="text" 
                placeholder="Search friends by name..." 
                className="input-base" 
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '0.2rem', boxShadow: 'none' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {isLoadingFriends ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading friends...</div>
              ) : friends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>No friends found or failed to load.</div>
              ) : filteredFriends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No friends match "{searchQuery}"</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                  {filteredFriends.map(friend => (
                    <div 
                      key={friend.steamId}
                      onClick={() => addFriendToRoster(friend)}
                      style={{
                        padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)', cursor: 'pointer', textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-glow)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                    >
                      <img src={friend.avatar} alt={friend.name} style={{ width: '64px', height: '64px', borderRadius: '50%', marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={friend.name}>{friend.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
