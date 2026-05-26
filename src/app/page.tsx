"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, SkipForward, Timer, Maximize, Minimize, Loader2 } from "lucide-react";
import TimerRing from "@/components/TimerRing";
import StudyPanel from "@/components/StudyPanel";
import SettingsPanel from "@/components/SettingsPanel";
import SessionStats from "@/components/SessionStats";
import DailyLog from "@/components/DailyLog";
import CalendarView from "@/components/CalendarView";
import TotalSummary from "@/components/TotalSummary";
import type { StudyLogs, StudySession } from "@/components/CalendarView";
import AuthModal from "@/components/AuthModal";
import WeeklyTodoList, { TodoTask } from "@/components/WeeklyTodoList";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── Subject list (Default values) ──────────────────────────────
const DEFAULT_SUBJECTS = [
  { id: "tyt-turkce", label: "TYT Türkçe" },
  { id: "tyt-sosyal", label: "TYT Sosyal" },
  { id: "tyt-mat", label: "TYT Matematik" },
  { id: "tyt-fen", label: "TYT Fen" },
  { id: "ydt-kelime", label: "YDT Kelime Çalışması" },
  { id: "ydt-grammar", label: "YDT Dilbilgisi (Grammar)" },
  { id: "ydt-reading", label: "YDT Okuma / Soru Çözümü" },
  { id: "genel", label: "Genel Çalışma" },
];

// ─── Date helpers ───────────────────────────────────────────────
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── localStorage helpers ───────────────────────────────────────
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

