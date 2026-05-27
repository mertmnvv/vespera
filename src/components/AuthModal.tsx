"use client";

import React, { useState } from "react";
import { Mail, Lock, X, Loader2, User } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess();
    } catch (err: unknown) {
      console.error("Google sign-in error:", err);
      const authErr = err as { code?: string; message?: string };
      if (authErr.code === "auth/popup-closed-by-user") {
        setLoading(false);
        return;
      }
      setError("Google ile giriş yaparken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedEmail || !trimmedPassword || (isSignUp && !trimmedDisplayName)) {
      setError("Lütfen tüm alanları doldurun.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: trimmedDisplayName,
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      }
      onSuccess();
    } catch (err: unknown) {
      console.error("Auth error:", err);
      const authErr = err as { code?: string; message?: string };
      let errMsg = "Bir hata oluştu, lütfen tekrar deneyin.";
      if (authErr.code === "auth/email-already-in-use") {
        errMsg = "Bu e-posta adresi zaten kullanımda.";
      } else if (authErr.code === "auth/invalid-email") {
        errMsg = "Geçersiz e-posta adresi.";
      } else if (authErr.code === "auth/weak-password") {
        errMsg = "Şifre en az 6 karakter olmalıdır.";
      } else if (authErr.code === "auth/wrong-password" || authErr.code === "auth/user-not-found" || authErr.code === "auth/invalid-credential") {
        errMsg = "E-posta veya şifre hatalı.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-up">
      <div className="glass-card w-full max-w-sm p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-550 hover:text-zinc-200 transition-colors p-1.5 rounded-lg hover:bg-zinc-800/40"
          disabled={loading}
        >
          <X size={16} />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold tracking-widest text-zinc-100">
            {isSignUp ? "VESPERA'YA KAYDOL" : "VESPERA GİRİŞ"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1.5">
            {isSignUp
              ? "Çalışma verilerini bulutla senkronize etmek için hesap oluştur."
              : "Verilerini buluttan yüklemek ve yedeklemek için giriş yap."}
          </p>
        </div>

         {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg p-2.5 text-center">
              {error}
            </div>
          )}

          {/* Display Name (Only on Sign Up) */}
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Ad Soyad / İsim
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-600">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  placeholder="İsminiz (örn: Mert)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isSignUp}
                  disabled={loading}
                  maxLength={25}
                  className="w-full text-sm bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700/50 focus:border-zinc-500/50 rounded-lg pl-10 pr-3 py-2 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-500/25 transition-all disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              E-posta
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-600">
                <Mail size={16} />
              </span>
              <input
                type="email"
                placeholder="ornek@e-posta.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full text-sm bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700/50 focus:border-zinc-500/50 rounded-lg pl-10 pr-3 py-2 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-500/25 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Şifre
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-600">
                <Lock size={16} />
              </span>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full text-sm bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700/50 focus:border-zinc-500/50 rounded-lg pl-10 pr-3 py-2 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-500/25 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-zinc-200 text-zinc-950 font-semibold hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 disabled:opacity-55 active:scale-98"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>İşleniyor...</span>
              </>
            ) : (
              <span>{isSignUp ? "Hesap Oluştur" : "Giriş Yap"}</span>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center justify-center gap-3 my-2 text-zinc-600">
            <div className="h-px bg-zinc-800/60 flex-grow" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">veya</span>
            <div className="h-px bg-zinc-800/60 flex-grow" />
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-800/60 hover:border-zinc-700/50 transition-all flex items-center justify-center gap-2.5 disabled:opacity-55 active:scale-98 text-zinc-250 font-medium text-sm"
          >
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.105C18.29 2.02 15.5 1 12.24 1 6.133 1 1.16 5.928 1.16 12s4.973 11 11.08 11c6.38 0 10.62-4.474 10.62-10.796 0-.727-.078-1.282-.172-1.919h-10.45z"/>
            </svg>
            <span>Google ile Devam Et</span>
          </button>
        </form>

        {/* Toggle */}
        <div className="text-center mt-5 pt-4 border-t border-zinc-800/40">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            disabled={loading}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors"
          >
            {isSignUp
              ? "Zaten bir hesabın var mı? Giriş Yap"
              : "Henüz hesabın yok mu? Hemen Kaydol"}
          </button>
        </div>
      </div>
    </div>
  );
}
