"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, UserRound, ArrowLeft, ChevronRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { requestPasswordResetOtp, resetAdminCredentials } from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const autoSentRef = useRef(false);

  const requestOtp = async (rawIdentifier: string) => {
    const normalizedIdentifier = rawIdentifier.trim().toLowerCase();

    if (!normalizedIdentifier) {
      toast.error("Enter admin email or user ID");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordResetOtp({ identifier: normalizedIdentifier });
      setIdentifier(normalizedIdentifier);
      setStep("reset");
      toast.success("OTP sent to registered admin email");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoSentRef.current || typeof window === "undefined") return;
    const queryIdentifier = new URLSearchParams(window.location.search).get("identifier") || "";
    if (!queryIdentifier.trim()) return;

    autoSentRef.current = true;
    requestOtp(queryIdentifier);
  }, []);

  const sendOtp = async (event: FormEvent) => {
    event.preventDefault();
    await requestOtp(identifier);
  };

  const resetCredentials = async (event: FormEvent) => {
    event.preventDefault();

    if (otp.trim().length !== 6) {
      toast.error("Enter 6 digit OTP");
      return;
    }

    if (newUserName.trim().length < 3) {
      toast.error("User ID must be at least 3 characters");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetAdminCredentials({
        identifier: identifier.trim().toLowerCase(),
        otp: otp.trim(),
        newUserName: newUserName.trim(),
        newPassword,
      });
      toast.success("Admin credentials updated");
      router.push("/signin");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not reset credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');

        * { box-sizing: border-box; }

        .fp-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          background: linear-gradient(150deg, #0f2d5c 0%, #184a8c 45%, #1a6db5 78%, #00b4db 100%);
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        .dark .fp-root {
          background: linear-gradient(150deg, #0a1628 0%, #0f2d5c 45%, #184a8c 78%, #0f4b6e 100%);
        }

        .fp-dot-grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 36px 36px;
          pointer-events: none;
        }

        .fp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        .fp-card {
          width: 100%;
          max-width: 480px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.25);
          position: relative;
          z-index: 1;
        }

        .dark .fp-card {
          background: rgba(30, 41, 59, 0.95);
          border-color: rgba(71, 85, 105, 0.5);
          box-shadow: 0 25px 60px rgba(0,0,0,0.5);
        }

        .fp-form-input {
          width: 100%;
          padding: 13px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 11px;
          font-size: 14px;
          font-family: inherit;
          color: #1e293b;
          background: #f8fafc;
          transition: border-color .2s, box-shadow .2s, background .2s;
          outline: none;
        }
        .fp-form-input:focus { border-color: #184a8c; box-shadow: 0 0 0 3px rgba(24,74,140,0.08); background: #fff; }
        .fp-form-input::placeholder { color: #94a3b8; }

        .dark .fp-form-input {
          border-color: #475569;
          background: #1e293b;
          color: #f1f5f9;
        }
        .dark .fp-form-input:focus {
          border-color: #184a8c;
          background: #334155;
        }
        .dark .fp-form-input::placeholder {
          color: #64748b;
        }

        .fp-form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 7px;
          letter-spacing: 0.01em;
        }

        .dark .fp-form-label {
          color: #e2e8f0;
        }

        .fp-submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #184a8c, #1e6fbf);
          color: #fff;
          border: none;
          border-radius: 11px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all .25s;
          box-shadow: 0 4px 20px rgba(24,74,140,0.28);
          letter-spacing: 0.01em;
        }
        .fp-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(24,74,140,0.38); }
        .fp-submit-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .fp-step-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          transition: all .4s;
        }

        .fp-step-line {
          flex: 1;
          height: 2px;
          transition: all .4s;
        }

        .serif { font-family: 'Instrument Serif', serif; }
      `}</style>

      <div className="fp-root">
        <div className="fp-dot-grid" />
        <div className="fp-orb" style={{ width: 400, height: 400, top: -120, right: -100, background: "rgba(0,180,219,0.15)" }} />
        <div className="fp-orb" style={{ width: 300, height: 300, bottom: -80, left: -80, background: "rgba(255,255,255,0.06)" }} />

        <motion.div
          className="fp-card"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#184a8c] to-[#1e6fbf] text-white shadow-lg shadow-[#184a8c]/25">
              <Lock size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Reset admin access
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Email OTP verification required
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className="fp-step-dot bg-[#184a8c] dark:bg-[#60a5fa]" />
            <div className={`fp-step-line rounded-full ${step === "reset" ? "bg-[#184a8c] dark:bg-[#60a5fa]" : "bg-slate-200 dark:bg-slate-700"}`} />
            <div className={`fp-step-dot ${step === "reset" ? "bg-[#184a8c] dark:bg-[#60a5fa]" : "bg-slate-300 dark:bg-slate-600"}`} />
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-auto">
              Step {step === "email" ? "1" : "2"} of 2
            </span>
          </div>

          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.form
                key="email-step"
                onSubmit={sendOtp}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="fp-form-label" htmlFor="identifier">
                    Registered admin email or user ID
                  </label>
                  <div className="relative">
                    <input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="admin@company.com"
                      className="fp-form-input pl-10"
                      autoComplete="username"
                    />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                    We&apos;ll send a one-time OTP to the registered email.
                  </p>
                </div>

                <Button type="submit" className="fp-submit-btn" loading={loading}>
                  <KeyRound size={16} />
                  Send OTP
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <ShieldCheck size={12} />
                  OTP will expire in 10 minutes
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="reset-step"
                onSubmit={resetCredentials}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="fp-form-label" htmlFor="otp">
                    Email OTP
                  </label>
                  <input
                    id="otp"
                    inputMode="numeric"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6 digit OTP"
                    className="fp-form-input text-center text-lg tracking-[0.3em] font-mono"
                    autoComplete="one-time-code"
                  />
                </div>

                <div className="space-y-2">
                  <label className="fp-form-label" htmlFor="newUserName">
                    New user ID
                  </label>
                  <div className="relative">
                    <input
                      id="newUserName"
                      value={newUserName}
                      onChange={(event) => setNewUserName(event.target.value)}
                      placeholder="admin_user"
                      className="fp-form-input pl-10"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="fp-form-label" htmlFor="newPassword">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Minimum 6 characters"
                      className="fp-form-input pr-11"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="fp-form-label" htmlFor="confirmPassword">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat password"
                    className="fp-form-input"
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="fp-submit-btn" loading={loading}>
                  <ShieldCheck size={16} />
                  Update admin credentials
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
            {step === "reset" ? (
              <button
                type="button"
                onClick={() => setStep("email")}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft size={14} />
                Resend OTP
              </button>
            ) : (
              <div />
            )}
            <Link
              href="/signin"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#184a8c] dark:text-[#60a5fa] hover:underline"
            >
              Back to sign in
              <ChevronRight size={14} />
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}
