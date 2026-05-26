"use client";

import React from "react";

interface TimerRingProps {
  /** 0 to 1 progress */
  progress: number;
  /** 'work' | 'break' */
  mode: "work" | "break";
  /** formatted time string */
  timeDisplay: string;
  /** label text */
  label: string;
  /** is timer actively counting */
  isRunning: boolean;
}

export default function TimerRing({
  progress,
  mode,
  timeDisplay,
  label,
  isRunning,
}: TimerRingProps) {
  const baseSize = 400;
  const strokeWidth = 8;
  const radius = (baseSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const accentColor = mode === "work" ? "#bfbfbf" : "#7d7d7d";
  const glowColor =
    mode === "work" ? "rgba(191, 191, 191, 0.25)" : "rgba(125, 125, 125, 0.25)";

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow backdrop */}
      <div
        className="absolute rounded-full transition-all duration-1000 w-[330px] h-[330px] xs:w-[360px] xs:h-[360px] sm:w-[430px] sm:h-[430px] md:w-[470px] md:h-[470px]"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: isRunning ? 0.7 : 0.2,
        }}
      />

      <svg
        viewBox={`0 0 ${baseSize} ${baseSize}`}
        className={`w-72 h-72 xs:w-80 xs:h-80 sm:w-96 sm:h-96 md:w-[400px] md:h-[400px] -rotate-90 transition-all duration-300 ${isRunning ? "timer-ring-pulse" : ""}`}
        style={{ color: accentColor }}
      >
        {/* Background track */}
        <circle
          cx={baseSize / 2}
          cy={baseSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(125, 125, 125, 0.15)"
          strokeWidth={strokeWidth}
        />

        {/* Progress ring */}
        <circle
          cx={baseSize / 2}
          cy={baseSize / 2}
          r={radius}
          fill="none"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-linear"
          style={{
            filter: `drop-shadow(0 0 10px ${glowColor})`,
          }}
        />

        {/* Decorative dots on track */}
        {[0, 90, 180, 270].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const cx = baseSize / 2 + radius * Math.cos(rad);
          const cy = baseSize / 2 + radius * Math.sin(rad);
          return (
            <circle
              key={angle}
              cx={cx}
              cy={cy}
              r={3}
              fill="rgba(125, 125, 125, 0.25)"
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute flex flex-col items-center gap-1">
        <span
          className="text-6xl sm:text-7xl font-light tracking-wider tabular-nums transition-colors duration-500"
          style={{ color: accentColor }}
        >
          {timeDisplay}
        </span>
        <span className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-medium">
          {label}
        </span>

        {/* Subtle breathing dot */}
        {isRunning && (
          <div className="mt-2 flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: accentColor }}
            />
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
              Aktif
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
