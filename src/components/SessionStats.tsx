"use client";

import React from "react";
import { Trophy, Flame } from "lucide-react";

interface SessionStatsProps {
  completedSessions: number;
  totalMinutes: number;
}

export default function SessionStats({
  completedSessions,
  totalMinutes,
}: SessionStatsProps) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return (
    <div className="glass-card p-4 w-full">
      <div className="flex items-center justify-around gap-4">
        {/* Sessions */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Flame size={16} className="text-zinc-450" />
            <span className="text-2xl font-light tabular-nums">
              {completedSessions}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">
            Oturum
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-zinc-800/60" />

        {/* Total time */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Trophy size={16} className="text-zinc-450" />
            <span className="text-2xl font-light tabular-nums">
              {hours > 0 ? `${hours}s ${mins}dk` : `${mins}dk`}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">
            Toplam Çalışma
          </span>
        </div>
      </div>
    </div>
  );
}
