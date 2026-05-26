"use client";

import React, { useState } from "react";

interface StudySession {
  subjects: string[];
  minutes: number;
  completedAt: number;
}

type StudyLogs = Record<string, StudySession[]>;

interface StudyDonutChartProps {
  logs: StudyLogs;
  subjectLabels: Record<string, string>;
}

const MONOCHROME_COLORS = [
  "#ffffff", // En çok çalışılan (Beyaz)
  "#bfbfbf", // Açık Gri
  "#7d7d7d", // Orta Gri
  "#4b4b4b", // Koyu Orta Gri
  "#2e2e2e", // Koyu Gri
];

export default function StudyDonutChart({ logs, subjectLabels }: StudyDonutChartProps) {
  // Aggregate all data
  const subjectMinutes: Record<string, number> = {};
  let totalMinutes = 0;

  Object.values(logs).forEach((sessions) => {
    sessions.forEach((s) => {
      totalMinutes += s.minutes;
      s.subjects.forEach((subId) => {
        subjectMinutes[subId] = (subjectMinutes[subId] || 0) + s.minutes;
      });
    });
  });

  const sortedSubjects = Object.entries(subjectMinutes)
    .filter(([, mins]) => mins > 0)
    .sort((a, b) => b[1] - a[1]);

  const [hoveredSlice, setHoveredSlice] = useState<{
    id: string;
    label: string;
    mins: number;
    percentage: number;
    color: string;
  } | null>(null);

  // SVG parameters
  const size = 220;
  const strokeWidth = 18;
  const radius = (size - strokeWidth - 10) / 2; // radius ~ 96
  const center = size / 2;
  const circumference = 2 * Math.PI * radius; // ~603.18

  const slices = sortedSubjects.map(([id, mins], index) => {
    const percentage = mins / totalMinutes;
    const color = MONOCHROME_COLORS[Math.min(index, MONOCHROME_COLORS.length - 1)];
    const strokeDasharray = `${(percentage * circumference).toFixed(2)} ${circumference.toFixed(2)}`;
    
    // Compute previous cumulative percentage sum cleanly without mutating variables
    const prevPercentageSum = sortedSubjects
      .slice(0, index)
      .reduce((sum, [, prevMins]) => sum + prevMins / totalMinutes, 0);

    const strokeDashoffset = `${(-prevPercentageSum * circumference).toFixed(2)}`;

    return {
      id,
      label: subjectLabels[id] || id,
      mins,
      percentage,
      color,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;
  const totalDisplay = totalHours > 0 ? `${totalHours}s ${remainingMins}d` : `${remainingMins}dk`;

  if (totalMinutes === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/10 border border-zinc-800/40 rounded-2xl h-[260px] relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(125, 125, 125, 0.08)"
            strokeWidth={strokeWidth}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-zinc-650 text-xs font-semibold uppercase tracking-wider">Kayıt Yok</span>
          <span className="text-[10px] text-zinc-700 mt-1">Öğrenme verileri bekleniyor</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/15 border border-zinc-800/40 rounded-2xl relative select-none">
      {/* Chart container */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform-gpu"
        >
          {/* Base Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(125, 125, 125, 0.05)"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slices.map((slice) => {
            const isHovered = hoveredSlice?.id === slice.id;
            return (
              <circle
                key={slice.id}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap={slice.percentage > 0.03 ? "round" : "butt"}
                onMouseEnter={() =>
                  setHoveredSlice({
                    id: slice.id,
                    label: slice.label,
                    mins: slice.mins,
                    percentage: slice.percentage,
                    color: slice.color,
                  })
                }
                onMouseLeave={() => setHoveredSlice(null)}
                className="transition-all duration-300 ease-out cursor-pointer"
                style={{
                  filter: isHovered ? `drop-shadow(0 0 8px ${slice.color}40)` : "none",
                }}
              />
            );
          })}
        </svg>

        {/* Center Labels */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          {hoveredSlice ? (
            <>
              <span className="text-[11px] font-semibold text-zinc-200 truncate max-w-[130px] transition-all">
                {hoveredSlice.label}
              </span>
              <span className="text-lg font-light text-zinc-100 tabular-nums mt-0.5">
                {hoveredSlice.mins} dk
              </span>
              <span className="text-[9px] uppercase tracking-wider font-medium text-zinc-500 mt-0.5">
                %{Math.round(hoveredSlice.percentage * 100)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">
                Toplam
              </span>
              <span className="text-2xl font-light text-zinc-200 tabular-nums mt-0.5">
                {totalDisplay}
              </span>
              <span className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-wider">
                {slices.length} Ders
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend Indicators below chart */}
      <div className="mt-5 w-full flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-2">
        {slices.slice(0, 5).map((slice) => {
          const isHovered = hoveredSlice?.id === slice.id;
          return (
            <div
              key={slice.id}
              className={`flex items-center gap-1.5 transition-all duration-200 ${
                hoveredSlice && !isHovered ? "opacity-35" : "opacity-100"
              }`}
              onMouseEnter={() => setHoveredSlice(slice)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-[10px] text-zinc-450 hover:text-zinc-200 cursor-pointer font-medium truncate max-w-[90px]">
                {slice.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
