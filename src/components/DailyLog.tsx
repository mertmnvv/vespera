"use client";

import React from "react";
import { Calendar, BarChart3 } from "lucide-react";
import type { StudySession } from "./CalendarView";

interface DailyLogProps {
  todaySessions: StudySession[];
  subjectLabels: Record<string, string>;
  onOpenCalendar: () => void;
  onOpenSummary: () => void;
}

export default function DailyLog({
  todaySessions,
  subjectLabels,
  onOpenCalendar,
  onOpenSummary,
}: DailyLogProps) {
  // Aggregate minutes per subject for today
  const subjectMinutes: Record<string, number> = {};
  let totalMinutes = 0;

  todaySessions.forEach((s) => {
    totalMinutes += s.minutes;
    s.subjects.forEach((subId) => {
      subjectMinutes[subId] = (subjectMinutes[subId] || 0) + s.minutes;
    });
  });

  const sortedSubjects = Object.entries(subjectMinutes).sort(
    (a, b) => b[1] - a[1]
  );

  const maxMinutes = sortedSubjects.length > 0 ? sortedSubjects[0][1] : 1;

  return (
    <div className="glass-card p-5 w-full">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-cyan-500 inline-block" />
          Bugün
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenCalendar}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-zinc-800/40 hover:border-zinc-700/50 transition-all"
            title="Takvim"
          >
            <Calendar size={13} />
            <span>Takvim</span>
          </button>
          <button
            onClick={onOpenSummary}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-zinc-800/40 hover:border-zinc-700/50 transition-all"
            title="Toplam Döküm"
          >
            <BarChart3 size={13} />
            <span>Döküm</span>
          </button>
        </div>
      </div>

      {/* Today's total */}
      {totalMinutes > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
          <span className="text-xs text-zinc-500">Toplam:</span>
          <span className="text-sm font-medium text-cyan-400 tabular-nums">
            {Math.floor(totalMinutes / 60) > 0
              ? `${Math.floor(totalMinutes / 60)} saat ${totalMinutes % 60} dk`
              : `${totalMinutes} dk`}
          </span>
          <span className="text-xs text-zinc-600 ml-auto">
            {todaySessions.length} oturum
          </span>
        </div>
      )}

      {/* Per-subject bars */}
      {sortedSubjects.length > 0 ? (
        <div className="space-y-2.5">
          {sortedSubjects.map(([subId, mins]) => {
            const pct = (mins / maxMinutes) * 100;
            return (
              <div key={subId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-300">
                    {subjectLabels[subId] || subId}
                  </span>
                  <span className="text-xs text-zinc-500 tabular-nums">
                    {mins} dk
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      background:
                        "linear-gradient(90deg, rgba(34,211,238,0.4), rgba(129,140,248,0.5))",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-600 italic text-center py-4">
          Henüz bugün tamamlanmış oturum yok
        </p>
      )}

      {/* Session list */}
      {todaySessions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-800/30 space-y-1">
          {todaySessions.map((session, idx) => {
            const time = new Date(session.completedAt);
            const timeStr = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
            return (
              <div
                key={idx}
                className="flex items-center gap-2 text-[11px] text-zinc-500 px-2 py-1.5 rounded-lg hover:bg-zinc-800/20 transition-colors"
              >
                <span className="text-zinc-600 shrink-0 tabular-nums">
                  {timeStr}
                </span>
                <span className="text-zinc-400 truncate">
                  {session.subjects
                    .map((s) => subjectLabels[s] || s)
                    .join(", ")}
                </span>
                <span className="ml-auto text-cyan-400/70 shrink-0 tabular-nums">
                  {session.minutes}dk
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
