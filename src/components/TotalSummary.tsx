"use client";

import React from "react";
import type { StudyLogs } from "./CalendarView";
import StudyDonutChart from "./StudyDonutChart";

interface TotalSummaryProps {
  logs: StudyLogs;
  subjectLabels: Record<string, string>;
  onClose: () => void;
}

export default function TotalSummary({
  logs,
  subjectLabels,
  onClose,
}: TotalSummaryProps) {
  // Aggregate all data
  const allSubjectMinutes: Record<string, number> = {};
  let totalMinutes = 0;
  let totalSessions = 0;
  let totalDays = 0;

  Object.entries(logs).forEach(([, sessions]) => {
    if (sessions.length === 0) return;
    totalDays++;
    sessions.forEach((s) => {
      totalSessions++;
      totalMinutes += s.minutes;
      s.subjects.forEach((subId) => {
        allSubjectMinutes[subId] = (allSubjectMinutes[subId] || 0) + s.minutes;
      });
    });
  });

  const sortedSubjects = Object.entries(allSubjectMinutes).sort(
    (a, b) => b[1] - a[1]
  );

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  // Find max for bar widths
  const maxMinutes = sortedSubjects.length > 0 ? sortedSubjects[0][1] : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
      <div className="glass-card w-full max-w-md max-h-[90dvh] overflow-y-auto p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-zinc-500 inline-block" />
            Toplam Döküm
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm px-2 py-1 rounded-lg hover:bg-zinc-800/50"
          >
            Kapat
          </button>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/40">
            <span className="text-xl font-light text-zinc-250 tabular-nums">
              {totalDays}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Gün
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/40">
            <span className="text-xl font-light text-zinc-300 tabular-nums">
              {totalSessions}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Oturum
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/40">
            <span className="text-xl font-light text-zinc-200 tabular-nums">
              {totalHours > 0 ? `${totalHours}s ${remainingMins}dk` : `${remainingMins}dk`}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Toplam
            </span>
          </div>
        </div>

        {/* Interactive Donut Chart */}
        <div className="mb-6 animate-fade-in-up">
          <StudyDonutChart logs={logs} subjectLabels={subjectLabels} />
        </div>

        {/* Per-subject breakdown */}
        {sortedSubjects.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">
              Ders Bazlı Döküm
            </p>
            {sortedSubjects.map(([subId, mins]) => {
              const hours = Math.floor(mins / 60);
              const m = mins % 60;
              const timeStr = hours > 0 ? `${hours}s ${m}dk` : `${m}dk`;
              const pct = (mins / maxMinutes) * 100;

              return (
                <div key={subId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">
                      {subjectLabels[subId] || subId}
                    </span>
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {timeStr}
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${pct}%`,
                        background:
                          "linear-gradient(90deg, rgba(75,75,75,0.4), rgba(191,191,191,0.5))",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-600 italic text-center py-8">
            Henüz kayıtlı oturum yok
          </p>
        )}

        {/* Daily average */}
        {totalDays > 0 && (
          <div className="mt-5 pt-4 border-t border-zinc-800/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Günlük ortalama</span>
              <span className="text-zinc-300 tabular-nums">
                {Math.round(totalMinutes / totalDays)} dk/gün
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-zinc-500">Oturum başına ortalama</span>
              <span className="text-zinc-300 tabular-nums">
                {totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0} dk
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
