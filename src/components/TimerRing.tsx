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
  const size = 280;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const accentColor = mode === "work" ? "#818cf8" : "#34d399";
  const glowColor =
    mode === "work" ? "rgba(129, 140, 248, 0.4)" : "rgba(52, 211, 153, 0.4)";

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow backdrop */}
      <div
        className="absolute rounded-full transition-all duration-1000"
        style={{
          width: size + 40,
          height: size + 40,
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: isRunning ? 0.6 : 0.2,
        }}
      />

      <svg
        width={size}
        height={size}
        className={`-rotate-90 ${isRunning ? "timer-ring-pulse" : ""}`}
        style={{ color: accentColor }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(63, 63, 70, 0.3)"
          strokeWidth={strokeWidth}
        />

        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-linear"
          style={{
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        />

        {/* Decorative dots on track */}
        {[0, 90, 180, 270].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const cx = size / 2 + radius * Math.cos(rad);
          const cy = size / 2 + radius * Math.sin(rad);
          return (
            <circle
              key={angle}
              cx={cx}
              cy={cy}
              r={2}
              fill="rgba(161, 161, 170, 0.3)"
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute flex flex-col items-center gap-1">
        <span
          className="text-6xl font-light tracking-wider tabular-nums transition-colors duration-500"
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
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
              Aktif
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
