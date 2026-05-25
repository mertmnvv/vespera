"use client";

import React from "react";
import { Clock, Coffee } from "lucide-react";

interface SettingsPanelProps {
  workMinutes: number;
  breakMinutes: number;
  onWorkChange: (val: number) => void;
  onBreakChange: (val: number) => void;
  disabled: boolean;
}

export default function SettingsPanel({
  workMinutes,
  breakMinutes,
  onWorkChange,
  onBreakChange,
  disabled,
}: SettingsPanelProps) {
  return (
    <div className="glass-card p-5 w-full">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-5 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-emerald-500 inline-block" />
        Süre Ayarları
      </h2>

      <div className="space-y-5">
        {/* Work duration */}
        <div className={`space-y-2.5 ${disabled ? "opacity-40" : ""}`}>
          <div className="flex items-center justify-between">
            <label className="text-sm text-zinc-300 flex items-center gap-2">
              <Clock size={14} className="text-indigo-400" />
              Çalışma Süresi
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={120}
                value={workMinutes}
                onChange={(e) =>
                  onWorkChange(Math.max(1, Math.min(120, Number(e.target.value))))
                }
                disabled={disabled}
                className="w-14 text-center text-sm bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-indigo-400 font-medium focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all disabled:cursor-not-allowed"
              />
              <span className="text-xs text-zinc-500">dk</span>
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={120}
            value={workMinutes}
            onChange={(e) => onWorkChange(Number(e.target.value))}
            disabled={disabled}
            className="accent-indigo-500 disabled:cursor-not-allowed"
            style={
              {
                "--tw-range-fill": "#818cf8",
              } as React.CSSProperties
            }
          />
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>1 dk</span>
            <span>120 dk</span>
          </div>
        </div>

        {/* Break duration */}
        <div className={`space-y-2.5 ${disabled ? "opacity-40" : ""}`}>
          <div className="flex items-center justify-between">
            <label className="text-sm text-zinc-300 flex items-center gap-2">
              <Coffee size={14} className="text-emerald-400" />
              Mola Süresi
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={60}
                value={breakMinutes}
                onChange={(e) =>
                  onBreakChange(Math.max(1, Math.min(60, Number(e.target.value))))
                }
                disabled={disabled}
                className="w-14 text-center text-sm bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-emerald-400 font-medium focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:cursor-not-allowed"
              />
              <span className="text-xs text-zinc-500">dk</span>
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            value={breakMinutes}
            onChange={(e) => onBreakChange(Number(e.target.value))}
            disabled={disabled}
            className="accent-emerald-500 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>1 dk</span>
            <span>60 dk</span>
          </div>
        </div>
      </div>
    </div>
  );
}
