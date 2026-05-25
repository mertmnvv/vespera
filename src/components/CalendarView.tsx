"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface StudySession {
  subjects: string[];
  minutes: number;
  completedAt: number;
}

export type StudyLogs = Record<string, StudySession[]>;

interface CalendarViewProps {
  logs: StudyLogs;
  subjectLabels: Record<string, string>;
  onClose: () => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // 0=Sun, convert to Mon-start: Mon=0, Sun=6
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getTotalMinutesForDay(logs: StudyLogs, dateKey: string): number {
  const sessions = logs[dateKey];
  if (!sessions) return 0;
  return sessions.reduce((sum, s) => sum + s.minutes, 0);
}

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const DAY_NAMES = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

export default function CalendarView({
  logs,
  subjectLabels,
  onClose,
}: CalendarViewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  );

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  // Build the selected day's detail
  const selectedSessions = selectedDate ? logs[selectedDate] || [] : [];

  // Aggregate minutes per subject for selected day
  const subjectMinutes: Record<string, number> = {};
  selectedSessions.forEach((s) => {
    s.subjects.forEach((subId) => {
      subjectMinutes[subId] = (subjectMinutes[subId] || 0) + s.minutes;
    });
  });

  const selectedTotalMinutes = selectedSessions.reduce(
    (sum, s) => sum + s.minutes,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
      <div className="glass-card w-full max-w-md max-h-[90dvh] overflow-y-auto p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-violet-500 inline-block" />
            Takvim
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm px-2 py-1 rounded-lg hover:bg-zinc-800/50"
          >
            Kapat
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-zinc-200">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day names row */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] uppercase tracking-wider text-zinc-600 py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 mb-5">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateKey = formatDateKey(viewYear, viewMonth, day);
            const minutesStudied = getTotalMinutesForDay(logs, dateKey);
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;
            const hasData = minutesStudied > 0;

            // Intensity level for the heat indicator
            let intensityClass = "";
            if (minutesStudied >= 120) intensityClass = "bg-indigo-500/50";
            else if (minutesStudied >= 60) intensityClass = "bg-indigo-500/35";
            else if (minutesStudied >= 20) intensityClass = "bg-indigo-500/20";
            else if (minutesStudied > 0) intensityClass = "bg-indigo-500/10";

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateKey)}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-lg
                  text-xs transition-all duration-200 relative
                  ${isSelected ? "ring-1 ring-indigo-500/60 bg-indigo-500/15" : ""}
                  ${isToday && !isSelected ? "ring-1 ring-zinc-600" : ""}
                  ${!isSelected && hasData ? intensityClass : ""}
                  ${!isSelected && !hasData ? "hover:bg-zinc-800/40" : ""}
                  ${hasData ? "text-zinc-200" : "text-zinc-500"}
                `}
              >
                <span className={isToday ? "font-semibold" : ""}>{day}</span>
                {hasData && (
                  <span className="text-[8px] text-indigo-400 mt-0.5 leading-none">
                    {minutesStudied}dk
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day detail */}
        {selectedDate && (
          <div className="border-t border-zinc-800/50 pt-4">
            <h3 className="text-xs font-medium text-zinc-400 mb-3">
              {selectedDate === todayKey ? "Bugün" : selectedDate}
              {selectedTotalMinutes > 0 && (
                <span className="ml-2 text-indigo-400">
                  — {selectedTotalMinutes} dakika
                </span>
              )}
            </h3>

            {Object.keys(subjectMinutes).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(subjectMinutes)
                  .sort((a, b) => b[1] - a[1])
                  .map(([subId, mins]) => (
                    <div key={subId} className="flex items-center gap-3">
                      {/* Subject bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-zinc-300 truncate">
                            {subjectLabels[subId] || subId}
                          </span>
                          <span className="text-xs text-zinc-500 ml-2 shrink-0">
                            {mins} dk
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500/60 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (mins / Math.max(selectedTotalMinutes, 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic">
                Bu gün için kayıt yok
              </p>
            )}

            {/* Session details */}
            {selectedSessions.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
                  Oturum Detayları
                </p>
                {selectedSessions.map((session, idx) => {
                  const time = new Date(session.completedAt);
                  const timeStr = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-zinc-500 px-2 py-1.5 rounded-lg bg-zinc-800/20"
                    >
                      <span className="text-zinc-600 shrink-0">{timeStr}</span>
                      <span className="text-zinc-400">
                        {session.subjects
                          .map((s) => subjectLabels[s] || s)
                          .join(", ")}
                      </span>
                      <span className="ml-auto text-indigo-400 shrink-0">
                        {session.minutes}dk
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
