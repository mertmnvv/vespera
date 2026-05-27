"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, SkipForward, Maximize, Minimize } from "lucide-react";
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
import { doc, getDoc, setDoc, collection, deleteDoc, onSnapshot } from "firebase/firestore";
import StudyRoomPanel, { RoomMember } from "@/components/StudyRoomPanel";
import AdminPanel from "@/components/AdminPanel";

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
  const [isAdmin, setIsAdmin] = useState(false);

  // Shared Study Room states
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);

  // Navigation tab state
  const [currentTab, setCurrentTab] = useState<"pomodoro" | "admin">("pomodoro");

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
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "mertmnvv@gmail.com,mertmnv3@gmail.com";
      const emailList = adminEmails.split(",").map(e => e.trim().toLowerCase());
      let userIsAdmin = false;

      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.isAdmin === true) {
          userIsAdmin = true;
        } else if (user.email && emailList.includes(user.email.toLowerCase())) {
          userIsAdmin = true;
          await setDoc(userDocRef, { isAdmin: true }, { merge: true });
        }
        setIsAdmin(userIsAdmin);

        // Doc exists in Firestore: load to local state and storage
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
        if (user.email && emailList.includes(user.email.toLowerCase())) {
          userIsAdmin = true;
        }
        setIsAdmin(userIsAdmin);

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
          isAdmin: userIsAdmin,
          updatedAt: Date.now(),
        };
        await setDoc(userDocRef, localData);
      }
    } catch (err) {
      console.error("Firestore sync error:", err);
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
      } else {
        setIsAdmin(false);
        setCurrentTab("pomodoro");
      }
    });
    return () => unsubscribe();
  }, [syncUserData]);

  // Leave room cleanup
  const leaveRoom = useCallback(async () => {
    if (!auth.currentUser || !currentRoomId) return;
    try {
      const memberDocRef = doc(db, "rooms", currentRoomId, "members", auth.currentUser.uid);
      await deleteDoc(memberDocRef);
    } catch (err) {
      console.error("Error leaving room:", err);
    } finally {
      setCurrentRoomId(null);
      setRoomMembers([]);
    }
  }, [currentRoomId]);

  // Sign out handler
  const handleLogout = async () => {
    try {
      if (currentRoomId) {
        await leaveRoom();
      }
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

  // Join Room
  const handleJoinRoom = async (roomId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const roomDocRef = doc(db, "rooms", roomId);
      const roomDoc = await getDoc(roomDocRef);
      if (!roomDoc.exists()) {
        return false;
      }

      // Add initial member state
      const memberDocRef = doc(db, "rooms", roomId, "members", currentUser.uid);
      await setDoc(memberDocRef, {
        uid: currentUser.uid,
        email: currentUser.email || "Anonim",
        displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "Öğrenci",
        secondsLeft,
        mode,
        isRunning,
        selectedSubjects,
        lastActive: Date.now(),
      });

      setCurrentRoomId(roomId);
      return true;
    } catch (err) {
      console.error("Error joining room:", err);
      return false;
    }
  };

  // Create Room
  const handleCreateRoom = async () => {
    if (!currentUser) return;
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const roomDocRef = doc(db, "rooms", code);
      await setDoc(roomDocRef, {
        createdBy: currentUser.uid,
        createdAt: Date.now(),
      });

      // Add initial member state
      const memberDocRef = doc(db, "rooms", code, "members", currentUser.uid);
      await setDoc(memberDocRef, {
        uid: currentUser.uid,
        email: currentUser.email || "Anonim",
        displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "Öğrenci",
        secondsLeft,
        mode,
        isRunning,
        selectedSubjects,
        lastActive: Date.now(),
      });

      setCurrentRoomId(code);
    } catch (err) {
      console.error("Error creating room:", err);
      throw err;
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
    const savedRoom = loadFromStorage<string | null>("vespera_current_room", null);

    setWorkMinutes(savedWork);
    setBreakMinutes(savedBreak);
    setSecondsLeft(savedWork * 60);
    setCompletedSessions(savedSessions);
    setTotalMinutes(savedMinutes);
    setStudyLogs(savedLogs);
    setSubjects(savedSubjects);
    setSelectedSubjects(savedSelected);
    setWeeklyTodos(savedTodos);
    setCurrentRoomId(savedRoom);
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

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage("vespera_current_room", currentRoomId);
    if (currentUser) {
      saveToCloud("activeRoomId", currentRoomId);
    }
  }, [currentRoomId, hydrated, currentUser, saveToCloud]);

  // Listen to members in the room in real time
  useEffect(() => {
    if (!currentRoomId) {
      setRoomMembers([]);
      return;
    }

    const membersRef = collection(db, "rooms", currentRoomId, "members");
    const unsubscribe = onSnapshot(membersRef, (snapshot) => {
      const membersList: RoomMember[] = [];
      snapshot.forEach((doc) => {
        membersList.push(doc.data() as RoomMember);
      });
      setRoomMembers(membersList);
    }, (err) => {
      console.error("Error reading room snapshot:", err);
    });

    return () => unsubscribe();
  }, [currentRoomId]);

  // Keep track of secondsLeft in a ref to avoid writing to Firestore every single second
  const secondsLeftRef = useRef(secondsLeft);
  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  // Sync state to room member doc
  useEffect(() => {
    if (!currentUser || !currentRoomId) return;

    const memberDocRef = doc(db, "rooms", currentRoomId, "members", currentUser.uid);

    const updateStatus = async () => {
      try {
        await setDoc(
          memberDocRef,
          {
            uid: currentUser.uid,
            email: currentUser.email || "Anonim",
            displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "Öğrenci",
            secondsLeft: secondsLeftRef.current,
            mode,
            isRunning,
            selectedSubjects,
            lastActive: Date.now(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Error updating member status in Firestore:", err);
      }
    };

    // Update status immediately on mode, run state or subject change
    updateStatus();

    // Heartbeat update every 10 seconds
    const interval = setInterval(updateStatus, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [currentUser, currentRoomId, mode, isRunning, selectedSubjects]);

  // Leave room if window closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentUser && currentRoomId) {
        const memberDocRef = doc(db, "rooms", currentRoomId, "members", currentUser.uid);
        deleteDoc(memberDocRef).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentUser, currentRoomId]);

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
      <main className={`relative z-10 min-h-dvh flex flex-col items-center px-4 py-6 sm:py-10 pb-24 transition-all duration-500 ${isFocusMode ? 'justify-center h-dvh overflow-hidden pb-0' : ''}`}>
        {/* Auth Button at the top right */}
        {!isFocusMode && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 animate-fade-in-up z-20">
            {currentUser ? (
              <div className="flex items-center gap-2.5 bg-zinc-900/60 border border-zinc-800/40 rounded-xl px-3 py-1.5 backdrop-blur-sm shadow-sm">
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
                Giriş / Kayıt
              </button>
            )}
          </div>
        )}

        {/* Header */}
        {!isFocusMode && (
          <header className="flex flex-col items-center mb-8 sm:mb-12 animate-fade-in-up group cursor-default">
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-4xl font-black tracking-[0.3em] pl-[0.3em] bg-gradient-to-b from-zinc-100 via-zinc-300 to-zinc-600 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(255,255,255,0.08)] transition-all duration-300 group-hover:scale-[1.02]">
                VESPERA
              </h1>
              <div className="w-12 h-[1px] bg-zinc-800 group-hover:w-20 transition-all duration-500 my-1" />
            </div>
            <p className="mt-2 text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-550 bg-zinc-900/25 border border-zinc-850/50 px-3.5 py-1 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] backdrop-blur-sm group-hover:text-zinc-300 group-hover:border-zinc-800 transition-all duration-300">
              &quot;Aut viam inveniam, aut faciam&quot;
            </p>
          </header>
        )}

        {currentTab === "admin" && isAdmin ? (
          <AdminPanel
            subjectLabels={subjectLabels}
            onGoToRoom={(roomId) => {
              handleJoinRoom(roomId);
              setCurrentTab("pomodoro");
            }}
          />
        ) : (
          <>
            {isFocusMode ? (
              <div className="flex flex-col items-center justify-center space-y-8 my-auto animate-fade-in-up">
                {/* Mode Indicator Pills */}
                <div className="flex gap-1 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
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
                          : "text-zinc-550 hover:text-zinc-350"
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
                          : "text-zinc-550 hover:text-zinc-350"
                      }
                      disabled:cursor-not-allowed
                    `}
                  >
                    Mola
                  </button>
                </div>

                {/* Timer Ring */}
                <TimerRing
                  progress={progress}
                  mode={mode}
                  timeDisplay={timeDisplay}
                  label={timerLabel}
                  isRunning={isRunning}
                />

                {/* Control Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/30 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600/40 transition-all duration-200 active:scale-95"
                    title="Sıfırla"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={isRunning ? handlePause : handleStart}
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
                    title={isRunning ? "Duraklat" : "Başlat"}
                  >
                    {isRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                  </button>
                  <button
                    onClick={handleSkip}
                    className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/30 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600/40 transition-all duration-200 active:scale-95"
                    title="Atla"
                  >
                    <SkipForward size={18} />
                  </button>
                  <button
                    onClick={toggleFocusMode}
                    className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/30 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600/40 transition-all duration-200 active:scale-95 ml-2"
                    title="Odak Modundan Çık"
                  >
                    <Minimize size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md md:max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start mx-auto animate-fade-in-up">
                {/* Left Column: Timer & Controls (col-span-5) */}
                <div className="md:col-span-5 flex flex-col items-center w-full space-y-6">
                  {/* Mode Indicator Pills */}
                  <div className="flex gap-1 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
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
                            : "text-zinc-550 hover:text-zinc-350"
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
                            : "text-zinc-550 hover:text-zinc-350"
                        }
                        disabled:cursor-not-allowed
                      `}
                    >
                      Mola
                    </button>
                  </div>

                  {/* Timer Ring */}
                  <TimerRing
                    progress={progress}
                    mode={mode}
                    timeDisplay={timeDisplay}
                    label={timerLabel}
                    isRunning={isRunning}
                  />

                  {/* Control Buttons */}
                  <div className="flex items-center gap-3">
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
                      title="Odak Modu (Tam Ekran)"
                    >
                      <Maximize size={18} />
                    </button>
                  </div>

                  {/* Session Stats */}
                  <div className="w-full">
                    <SessionStats
                      completedSessions={completedSessions}
                      totalMinutes={totalMinutes}
                    />
                  </div>

                  {/* Settings Panel */}
                  <div className="w-full">
                    <SettingsPanel
                      workMinutes={workMinutes}
                      breakMinutes={breakMinutes}
                      onWorkChange={handleWorkChange}
                      onBreakChange={handleBreakChange}
                      disabled={isRunning}
                    />
                  </div>
                </div>

                {/* Right Column: Workspaces, Rooms, Tasks (col-span-7) */}
                <div className="md:col-span-7 flex flex-col gap-6 w-full">
                  {/* Study Panel */}
                  <StudyPanel
                    subjects={subjects}
                    selectedSubjects={selectedSubjects}
                    onToggle={toggleSubject}
                    onAddSubject={handleAddSubject}
                    onDeleteSubject={handleDeleteSubject}
                    disabled={isRunning}
                  />

                  {/* Shared Study Room Panel */}
                  <StudyRoomPanel
                    currentUser={currentUser}
                    currentRoomId={currentRoomId}
                    roomMembers={roomMembers}
                    subjectLabels={subjectLabels}
                    onAuthPrompt={() => setShowAuthModal(true)}
                    onJoinRoom={handleJoinRoom}
                    onCreateRoom={handleCreateRoom}
                    onLeaveRoom={leaveRoom}
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

                  {/* Daily Log Panel */}
                  <DailyLog
                    todaySessions={todaySessions}
                    subjectLabels={subjectLabels}
                    onOpenCalendar={() => setShowCalendar(true)}
                    onOpenSummary={() => setShowSummary(true)}
                  />
                </div>
              </div>
            )}
          </>
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

      {/* Footer Bar */}
      {!isFocusMode && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-fit max-w-[90vw] bg-zinc-950/75 border border-zinc-850/80 backdrop-blur-xl py-2 px-3.5 rounded-full shadow-[0_16px_36px_rgba(0,0,0,0.6)] transition-all duration-300 hover:border-zinc-700/40 ${
          !isAdmin ? "hidden md:flex" : "flex"
        }`}>
          <div className="flex items-center gap-4 select-none">
            {/* Version */}
            <span className="hidden sm:inline-flex text-[9px] font-bold tracking-[0.1em] text-zinc-650 uppercase border-r border-zinc-850/80 pr-3 my-0.5">
              V1.2.0
            </span>

            {/* Navigation Tabs */}
            {isAdmin && (
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentTab("pomodoro")}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer ${
                    currentTab === "pomodoro"
                      ? "bg-zinc-200 text-zinc-950"
                      : "text-zinc-550 hover:text-zinc-350"
                  }`}
                >
                  Zamanlayıcı
                </button>

                <button
                  onClick={() => setCurrentTab("admin")}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer ${
                    currentTab === "admin"
                      ? "bg-zinc-200 text-zinc-950"
                      : "text-zinc-550 hover:text-zinc-350"
                  }`}
                >
                  Admin Paneli
                </button>
              </div>
            )}

            {/* Copyright indicator */}
            <span className="hidden sm:inline-flex text-[9px] font-semibold text-zinc-755 uppercase tracking-widest border-l border-zinc-850/80 pl-3 py-0.5">
              &copy; Vespera
            </span>
          </div>
        </div>
      )}
    </>
  );
}
