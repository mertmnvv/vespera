"use client";

import React, { useState, useEffect } from "react";
import { Search, Users, Clock, Award, Home, X, Check, Calendar, Activity } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StudyDonutChart from "@/components/StudyDonutChart";

interface StudySession {
  subjects: string[];
  minutes: number;
  completedAt: number;
}

type StudyLogs = Record<string, StudySession[]>;

interface TodoTask {
  id: string;
  text: string;
  subjectId?: string;
  completed: boolean;
  dayOfWeek: string;
  createdAt: number;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  workMinutes?: number;
  breakMinutes?: number;
  completedSessions?: number;
  totalMinutes?: number;
  subjects?: { id: string; label: string }[];
  selectedSubjects?: string[];
  studyLogs?: StudyLogs;
  weeklyTodos?: TodoTask[];
  activeRoomId?: string | null;
  updatedAt?: number;
}

interface AdminPanelProps {
  subjectLabels: Record<string, string>;
  onGoToRoom: (roomId: string) => void;
}

export default function AdminPanel({ subjectLabels, onGoToRoom }: AdminPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalTab, setModalTab] = useState<"overview" | "tasks" | "history">("overview");

  // Fetch all users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersList: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          usersList.push({
            uid: doc.id,
            email: data.email || "E-posta yok",
            displayName: data.displayName || data.email?.split("@")[0] || "Öğrenci",
            workMinutes: data.workMinutes,
            breakMinutes: data.breakMinutes,
            completedSessions: data.completedSessions || 0,
            totalMinutes: data.totalMinutes || 0,
            subjects: data.subjects || [],
            selectedSubjects: data.selectedSubjects || [],
            studyLogs: data.studyLogs || {},
            weeklyTodos: data.weeklyTodos || [],
            activeRoomId: data.activeRoomId || null,
            updatedAt: data.updatedAt,
          });
        });
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users for admin:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filtered users list
  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.displayName.toLowerCase().includes(searchLower)
    );
  });

  // Calculate global stats
  const totalUsers = users.length;
  const globalMinutes = users.reduce((sum, u) => sum + (u.totalMinutes || 0), 0);
  const globalSessions = users.reduce((sum, u) => sum + (u.completedSessions || 0), 0);
  
  // Calculate active rooms count
  const activeRooms = Array.from(
    new Set(users.map((u) => u.activeRoomId).filter(Boolean))
  ).length;

  const formatLastActive = (timestamp?: number) => {
    if (!timestamp) return "Kayıt yok";
    const date = new Date(timestamp);
    return date.toLocaleDateString("tr-TR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full max-w-4xl px-2 sm:px-4 py-2 space-y-6 animate-fade-in-up">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-wider text-zinc-100 uppercase">
            Yönetici Paneli
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Sistemdeki tüm kullanıcıların ilerlemesini, seanslarını ve odalarını takip edin.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:max-w-xs">
          <span className="absolute left-3 top-2.5 text-zinc-650">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Kullanıcı adı veya e-posta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700/50 focus:border-zinc-500/50 rounded-lg pl-9 pr-3 py-2 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-500/25 transition-all"
          />
        </div>
      </div>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Stat 1 */}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Users size={16} />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Kullanıcı</span>
            <span className="text-base font-bold text-zinc-200">{totalUsers}</span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Clock size={16} />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Süre</span>
            <span className="text-base font-bold text-zinc-200">
              {globalMinutes >= 60 ? `${Math.floor(globalMinutes / 60)} sa` : `${globalMinutes} dk`}
            </span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Award size={16} />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Seans</span>
            <span className="text-base font-bold text-zinc-200">{globalSessions}</span>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Home size={16} />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold font-sans">Aktif Oda</span>
            <span className="text-base font-bold text-zinc-200">{activeRooms}</span>
          </div>
        </div>
      </div>

      {/* Users List Container */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-500">Veriler yükleniyor...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/60 bg-zinc-900/10">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kullanıcı</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">İlerleme</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Çalışma Odası</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Son Aktiflik</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Detaylar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/30">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-zinc-900/10 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-zinc-200">{user.displayName}</span>
                        <span className="text-[10px] text-zinc-500 truncate max-w-[150px] sm:max-w-none">{user.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono font-medium text-zinc-350">{user.totalMinutes} dk</span>
                        <span className="text-[9px] text-zinc-550 uppercase tracking-wide font-semibold">{user.completedSessions} Seans</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {user.activeRoomId ? (
                        <button
                          onClick={() => onGoToRoom(user.activeRoomId!)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/30 text-zinc-300 px-2 py-1 rounded-md transition-all active:scale-95 cursor-pointer"
                          title="Bu çalışma odasına katıl"
                        >
                          <Home size={10} />
                          {user.activeRoomId}
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-650 italic">Oda Dışı</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-[11px] text-zinc-500 font-medium">
                        {formatLastActive(user.updatedAt)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setModalTab("overview");
                        }}
                        className="text-[10px] font-bold text-zinc-950 bg-zinc-200 hover:bg-zinc-100 px-2.5 py-1.5 rounded-md transition-all active:scale-95 cursor-pointer"
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-zinc-650 italic">
                      Kullanıcı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative space-y-6 shadow-[0_24px_60px_rgba(0,0,0,0.8)] border border-zinc-800/80 scrollbar-thin">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 flex items-center justify-center text-zinc-250 font-extrabold text-sm shadow-[inset_0_2.5px_5px_rgba(255,255,255,0.05)] select-none">
                  {selectedUser.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-zinc-100 tracking-wider uppercase">
                      {selectedUser.displayName}
                    </h3>
                    {selectedUser.activeRoomId && (
                      <span className="inline-flex items-center gap-1.5 text-[9px] bg-zinc-800/80 border border-zinc-750 text-zinc-300 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        Aktif Oda: {selectedUser.activeRoomId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-medium">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800/60 text-zinc-500 hover:text-zinc-200 transition-all hover:bg-zinc-800/40 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Segmented Tab Navigation */}
            <div className="flex border border-zinc-800/50 bg-zinc-950/20 p-1 rounded-xl">
              <button
                onClick={() => setModalTab("overview")}
                className={`flex-grow flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  modalTab === "overview"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/30"
                    : "text-zinc-550 hover:text-zinc-350"
                }`}
              >
                <Activity size={13} />
                Genel Bakış
              </button>
              <button
                onClick={() => setModalTab("tasks")}
                className={`flex-grow flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  modalTab === "tasks"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/30"
                    : "text-zinc-550 hover:text-zinc-350"
                }`}
              >
                <Check size={13} />
                Haftalık Plan
              </button>
              <button
                onClick={() => setModalTab("history")}
                className={`flex-grow flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  modalTab === "history"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/30"
                    : "text-zinc-550 hover:text-zinc-350"
                }`}
              >
                <Calendar size={13} />
                Aktivite Geçmişi
              </button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[300px]">
              {modalTab === "overview" && (
                <div className="space-y-6 animate-fade-in-up">
                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-zinc-950/45 border border-zinc-900 rounded-xl p-3 text-left">
                      <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-semibold block">Toplam Süre</span>
                      <span className="text-sm font-bold text-zinc-300 font-mono mt-0.5 block">{selectedUser.totalMinutes} dk</span>
                    </div>
                    <div className="bg-zinc-950/45 border border-zinc-900 rounded-xl p-3 text-left">
                      <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-semibold block">Toplam Seans</span>
                      <span className="text-sm font-bold text-zinc-300 font-mono mt-0.5 block">{selectedUser.completedSessions} seans</span>
                    </div>
                    <div className="bg-zinc-950/45 border border-zinc-900 rounded-xl p-3 text-left">
                      <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-semibold block">Ders Sayısı</span>
                      <span className="text-sm font-bold text-zinc-300 font-mono mt-0.5 block">{selectedUser.subjects?.length || 0} ders</span>
                    </div>
                    <div className="bg-zinc-950/45 border border-zinc-900 rounded-xl p-3 text-left">
                      <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-semibold block">Sayaç Ayarı</span>
                      <span className="text-xs font-semibold text-zinc-400 mt-0.5 block">
                        {selectedUser.workMinutes || 20}d / {selectedUser.breakMinutes || 5}d
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left Side: Chart */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-[0.2em] flex items-center gap-2 select-none">
                        <span className="w-1 h-3 rounded-full bg-zinc-500 inline-block" />
                        Çalışma Dağılımı
                      </h4>
                      <StudyDonutChart
                        logs={selectedUser.studyLogs || {}}
                        subjectLabels={subjectLabels}
                      />
                    </div>

                    {/* Right Side: Subjects */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-[0.2em] flex items-center gap-2 select-none">
                        <span className="w-1 h-3 rounded-full bg-zinc-500 inline-block" />
                        Özel Dersler
                      </h4>
                      <div className="bg-zinc-900/15 border border-zinc-850/60 p-4 rounded-2xl min-h-[220px] max-h-[260px] overflow-y-auto space-y-1.5 scrollbar-thin">
                        {selectedUser.subjects && selectedUser.subjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedUser.subjects.map((sub) => (
                              <span
                                key={sub.id}
                                className="text-[10px] bg-zinc-900/50 border border-zinc-800/40 text-zinc-350 px-2 py-1 rounded-lg font-medium"
                              >
                                {sub.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-650 italic block text-center py-8">
                            Ders listesi boş
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === "tasks" && (
                <div className="space-y-5 animate-fade-in-up">
                  {/* Progress Card */}
                  {(() => {
                    const totalTasks = selectedUser.weeklyTodos?.length || 0;
                    const completedTasks = selectedUser.weeklyTodos?.filter((t) => t.completed).length || 0;
                    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                    return (
                      <div className="bg-zinc-900/20 border border-zinc-850/60 p-4 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-400">Haftalık Plan İlerlemesi</span>
                          <span className="font-mono text-zinc-300 font-bold">{completedTasks} / {totalTasks} ({completionRate}%)</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850/50">
                          <div 
                            className="h-full bg-zinc-200 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${completionRate}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-[0.2em] flex items-center gap-2 select-none">
                      <span className="w-1 h-3 rounded-full bg-zinc-500 inline-block" />
                      Haftalık Görev Durumu
                    </h4>
                    <div className="bg-zinc-900/15 border border-zinc-850/60 p-4 rounded-2xl max-h-[300px] overflow-y-auto space-y-2 scrollbar-thin">
                      {selectedUser.weeklyTodos && selectedUser.weeklyTodos.length > 0 ? (
                        selectedUser.weeklyTodos.map((todo) => (
                          <div
                            key={todo.id}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-850/30 text-left"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div
                                className={`w-4 h-4 rounded-lg border flex items-center justify-center shrink-0 ${
                                  todo.completed
                                    ? "bg-zinc-200 border-zinc-200 text-zinc-950"
                                    : "border-zinc-700 text-transparent"
                                }`}
                              >
                                <Check size={11} strokeWidth={3} />
                              </div>
                              <span
                                className={`text-xs truncate ${
                                  todo.completed ? "text-zinc-550 line-through" : "text-zinc-300 font-medium"
                                }`}
                              >
                                {todo.text}
                              </span>
                            </div>
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold bg-zinc-900/60 border border-zinc-800/40 px-1.5 py-0.5 rounded-md shrink-0">
                              {todo.dayOfWeek.substring(0, 3)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-650 italic block text-center py-10">
                          Planlanmış görev bulunmamaktadır.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {modalTab === "history" && (
                <div className="space-y-4 animate-fade-in-up">
                  <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-[0.2em] flex items-center gap-2 select-none">
                    <span className="w-1 h-3 rounded-full bg-zinc-500 inline-block" />
                    Son Çalışma Seansları
                  </h4>
                  <div className="bg-zinc-900/15 border border-zinc-850/60 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-850 bg-zinc-900/40 text-[9px] uppercase font-bold tracking-wider text-zinc-500">
                          <th className="p-3">Tarih</th>
                          <th className="p-3">Seçili Dersler</th>
                          <th className="p-3 text-right">Süre</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850/30">
                        {Object.entries(selectedUser.studyLogs || {}).flatMap(([date, sessions]) =>
                          sessions.map((session, idx) => (
                            <tr key={`${date}-${idx}`} className="text-zinc-400 hover:text-zinc-250 hover:bg-zinc-900/10 transition-all">
                              <td className="p-3 font-medium">{date}</td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {session.subjects.map((subId) => (
                                    <span
                                      key={subId}
                                      className="text-[9px] bg-zinc-900/60 border border-zinc-850 text-zinc-550 px-1.5 py-0.5 rounded-md font-semibold"
                                    >
                                      {subjectLabels[subId] || subId}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-zinc-300">
                                {session.minutes} dk
                              </td>
                            </tr>
                          ))
                        )}
                        {(!selectedUser.studyLogs || Object.keys(selectedUser.studyLogs).length === 0) && (
                          <tr>
                            <td colSpan={3} className="p-8 text-center text-[10px] text-zinc-650 italic">
                              Tamamlanmış seans kaydı bulunamadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
