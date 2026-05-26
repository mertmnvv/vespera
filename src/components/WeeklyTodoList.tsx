"use client";

import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";

export interface TodoTask {
  id: string;
  text: string;
  subjectId?: string;
  completed: boolean;
  dayOfWeek: string;
  createdAt: number;
}

interface SubjectItem {
  id: string;
  label: string;
}

interface WeeklyTodoListProps {
  tasks: TodoTask[];
  subjects: SubjectItem[];
  onAddTask: (text: string, subjectId: string, dayOfWeek: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  disabled?: boolean;
}

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar", "Genel"];
const DAY_SHORTS: Record<string, string> = {
  Pazartesi: "Pt",
  Salı: "Sa",
  Çarşamba: "Ça",
  Perşembe: "Pe",
  Cuma: "Cu",
  Cumartesi: "Ct",
  Pazar: "Pz",
  Genel: "Gnl",
};

export default function WeeklyTodoList({
  tasks,
  subjects,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  disabled = false,
}: WeeklyTodoListProps) {
  const [activeDay, setActiveDay] = useState("Pazartesi");
  const [newTaskText, setNewTaskText] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const filteredTasks = tasks.filter((t) => t.dayOfWeek === activeDay);
  const completedCount = filteredTasks.filter((t) => t.completed).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskText.trim();
    if (!trimmed) return;
    onAddTask(trimmed, selectedSubjectId, activeDay);
    setNewTaskText("");
    setSelectedSubjectId("");
  };

  return (
    <div className="glass-card p-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-zinc-550 inline-block" />
          Haftalık Planlayıcı
        </h2>
        <span className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
          {completedCount} / {filteredTasks.length} Tamamlandı
        </span>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex justify-between gap-1 p-1 rounded-xl bg-zinc-950/40 border border-zinc-900/60 mb-4 overflow-x-auto select-none scrollbar-none">
        {DAYS.map((day) => {
          const isActive = day === activeDay;
          const dayTasks = tasks.filter((t) => t.dayOfWeek === day);
          const isDone = dayTasks.length > 0 && dayTasks.every((t) => t.completed);

          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`
                px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer
                ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700/40 shadow-sm"
                    : "text-zinc-550 hover:text-zinc-350"
                }
                ${isDone && !isActive ? "text-zinc-400/80 line-through" : ""}
              `}
            >
              {DAY_SHORTS[day]}
              {dayTasks.length > 0 && (
                <span className={`ml-1 text-[9px] px-1 py-0.2 rounded-full ${isActive ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-900 text-zinc-500'}`}>
                  {dayTasks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tasks List */}
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 stagger-children">
        {filteredTasks.map((task) => {
          const subject = subjects.find((s) => s.id === task.subjectId);
          return (
            <div
              key={task.id}
              className={`
                group flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-200
                ${
                  task.completed
                    ? "bg-zinc-950/15 border-zinc-900/20 opacity-60"
                    : "bg-zinc-850/10 border-transparent hover:bg-zinc-850/30"
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => onToggleTask(task.id)}
                  disabled={disabled}
                  className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  {task.completed ? (
                    <CheckCircle2 size={16} className="text-zinc-300" />
                  ) : (
                    <Circle size={16} className="text-zinc-600" />
                  )}
                </button>
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-sm truncate transition-all duration-200 ${
                      task.completed ? "line-through text-zinc-500" : "text-zinc-200"
                    }`}
                  >
                    {task.text}
                  </span>
                  {subject && (
                    <span className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {subject.label}
                    </span>
                  )}
                </div>
              </div>

              {!disabled && (
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-850 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0 cursor-pointer ml-2"
                  title="Görevi Sil"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <p className="text-xs text-zinc-600 italic text-center py-6">
            {activeDay} günü için planlanmış bir görev bulunmuyor.
          </p>
        )}
      </div>

      {/* Add Task Form */}
      {!disabled && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-zinc-800/40 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Yeni görev ekle..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              maxLength={60}
              className="flex-1 text-sm bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700/50 focus:border-zinc-500/50 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-500/25 transition-all"
            />
            <button
              type="submit"
              disabled={!newTaskText.trim()}
              className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-700 hover:text-zinc-100 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Görev Ekle"
            >
              <Plus size={16} />
            </button>
          </div>

          {subjects.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-550 uppercase tracking-wider shrink-0 select-none">
                İlişkili Ders:
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="text-[11px] bg-zinc-900/40 hover:bg-zinc-850/50 border border-zinc-800/60 hover:border-zinc-700/50 rounded px-2.5 py-1 text-zinc-400 focus:outline-none focus:border-zinc-500/50 cursor-pointer"
              >
                <option value="">Seçilmedi</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