// ─── Vespera — Pomodoro Page ────────────────────────────────────
export default function VesperaPage() {
  // Settings
  const [workMinutes, setWorkMinutes] = useState(20);
  const [breakMinutes, setBreakMinutes] = useState(5);

  // Timer state
  const [mode, setMode] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);

  // Background accuracy and Wake Lock
  const wakeLockRef = useRef<any>(null);

  // Subjects (customizable)
  const [subjects, setSubjects] = useState<{ id: string; label: string }[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Dynamically compute subjectLabels map
  const subjectLabels = React.useMemo(() => {
    const map: Record<string, string> = {};
    subjects.forEach((s) => {
      map[s.id] = s.label;
    });
    return map;
  }, [subjects]);

  // Stats (simple counters)
  const [completedSessions, setCompletedSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  // Study logs (date → sessions)
  const [studyLogs, setStudyLogs] = useState<StudyLogs>({});

  // Weekly Todos state
  const [weeklyTodos, setWeeklyTodos] = useState<TodoTask[]>([]);

  // Modal states
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Focus Mode (Visual Fullscreen) state
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Firebase Auth states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Cloud save helper
  const saveToCloud = useCallback(async (key: string, value: any) => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(
        userDocRef,
        { [key]: value, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (err) {
      console.error(`Cloud save error for ${key}:`, err);
    }
  }, []);

  // Sync data helper
  const syncUserData = useCallback(async (user: User) => {
    setSyncing(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Doc exists in Firestore: load to local state and storage
        const data = userDoc.data();
        if (data.workMinutes !== undefined) setWorkMinutes(data.workMinutes);
        if (data.breakMinutes !== undefined) setBreakMinutes(data.breakMinutes);
        if (data.subjects !== undefined) setSubjects(data.subjects);
        if (data.selectedSubjects !== undefined) setSelectedSubjects(data.selectedSubjects);
        if (data.completedSessions !== undefined) setCompletedSessions(data.completedSessions);
        if (data.totalMinutes !== undefined) setTotalMinutes(data.totalMinutes);
        if (data.studyLogs !== undefined) setStudyLogs(data.studyLogs);
        if (data.weeklyTodos !== undefined) setWeeklyTodos(data.weeklyTodos);

        if (data.workMinutes !== undefined) saveToStorage("vespera_work", data.workMinutes);
        if (data.breakMinutes !== undefined) saveToStorage("vespera_break", data.breakMinutes);
        if (data.subjects !== undefined) saveToStorage("vespera_subjects", data.subjects);
        if (data.selectedSubjects !== undefined) saveToStorage("vespera_selected_subjects", data.selectedSubjects);
        if (data.completedSessions !== undefined) saveToStorage("vespera_sessions", data.completedSessions);
        if (data.totalMinutes !== undefined) saveToStorage("vespera_minutes", data.totalMinutes);
        if (data.studyLogs !== undefined) saveToStorage("vespera_logs", data.studyLogs);
        if (data.weeklyTodos !== undefined) saveToStorage("vespera_weekly_todos", data.weeklyTodos);
      } else {
        // Doc doesn't exist: upload current local state to cloud (migration)
        const localData = {
          workMinutes,
          breakMinutes,
          subjects,
          selectedSubjects,
          completedSessions,
          totalMinutes,
          studyLogs,
          weeklyTodos,
          updatedAt: Date.now(),
        };
        await setDoc(userDocRef, localData);
      }
    } catch (err) {
      console.error("Firestore sync error:", err);
    } finally {
      setSyncing(false);
    }
  }, [
    workMinutes,
    breakMinutes,
    subjects,
    selectedSubjects,
    completedSessions,
    totalMinutes,
    studyLogs,
    weeklyTodos,
  ]);

  // Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncUserData(user);
      }
    });
    return () => unsubscribe();
  }, [syncUserData]);

  // Sign out handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear local storage and reset states
      localStorage.removeItem("vespera_work");
      localStorage.removeItem("vespera_break");
      localStorage.removeItem("vespera_sessions");
      localStorage.removeItem("vespera_minutes");
      localStorage.removeItem("vespera_logs");
      localStorage.removeItem("vespera_subjects");
      localStorage.removeItem("vespera_selected_subjects");
      localStorage.removeItem("vespera_weekly_todos");

      setWorkMinutes(20);
      setBreakMinutes(5);
      setSecondsLeft(20 * 60);
      setCompletedSessions(0);
      setTotalMinutes(0);
      setStudyLogs({});
      setSubjects(DEFAULT_SUBJECTS);
      setSelectedSubjects([]);
      setWeeklyTodos([]);
      setHasStartedOnce(false);
      setIsRunning(false);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Weekly Todo list actions
  const handleAddTask = (text: string, subjectId: string, dayOfWeek: string) => {
    const newTask: TodoTask = {
      id: `task-${Date.now()}`,
      text,
      subjectId: subjectId || undefined,
      completed: false,
      dayOfWeek,
      createdAt: Date.now(),
    };
    setWeeklyTodos((prev) => [...prev, newTask]);
  };

  const handleToggleTask = (id: string) => {
    setWeeklyTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setWeeklyTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleFocusMode = () => {
    const nextFocusMode = !isFocusMode;
    setIsFocusMode(nextFocusMode);

    // HTML5 Fullscreen enhancement (falls back silently if blocked/unsupported)
    if (nextFocusMode) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn(`HTML5 Fullscreen blocked/unsupported: ${err.message}`);
        });
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isFocusMode]);

  // Subject management actions
  const handleAddSubject = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (subjects.length >= 25) return;
    const id = `custom-${Date.now()}`;
    setSubjects((prev) => [...prev, { id, label: trimmed }]);
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setSelectedSubjects((prev) => prev.filter((sId) => sId !== id));
  };

  // Alarm audio ref
  const alarmRef = useRef<HTMLAudioElement | null>(null);

  // Service worker ref
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  // Total seconds for current mode
  const totalSeconds = mode === "work" ? workMinutes * 60 : breakMinutes * 60;

  // ── Register Service Worker & Request Notification Permission ─
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          swRef.current = reg;
          console.log("Vespera SW registered");
        })
        .catch((err) => {
          console.warn("SW registration failed:", err);
        });
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── Hydrate from localStorage ─────────────────────────────────
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedWork = loadFromStorage("vespera_work", 20);
    const savedBreak = loadFromStorage("vespera_break", 5);
    const savedSessions = loadFromStorage("vespera_sessions", 0);
    const savedMinutes = loadFromStorage("vespera_minutes", 0);
    const savedLogs = loadFromStorage<StudyLogs>("vespera_logs", {});
    const savedSubjects = loadFromStorage<{ id: string; label: string }[]>("vespera_subjects", DEFAULT_SUBJECTS);
    const savedSelected = loadFromStorage<string[]>("vespera_selected_subjects", []);
    const savedTodos = loadFromStorage<TodoTask[]>("vespera_weekly_todos", []);

    setWorkMinutes(savedWork);
    setBreakMinutes(savedBreak);
    setSecondsLeft(savedWork * 60);
    setCompletedSessions(savedSessions);
    setTotalMinutes(savedMinutes);
    setStudyLogs(savedLogs);
    setSubjects(savedSubjects);
    setSelectedSubjects(savedSelected);
    setWeeklyTodos(savedTodos);
    setHydrated(true);
  }, []);

  // ── Persist settings on change ────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage("vespera_work", workMinutes);
    if (currentUser) {
      saveToCloud("workMinutes", workMinutes);
    }
  }, [workMinutes, hydrated, currentUser, saveToCloud]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage("vespera_break", breakMinutes);
    if (currentUser) {
      saveToCloud("breakMinutes", breakMinutes);
    }
  }, [breakMinutes, hydrated, currentUser, saveToCloud]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage("vespera_sessions", completedSessions);
    if (currentUser) {
      saveToCloud("completedSessions", completedSessions);
    }
  }, [completedSessions, hydrated, currentUser, saveToCloud]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage("vespera_minutes", totalMinutes);
    if (currentUser) {
      saveToCloud("totalMinutes", totalMinutes);
    }
  }, [totalMinutes, hydrated, currentUser, saveToCloud]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage("vespera_logs", studyLogs);
    if (currentUser) {
      saveToCloud("studyLogs", studyLogs);
    }
  }, [studyLogs, hydrated, currentUser, saveToCloud]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage("vespera_subjects", subjects);
    if (currentUser) {
      saveToCloud("subjects", subjects);
    }
  }, [subjects, hydrated, currentUser, saveToCloud]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage("vespera_selected_subjects", selectedSubjects);
    if (currentUser) {
      saveToCloud("selectedSubjects", selectedSubjects);
    }
  }, [selectedSubjects, hydrated, currentUser, saveToCloud]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage("vespera_weekly_todos", weeklyTodos);
    if (currentUser) {
      saveToCloud("weeklyTodos", weeklyTodos);
    }
  }, [weeklyTodos, hydrated, currentUser, saveToCloud]);

  // ── Record a completed session to study logs ──────────────────
  const recordSession = useCallback(
    (subjects: string[], minutes: number) => {
      const dateKey = getTodayKey();
      const session: StudySession = {
        subjects,
        minutes,
        completedAt: Date.now(),
      };
      setStudyLogs((prev) => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), session],
      }));
    },
    []
  );

  // ── Play alarm sound (custom file from /alarm.mp3) ────────────
  const playAlarm = useCallback(() => {
    try {
      // Stop any previously playing alarm
      if (alarmRef.current) {
        alarmRef.current.pause();
        alarmRef.current.currentTime = 0;
      }

      const audio = new Audio("/alarm.mp3");
      audio.volume = 0.7;
      alarmRef.current = audio;
      audio.play().catch(() => {
        /* User hasn't interacted yet — browser may block autoplay */
        console.warn("Alarm playback blocked by browser");
      });
    } catch {
      console.warn("Alarm audio not available");
    }
  }, []);

  // ── Send browser notification via SW ──────────────────────────
  const sendNotification = useCallback(
    (isWork: boolean) => {
      const title = isWork
        ? "Çalışma süresi bitti!"
        : "Mola bitti — Haydi tekrar!";
      const body = isWork
        ? `${workMinutes} dakikalık oturumu tamamladın. Mola zamanı!`
        : `${breakMinutes} dakikalık mola bitti. Çalışmaya devam!`;

      // Try via Service Worker first (works in background)
      if (swRef.current?.active) {
        swRef.current.active.postMessage({
          type: "TIMER_DONE",
          title,
          body,
          tag: isWork ? "vespera-work" : "vespera-break",
        });
      }
      // Fallback: direct Notification API
      else if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icon-192.png",
          tag: isWork ? "vespera-work" : "vespera-break",
        });
      }
    },
    [workMinutes, breakMinutes]
  );

  // ── Wake Lock API (Ekranı uyanık tut) ─────────────────────────
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && isRunning) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch (err) {
        console.warn("Wake lock error:", err);
      }
    };

    if (isRunning) {
      requestWakeLock();
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.warn);
        wakeLockRef.current = null;
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isRunning) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.warn);
        wakeLockRef.current = null;
      }
    };
  }, [isRunning]);

  // ── Timer countdown (Timestamp tabanlı) ───────────────────────
  useEffect(() => {
    if (!isRunning) return;

    // Çalışmaya başladığı andaki gerçek dünya saatini baz al
    const targetEndTime = Date.now() + secondsLeft * 1000;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
      
      setSecondsLeft((prev) => {
        if (prev === remaining) return prev;
        if (remaining <= 0) {
          clearInterval(interval);
          return 0;
        }
        return remaining;
      });
    }, 500); // Daha pürüzsüz tepki için 500ms

    // Sekme geri geldiğinde anında senkronize et
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
        setSecondsLeft((prev) => {
          if (prev === remaining) return prev;
          return remaining <= 0 ? 0 : remaining;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  // ── When timer hits zero ──────────────────────────────────────
  useEffect(() => {
    if (secondsLeft !== 0 || !hasStartedOnce) return;

    setIsRunning(false);

    // Play alarm and send notification
    playAlarm();
    sendNotification(mode === "work");

    if (mode === "work") {
      // Completed a work session — record it
      setCompletedSessions((prev) => prev + 1);
      setTotalMinutes((prev) => prev + workMinutes);
      recordSession(selectedSubjects, workMinutes);

      // Switch to break
      setMode("break");
      setSecondsLeft(breakMinutes * 60);
    } else {
      // Break finished, back to work
      setMode("work");
      setSecondsLeft(workMinutes * 60);
      setHasStartedOnce(false);
    }
  }, [
    secondsLeft,
    hasStartedOnce,
    mode,
    workMinutes,
    breakMinutes,
    playAlarm,
    sendNotification,
    recordSession,
    selectedSubjects,
  ]);

  // ── Update document title ─────────────────────────────────────
  useEffect(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    if (isRunning || hasStartedOnce) {
      const modeStr = mode === "work" ? "Çalışma" : "Mola";
      document.title = `${timeStr} — ${modeStr} | Vespera`;
    } else {
      document.title = "Vespera — Pomodoro Zamanlayıcı";
    }

    return () => {
      document.title = "Vespera — Pomodoro Zamanlayıcı";
    };
  }, [secondsLeft, isRunning, mode, hasStartedOnce]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleStart = () => {
    // Stop any playing alarm when starting new session
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
    setIsRunning(true);
    setHasStartedOnce(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setHasStartedOnce(false);
    setMode("work");
    setSecondsLeft(workMinutes * 60);
    // Stop alarm if playing
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (mode === "work") {
      setMode("break");
      setSecondsLeft(breakMinutes * 60);
    } else {
      setMode("work");
      setSecondsLeft(workMinutes * 60);
    }
    setHasStartedOnce(false);
    // Stop alarm if playing
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
  };

  const handleWorkChange = (val: number) => {
    setWorkMinutes(val);
    if (mode === "work" && !isRunning && !hasStartedOnce) {
      setSecondsLeft(val * 60);
    }
  };

  const handleBreakChange = (val: number) => {
    setBreakMinutes(val);
    if (mode === "break" && !isRunning && !hasStartedOnce) {
      setSecondsLeft(val * 60);
    }
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // ── Derived ───────────────────────────────────────────────────
  const progress = 1 - secondsLeft / totalSeconds;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeDisplay = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const timerLabel = mode === "work" ? "Çalışma" : "Mola";
  const canStart = selectedSubjects.length > 0 || hasStartedOnce;

  // Today's sessions for DailyLog
  const todayKey = getTodayKey();
  const todaySessions = studyLogs[todayKey] || [];

  // Don't render until hydrated (avoids mismatch)
  if (!hydrated) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <>
      <main className={`relative z-10 min-h-dvh flex flex-col items-center px-4 py-6 sm:py-10 transition-all duration-500 ${isFocusMode ? 'justify-center h-dvh overflow-hidden' : ''}`}>
        {/* Auth Button at the top right */}
        {!isFocusMode && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 animate-fade-in-up z-20">
            {currentUser ? (
              <div className="flex items-center gap-2.5 bg-zinc-900/60 border border-zinc-800/40 rounded-xl px-3 py-1.5 backdrop-blur-sm shadow-sm">
                {syncing && (
                  <Loader2 size={12} className="text-zinc-500 animate-spin shrink-0" />
                )}
                <span className="text-[11px] font-medium text-zinc-400 max-w-[120px] truncate">
                  {currentUser.email}
                </span>
                <div className="w-px h-3 bg-zinc-800" />
                <button
                  onClick={handleLogout}
                  className="text-[11px] text-zinc-500 hover:text-red-400 font-medium transition-colors cursor-pointer"
                >
                  Çıkış
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-[11px] font-semibold text-zinc-300 hover:text-zinc-100 bg-zinc-900/60 hover:bg-zinc-800/50 border border-zinc-800/50 hover:border-zinc-700/50 px-3.5 py-1.5 rounded-xl backdrop-blur-sm transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Buluta Yedekle / Giriş
              </button>
            )}
          </div>
        )}

        {/* Header */}
        {!isFocusMode && (
          <header className="flex flex-col items-center mb-8 sm:mb-12 animate-fade-in-up group cursor-default">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-zinc-500/10 to-zinc-700/10 border border-zinc-700/20 shadow-[0_0_20px_rgba(255,255,255,0.02)] transition-all duration-300 group-hover:scale-105 group-hover:border-zinc-500/40">
                <Timer size={22} className="text-zinc-400 animate-pulse group-hover:rotate-12 transition-transform duration-500" />
                <div className="absolute inset-0 rounded-xl bg-zinc-500/5 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-widest bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(255,255,255,0.05)] transition-all duration-300">
                VESPERA
              </h1>
            </div>
            <p className="mt-3 text-xs font-medium italic tracking-wide text-zinc-400/80 bg-zinc-900/40 border border-zinc-800/30 px-3 py-1 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] backdrop-blur-sm group-hover:text-zinc-200 group-hover:border-zinc-700/20 transition-all duration-300">
              &quot;Aut viam inveniam, aut faciam&quot;
            </p>
          </header>
        )}

        {/* Mode Indicator Pills */}
        <div className="flex gap-1 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800/50 mb-8 animate-fade-in-up">
          <button
            onClick={() => {
              if (!isRunning) {
                setMode("work");
                setSecondsLeft(workMinutes * 60);
                setHasStartedOnce(false);
              }
            }}
            disabled={isRunning}
            className={`
              px-4 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider
              transition-all duration-300
              ${
                mode === "work"
                  ? "bg-zinc-200 text-zinc-950 shadow-sm font-semibold border border-zinc-300/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }
              disabled:cursor-not-allowed
            `}
          >
            Çalışma
          </button>
          <button
            onClick={() => {
              if (!isRunning) {
                setMode("break");
                setSecondsLeft(breakMinutes * 60);
                setHasStartedOnce(false);
              }
            }}
            disabled={isRunning}
            className={`
              px-4 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider
              transition-all duration-300
              ${
                mode === "break"
                  ? "bg-zinc-800 text-zinc-200 shadow-sm font-semibold border border-zinc-700/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }
              disabled:cursor-not-allowed
            `}
          >
            Mola
          </button>
        </div>

        {/* Timer Ring */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <TimerRing
            progress={progress}
            mode={mode}
            timeDisplay={timeDisplay}
            label={timerLabel}
            isRunning={isRunning}
          />
        </div>

        {/* Control Buttons */}
        <div
          className="flex items-center gap-3 mb-8 animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/30 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600/40 transition-all duration-200 active:scale-95"
            title="Sıfırla"
          >
            <RotateCcw size={18} />
          </button>

          {/* Play / Pause */}
          {isRunning ? (
            <button
              onClick={handlePause}
              className={`
                btn-glow p-5 rounded-2xl transition-all duration-300 active:scale-95
                ${
                  mode === "work"
                    ? "bg-zinc-200 text-zinc-950 hover:bg-zinc-100 shadow-lg shadow-zinc-500/10"
                    : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700 shadow-lg shadow-zinc-900/50"
                }
              `}
              title="Duraklat"
            >
              <Pause size={24} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`
                btn-glow p-5 rounded-2xl transition-all duration-300 active:scale-95
                ${
                  mode === "work"
                    ? "bg-zinc-200 text-zinc-950 hover:bg-zinc-100 shadow-lg shadow-zinc-500/10"
                    : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700 shadow-lg shadow-zinc-900/50"
                }
                disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
              `}
              title="Başlat"
            >
              <Play size={24} fill="currentColor" />
            </button>
          )}

          {/* Skip */}
          <button
            onClick={handleSkip}
            className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/30 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600/40 transition-all duration-200 active:scale-95"
            title="Atla"
          >
            <SkipForward size={18} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFocusMode}
            className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/30 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600/40 transition-all duration-200 active:scale-95 ml-2"
            title={isFocusMode ? "Odak Modundan Çık" : "Odak Modu (Tam Ekran)"}
          >
            {isFocusMode ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>

        {/* Stats */}
        {!isFocusMode && (
          <div
            className="w-full max-w-md mb-6 animate-fade-in-up"
            style={{ animationDelay: "0.25s" }}
          >
            <SessionStats
              completedSessions={completedSessions}
              totalMinutes={totalMinutes}
            />
          </div>
        )}

        {/* Daily Log Panel */}
        {!isFocusMode && (
          <div
            className="w-full max-w-md mb-4 animate-fade-in-up"
            style={{ animationDelay: "0.28s" }}
          >
            <DailyLog
              todaySessions={todaySessions}
              subjectLabels={subjectLabels}
              onOpenCalendar={() => setShowCalendar(true)}
              onOpenSummary={() => setShowSummary(true)}
            />
          </div>
        )}

        {/* Bottom panels grid */}
        {!isFocusMode && (
          <div
            className="w-full max-w-md grid grid-cols-1 gap-4 mb-8 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            {/* Study Panel */}
            <StudyPanel
              subjects={subjects}
              selectedSubjects={selectedSubjects}
              onToggle={toggleSubject}
              onAddSubject={handleAddSubject}
              onDeleteSubject={handleDeleteSubject}
              disabled={isRunning}
            />

            {/* Weekly Todo List */}
            <WeeklyTodoList
              tasks={weeklyTodos}
              subjects={subjects}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              disabled={isRunning}
            />

            {/* Settings Panel */}
            <SettingsPanel
              workMinutes={workMinutes}
              breakMinutes={breakMinutes}
              onWorkChange={handleWorkChange}
              onBreakChange={handleBreakChange}
              disabled={isRunning}
            />
          </div>
        )}

        {/* Footer */}
        {!isFocusMode && (
          <footer className="mt-auto pt-4 pb-6 text-center">
            <p className="text-[11px] text-zinc-700 tracking-wider">
              Odaklan · Çalış · Başar
            </p>
          </footer>
        )}
      </main>

      {/* Calendar Modal */}
      {showCalendar && (
        <CalendarView
          logs={studyLogs}
          subjectLabels={subjectLabels}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Total Summary Modal */}
      {showSummary && (
        <TotalSummary
          logs={studyLogs}
          subjectLabels={subjectLabels}
          onClose={() => setShowSummary(false)}
        />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
    </>
  );
}
