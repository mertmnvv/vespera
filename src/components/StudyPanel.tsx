"use client";

import React from "react";

interface SubjectItem {
  id: string;
  label: string;
}

interface StudyPanelProps {
  subjects: SubjectItem[];
  selectedSubjects: string[];
  onToggle: (id: string) => void;
  disabled: boolean;
}

export default function StudyPanel({
  subjects,
  selectedSubjects,
  onToggle,
  disabled,
}: StudyPanelProps) {
  return (
    <div className="glass-card p-5 w-full">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-indigo-500 inline-block" />
        Odak Paneli
      </h2>

      <div className="space-y-1 stagger-children">
        {subjects.map((subject) => {
          const isSelected = selectedSubjects.includes(subject.id);
          return (
            <label
              key={subject.id}
              className={`
                flex items-center gap-3 px-3.5 py-2.5 rounded-lg cursor-pointer
                transition-all duration-200 group select-none
                ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-800/50"}
                ${isSelected && !disabled ? "bg-zinc-800/40" : ""}
              `}
            >
              <input
                type="checkbox"
                className="custom-checkbox"
                checked={isSelected}
                onChange={() => onToggle(subject.id)}
                disabled={disabled}
              />
              <span
                className={`
                  text-sm transition-colors duration-200
                  ${isSelected ? "text-zinc-200" : "text-zinc-400"}
                  ${!disabled ? "group-hover:text-zinc-200" : ""}
                `}
              >
                {subject.label}
              </span>

              {isSelected && !disabled && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              )}
            </label>
          );
        })}
      </div>

      {selectedSubjects.length === 0 && !disabled && (
        <p className="text-xs text-zinc-600 mt-3 text-center italic">
          En az bir konu seçerek başlayabilirsin
        </p>
      )}
    </div>
  );
}
