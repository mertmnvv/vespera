"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface SubjectItem {
  id: string;
  label: string;
}

interface StudyPanelProps {
  subjects: SubjectItem[];
  selectedSubjects: string[];
  onToggle: (id: string) => void;
  onAddSubject: (label: string) => void;
  onDeleteSubject: (id: string) => void;
  disabled: boolean;
}

export default function StudyPanel({
  subjects,
  selectedSubjects,
  onToggle,
  onAddSubject,
  onDeleteSubject,
  disabled,
}: StudyPanelProps) {
  const [newSubjectName, setNewSubjectName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    if (subjects.length >= 25) return;
    onAddSubject(trimmed);
    setNewSubjectName("");
  };

  return (
    <div className="glass-card p-5 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-zinc-500 inline-block" />
          Odak Paneli
        </h2>
        <span className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
          {subjects.length} / 25 Ders
        </span>
      </div>

      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 stagger-children">
        {subjects.map((subject) => {
          const isSelected = selectedSubjects.includes(subject.id);
          return (
            <div
              key={subject.id}
              className={`
                group flex items-center justify-between px-2.5 py-1.5 rounded-lg
                transition-all duration-250 select-none
                ${isSelected && !disabled ? "bg-zinc-800/20 border border-zinc-700/20" : "border border-transparent"}
                ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-800/40"}
              `}
            >
              <label
                className={`
                  flex items-center gap-3 cursor-pointer flex-1 py-1
                  ${disabled ? "cursor-not-allowed" : ""}
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
                    ${isSelected ? "text-zinc-100 font-medium" : "text-zinc-400"}
                    ${!disabled ? "group-hover:text-zinc-200" : ""}
                  `}
                >
                  {subject.label}
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {isSelected && !disabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
                )}
                {!disabled && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteSubject(subject.id);
                    }}
                    className="p-1 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-850 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Dersi Sil"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {subjects.length === 0 && (
          <p className="text-xs text-zinc-600 italic text-center py-4">
            Ders listeniz boş. Aşağıdan yeni ders ekleyebilirsiniz.
          </p>
        )}
      </div>

      {selectedSubjects.length === 0 && subjects.length > 0 && !disabled && (
        <p className="text-[10px] text-zinc-550 mt-3 text-center italic">
          En az bir konu seçerek başlayabilirsin
        </p>
      )}

      {/* Add Custom Subject Input */}
      {!disabled && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-zinc-800/40 flex gap-2">
          <input
            type="text"
            placeholder={subjects.length >= 25 ? "Maksimum 25 ders limiti" : "Yeni ders ekle..."}
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            disabled={subjects.length >= 25}
            maxLength={35}
            className="flex-1 text-sm bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700/50 focus:border-zinc-500/50 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!newSubjectName.trim() || subjects.length >= 25}
            className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-700 hover:text-zinc-100 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Ders Ekle"
          >
            <Plus size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
