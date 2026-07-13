"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ShieldAlert, KeyRound, ShieldCheck, ArrowLeft, ChevronRight, Mail } from "lucide-react";
import { toast } from "sonner";
import { requestSuperadminOtp, verifySuperadminOtp } from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const RESEND_COOLDOWN_SECONDS = 60;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day — kept short for a high-privilege account

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const token = localStorage.getItem("access_token");
      const rawRole = localStorage.getItem("user_role");
      if (token && rawRole?.toUpperCase() === "SUPERADMIN") {
        router.replace("/superadmin/dashboard");
      }
    } catch {
      // ignore malformed local storage and stay on login
    }
  }, [router]);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((value) => {
        if (value <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  };

  const requestOtp = async (rawEmail: string) => {
    const normalizedEmail = rawEmail.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await requestSuperadminOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setStep("otp");
      startCooldown();
      toast.success("OTP sent to the super admin email");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (event: FormEvent) => {
    event.preventDefault();
    await requestOtp(email);
  };

  const resendOtp = async () => {
    if (cooldown > 0 || loading) return;
    await requestOtp(email);
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();

    if (otp.trim().length !== 6) {
      toast.error("Enter the 6 digit OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await verifySuperadminOtp(email, otp.trim());
      const { user, access_token } = response.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("user_role", "SUPERADMIN");

      document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${SESSION_MAX_AGE_SECONDS}`;
      document.cookie = `user_role=SUPERADMIN; path=/; max-age=${SESSION_MAX_AGE_SECONDS}`;
      document.cookie = `must_change_password=0; path=/; max-age=${SESSION_MAX_AGE_SECONDS}`;

      toast.success("Welcome back, Super Admin");
      router.push("/superadmin/dashboard");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');

        * { box-sizing: border-box; }

        .sa-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          background: linear-gradient(150deg, #1a0f2e 0%, #3b0f5c 45%, #7c1a6d 78%, #b0264f 100%);
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        .dark .sa-root {
          background: linear-gradient(150deg, #0f0a1a 0%, #2a0f45 45%, #5c1450 78%, #7a1a3a 100%);
        }

        .sa-dot-grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 36px 36px;
          pointer-events: none;
        }

        .sa-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        .sa-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          position: relative;
          z-index: 1;
        }

        .dark .sa-card {
          background: rgba(24, 16, 34, 0.96);
          border-color: rgba(99, 60, 120, 0.4);
          box-shadow: 0 25px 60px rgba(0,0,0,0.55);
        }

        .sa-form-input {
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
        .sa-form-input:focus { border-color: #7c1a6d; box-shadow: 0 0 0 3px rgba(124,26,109,0.1); background: #fff; }
        .sa-form-input::placeholder { color: #94a3b8; }

        .dark .sa-form-input {
          border-color: #4b3358;
          background: #1e1428;
          color: #f1f5f9;
        }
        .dark .sa-form-input:focus {
          border-color: #b0264f;
          background: #2a1c38;
        }
        .dark .sa-form-input::placeholder {
          color: #8b7a99;
        }

        .sa-form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 7px;
          letter-spacing: 0.01em;
        }

        .dark .sa-form-label {
          color: #e2e8f0;
        }

        .sa-submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #7c1a6d, #b0264f);
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
          box-shadow: 0 4px 20px rgba(124,26,109,0.3);
          letter-spacing: 0.01em;
        }
        .sa-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,26,109,0.4); }
        .sa-submit-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .sa-step-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          transition: all .4s;
        }

        .sa-step-line {
          flex: 1;
          height: 2px;
          transition: all .4s;
        }
      `}</style>

      <div className="sa-root">
        <div className="sa-dot-grid" />
        <div className="sa-orb" style={{ width: 400, height: 400, top: -120, right: -100, background: "rgba(176,38,79,0.2)" }} />
        <div className="sa-orb" style={{ width: 300, height: 300, bottom: -80, left: -80, background: "rgba(255,255,255,0.05)" }} />

        <motion.div
          className="sa-card"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c1a6d] to-[#b0264f] text-white shadow-lg shadow-[#7c1a6d]/25">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Super Admin access
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Restricted to one authorized email — verified by OTP
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className="sa-step-dot bg-[#7c1a6d] dark:bg-[#e879b9]" />
            <div className={`sa-step-line rounded-full ${step === "otp" ? "bg-[#7c1a6d] dark:bg-[#e879b9]" : "bg-slate-200 dark:bg-slate-700"}`} />
            <div className={`sa-step-dot ${step === "otp" ? "bg-[#7c1a6d] dark:bg-[#e879b9]" : "bg-slate-300 dark:bg-slate-600"}`} />
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
                  <label className="sa-form-label" htmlFor="sa-email">
                    Authorized email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="sa-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@company.com"
                      className="sa-form-input pl-10"
                      autoComplete="email"
                      autoFocus
                      required
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                    Only the configured super admin email can request an OTP.
                  </p>
                </div>

                <Button type="submit" className="sa-submit-btn" loading={loading}>
                  <KeyRound size={16} />
                  Send OTP
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <ShieldCheck size={12} />
                  OTP expires in 10 minutes
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="otp-step"
                onSubmit={verifyOtp}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="sa-form-label" htmlFor="sa-otp">
                    Email OTP
                  </label>
                  <input
                    id="sa-otp"
                    inputMode="numeric"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6 digit OTP"
                    className="sa-form-input text-center text-lg tracking-[0.3em] font-mono"
                    autoComplete="one-time-code"
                    autoFocus
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Sent to <span className="font-semibold">{email}</span>
                  </p>
                </div>

                <Button type="submit" className="sa-submit-btn" loading={loading}>
                  <ShieldCheck size={16} />
                  Verify & Sign In
                </Button>

                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={cooldown > 0 || loading}
                  className="w-full text-center text-xs font-semibold text-[#7c1a6d] dark:text-[#e879b9] disabled:text-slate-400 disabled:dark:text-slate-500 hover:underline disabled:no-underline transition-colors"
                >
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
            {step === "otp" ? (
              <button
                type="button"
                onClick={() => setStep("email")}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft size={14} />
                Change email
              </button>
            ) : (
              <div />
            )}
            <Link
              href="/signin"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#7c1a6d] dark:text-[#e879b9] hover:underline"
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
