"use client";

import React, { useState, useEffect } from "react";
import { Copy, Plus, LogIn, LogOut, Check, ArrowRight } from "lucide-react";
import { User } from "firebase/auth";

export interface RoomMember {
  uid: string;
  email: string;
  displayName: string;
  secondsLeft: number;
  mode: "work" | "break";
  isRunning: boolean;
  selectedSubjects: string[];
  lastActive: number;
}

interface StudyRoomPanelProps {
  currentUser: User | null;
  currentRoomId: string | null;
  roomMembers: RoomMember[];
  subjectLabels: Record<string, string>;
  onAuthPrompt: () => void;
  onJoinRoom: (roomId: string) => Promise<boolean>;
  onCreateRoom: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
}

export default function StudyRoomPanel({
  currentUser,
  currentRoomId,
  roomMembers,
  subjectLabels,
  onAuthPrompt,
  onJoinRoom,
  onCreateRoom,
  onLeaveRoom,
}: StudyRoomPanelProps) {
  const [roomInput, setRoomInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCopyCode = () => {
    if (!currentRoomId) return;
    navigator.clipboard.writeText(currentRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomInput.trim().toUpperCase();
    if (!code) return;

    setError("");
    setJoining(true);
    try {
      const success = await onJoinRoom(code);
      if (success) {
        setRoomInput("");
      } else {
        setError("Oda bulunamadı. Lütfen kodu kontrol edin.");
      }
    } catch {
      setError("Odaya katılırken bir hata oluştu.");
    } finally {
      setJoining(false);
    }
  };

  const handleCreate = async () => {
    setError("");
    setCreating(true);
    try {
      await onCreateRoom();
    } catch {
      setError("Oda oluşturulurken bir hata oluştu.");
    } finally {
      setCreating(false);
    }
  };

  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNow(Date.now());
    }, 0);
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Helper to format remaining seconds into display
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;
  };

  // Only display members that are active (updated within the last 35 seconds)
  const activeMembers = roomMembers.filter(
    (member) => now - member.lastActive < 35000
  );

  return (
    <div className="glass-card p-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-zinc-500 inline-block" />
          Ortak Çalışma Odası
        </h2>
        {currentRoomId && (
          <span className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
            {activeMembers.length} Aktif
          </span>
        )}
      </div>

      {/* Guest/Not Logged In View */}
      {!currentUser ? (
        <div className="text-center py-4 space-y-3">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Ortak çalışma odasına katılarak diğer öğrencilerle gerçek zamanlı odaklanabilir ve birbirinizin durumunu görebilirsiniz.
          </p>
          <button
            onClick={onAuthPrompt}
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-zinc-950 bg-zinc-200 hover:bg-zinc-100 px-4 py-2 rounded-lg transition-all active:scale-95 cursor-pointer"
          >
            <LogIn size={13} />
            Giriş Yap / Kaydol
          </button>
        </div>
      ) : (
        <>
          {/* Main Content Area */}
          {!currentRoomId ? (
            /* Join or Create Area */
            <div className="space-y-4 py-2">
              {error && (
                <div className="text-[11px] text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg p-2.5 text-center">
                  {error}
                </div>
              )}

              {/* Join Room Form */}
              <form onSubmit={handleJoin} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Oda Kodu (örn: A7B9X2)"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  maxLength={10}
                  disabled={joining || creating}
                  className="flex-1 text-sm bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700/50 focus:border-zinc-500/50 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-500/25 transition-all uppercase"
                />
                <button
                  type="submit"
                  disabled={!roomInput.trim() || joining || creating}
                  className="px-3 rounded-lg bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-7 hover:text-zinc-100 text-zinc-350 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
                  title="Odaya Katıl"
                >
                  {joining ? (
                    <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center justify-center gap-3 text-zinc-650 my-1">
                <div className="h-px bg-zinc-800/40 flex-grow" />
                <span className="text-[9px] uppercase tracking-wider font-semibold">veya</span>
                <div className="h-px bg-zinc-800/40 flex-grow" />
              </div>

              {/* Create Room Button */}
              <button
                type="button"
                onClick={handleCreate}
                disabled={joining || creating}
                className="w-full py-2 rounded-lg bg-zinc-900/40 border border-zinc-800/60 hover:bg-zinc-800/60 hover:border-zinc-700/50 text-zinc-300 hover:text-zinc-100 font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {creating ? (
                  <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                <span>Yeni Oda Oluştur</span>
              </button>
            </div>
          ) : (
            /* Inside Room Area */
            <div className="space-y-4">
              {/* Room Code Info Card */}
              <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-550 uppercase tracking-wider block font-medium">Oda Kodu</span>
                  <span className="text-sm font-bold tracking-widest text-zinc-200 uppercase">{currentRoomId}</span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/20 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  <span>{copied ? "Kopyalandı!" : "Kopyala"}</span>
                </button>
              </div>

              {/* Members List */}
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {activeMembers.map((member) => {
                  const isSelf = member.uid === currentUser.uid;
                  const isStudying = member.isRunning && member.mode === "work";
                  const displayStatus = member.mode === "work" ? "Çalışıyor" : "Molada";

                  return (
                    <div
                      key={member.uid}
                      className={`flex flex-col gap-1.5 p-2.5 rounded-lg border text-left transition-all ${
                        isSelf
                          ? "bg-zinc-800/10 border-zinc-750/30"
                          : "bg-zinc-900/20 border-transparent hover:border-zinc-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isStudying
                                ? "bg-zinc-100 shadow-[0_0_8px_rgba(255,255,255,0.7)] animate-pulse"
                                : "bg-zinc-600"
                            }`}
                          />
                          <span className="text-xs font-semibold text-zinc-200 max-w-[130px] truncate">
                            {member.displayName}
                            {isSelf && <span className="text-[10px] text-zinc-500 font-normal ml-1">(Sen)</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 font-medium">{displayStatus}</span>
                          <span className="text-xs font-mono font-bold text-zinc-300">
                            {formatTime(member.secondsLeft)}
                          </span>
                        </div>
                      </div>

                      {/* Subjects list */}
                      {member.selectedSubjects && member.selectedSubjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {member.selectedSubjects.map((sId) => {
                            const label = subjectLabels[sId] || sId;
                            return (
                              <span
                                key={sId}
                                className="text-[9px] bg-zinc-900/60 border border-zinc-800/50 text-zinc-400 px-1.5 py-0.5 rounded"
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[9px] text-zinc-600 italic">Ders seçilmedi</div>
                      )}
                    </div>
                  );
                })}

                {activeMembers.length === 0 && (
                  <p className="text-xs text-zinc-600 italic text-center py-4">Oda şu anda boş.</p>
                )}
              </div>

              {/* Leave Room Button */}
              <button
                type="button"
                onClick={onLeaveRoom}
                className="w-full py-2 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-300 font-medium text-xs transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
              >
                <LogOut size={13} />
                <span>Odadan Ayrıl</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
