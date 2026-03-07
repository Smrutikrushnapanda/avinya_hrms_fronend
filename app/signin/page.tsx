"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { login } from "../api/api";
import { Eye, EyeOff, ArrowRight, Shield, Zap, Users, BarChart3, CheckCircle, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalizedUserId = userId.trim();
    const normalizedPassword = password.trim();
    if (!normalizedUserId || !normalizedPassword) {
      setError("Please enter both User ID and password.");
      setLoading(false);
      return;
    }

    try {
      const response = await login({ password: normalizedPassword, userName: normalizedUserId });
      const { user: responseUser, access_token } = response.data;

      let roleNames: string[] = [];
      if (Array.isArray(responseUser.roles)) {
        roleNames = responseUser.roles.map((r: any) => {
          if (typeof r === "string") return r;
          if (r.roleName) return r.roleName;
          if (r.name) return r.name;
          if (r.role) return r.role;
          return "";
        }).filter(Boolean);
      }
      if (responseUser.role) {
        if (typeof responseUser.role === "string") roleNames.push(responseUser.role);
        else if (responseUser.role.roleName) roleNames.push(responseUser.role.roleName);
      }
      if (responseUser.roleName) roleNames.push(responseUser.roleName);
      if (responseUser.userType) roleNames.push(responseUser.userType.toUpperCase());
      if (responseUser.type) roleNames.push(responseUser.type.toUpperCase());

      const normalizedRoles = roleNames.map((role) => String(role).toUpperCase());
      const adminSideRoles = new Set(["ADMIN", "HR", "SUPER_ADMIN", "ORG_ADMIN"]);
      const hasAdminSideRole = normalizedRoles.some((role) => adminSideRoles.has(role));
      const hasEmployeeRole = normalizedRoles.includes("EMPLOYEE");

      if (!hasAdminSideRole && !hasEmployeeRole) {
        setError("Access denied. No valid role assigned to this account.");
        setLoading(false);
        return;
      }

      const redirectToAdmin = hasAdminSideRole;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(responseUser));
      localStorage.setItem("user_role", redirectToAdmin ? "ADMIN" : "EMPLOYEE");
      const cookieMaxAge = rememberMe ? 2592000 : 86400;
      document.cookie = `user=${encodeURIComponent(JSON.stringify(responseUser))}; path=/; max-age=${cookieMaxAge}`;
      document.cookie = `user_role=${redirectToAdmin ? "ADMIN" : "EMPLOYEE"}; path=/; max-age=${cookieMaxAge}`;

      toast.success("Welcome back! 🎉");
      setTimeout(() => {
        router.push(redirectToAdmin ? "/admin/dashboard" : "/user/dashboard");
      }, 100);
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || "Invalid credentials. Please try again.");
      setLoading(false);
    }
  };

  const features = [
    { icon: Users,    text: "50,000+ active users" },
    { icon: Shield,   text: "SOC 2 Type II certified" },
    { icon: Zap,      text: "99.9% uptime guarantee" },
    { icon: BarChart3,text: "Real-time HR analytics" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');

        * { box-sizing: border-box; }

        .login-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'DM Sans', sans-serif;
          background: #f8fafc;
        }

        .dark .login-root {
          background: #0f172a;
        }

        .serif { font-family: 'Instrument Serif', serif; }

        .gradient-text {
          background: linear-gradient(135deg, #184a8c 0%, #1e6fbf 50%, #00b4db 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .logo-mark {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #184a8c, #00b4db);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(24,74,140,0.3);
          flex-shrink: 0;
        }

        /* ── left panel ── */
        .left-panel {
          flex: 0 0 48%;
          background: linear-gradient(150deg, #0f2d5c 0%, #184a8c 45%, #1a6db5 78%, #00b4db 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px 60px;
        }

        .dot-grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px);
          background-size: 36px 36px;
          pointer-events: none;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        .feature-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 12px;
          backdrop-filter: blur(8px);
          transition: background .2s;
        }
        .feature-row:hover { background: rgba(255,255,255,0.13); }

        .stat-mini {
          flex: 1;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          backdrop-filter: blur(8px);
        }

        /* ── right panel ── */
        .right-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 48px 40px;
          background: #fff;
        }

        .dark .right-panel {
          background: #1e293b;
        }
        .form-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, rgba(24,74,140,0.08), rgba(0,180,219,0.08));
          border: 1px solid rgba(24,74,140,0.15);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #184a8c;
        }
        .dark .form-badge {
          background: linear-gradient(135deg, rgba(56,189,248,0.12), rgba(34,211,238,0.08));
          border-color: rgba(56,189,248,0.3);
          color: #7dd3fc;
        }
        .accent-text {
          color: #184a8c;
        }
        .dark .accent-text {
          color: #7dd3fc;
        }

        .form-card {
          width: 100%;
          max-width: 420px;
        }

        .form-input {
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
        .form-input:focus { border-color: #184a8c; box-shadow: 0 0 0 3px rgba(24,74,140,0.08); background: #fff; }
        .form-input::placeholder { color: #94a3b8; }

        .dark .form-input {
          border-color: #374151;
          background: #374151;
          color: #f1f5f9;
        }
        .dark .form-input:focus {
          border-color: #184a8c;
          background: #475569;
        }
        .dark .form-input::placeholder {
          color: #9ca3af;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 7px;
          letter-spacing: 0.01em;
        }

        .dark .form-label {
          color: #e5e7eb;
        }

        .submit-btn {
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
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(24,74,140,0.38); }
        .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .eye-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 0;
          display: flex;
          transition: color .2s;
        }
        .eye-btn:hover { color: #475569; }

        .dark .eye-btn {
          color: #9ca3af;
        }
        .dark .eye-btn:hover {
          color: #d1d5db;
        }

        /* ── footer ── */
        .bottom-footer {
          background: #0a0f1a;
          border-top: 1px solid #1e293b;
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* ── mobile topbar ── */
        .mobile-bar {
          display: none;
          padding: 16px 20px;
          background: #fff;
          border-bottom: 1px solid #f1f5f9;
          align-items: center;
          gap: 10px;
        }
        .dark .mobile-bar {
          background: #0f172a;
          border-bottom: 1px solid rgba(148,163,184,0.15);
        }

        .form-card-container {
          background: #fff !important;
          border: 1px solid #e2e8f0 !important;
        }

        .dark .form-card-container {
          background: #334155 !important;
          border: 1px solid #475569 !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
        }

        .header-text {
          color: #0f172a;
        }

        .dark .header-text {
          color: #f1f5f9;
        }

        .subheader-text {
          color: #64748b;
        }

        .dark .subheader-text {
          color: #94a3b8;
        }

        .forgot-link {
          color: #184a8c;
        }

        .dark .forgot-link {
          color: #60a5fa;
        }
        .helper-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .remember-wrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          user-select: none;
        }
        .remember-checkbox {
          width: 15px;
          height: 15px;
          accent-color: #1e6fbf;
          cursor: pointer;
        }
        .remember-label {
          font-size: 12px;
          font-weight: 500;
          color: #475569;
        }
        .dark .remember-label {
          color: #cbd5e1;
        }
        .error-box {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 11px 15px;
        }
        .dark .error-box {
          background: rgba(127,29,29,0.35);
          border-color: rgba(248,113,113,0.4);
        }
        .error-text {
          font-size: 13px;
          color: #dc2626;
          margin: 0;
          font-weight: 500;
        }
        .dark .error-text {
          color: #fca5a5;
        }
        .security-note {
          margin-top: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
        }
        .dark .security-note {
          color: #94a3b8;
        }
        .footer-text {
          font-size: 13px;
          color: #475569;
        }
        .footer-link {
          font-size: 13px;
          color: #475569;
          text-decoration: none;
          transition: color .2s;
        }
        .footer-link:hover {
          color: #94a3b8;
        }
        .dark .footer-text,
        .dark .footer-link {
          color: #94a3b8;
        }
        .dark .footer-link:hover {
          color: #e2e8f0;
        }

        @media (max-width: 1024px) {
          .left-panel { display: none !important; }
          .mobile-bar { display: flex !important; }
          .right-panel { padding: 48px 28px; }
          .login-main { flex-direction: column; }
        }

        @media (max-width: 768px) {
          .right-panel { padding: 40px 24px; }
          .bottom-footer { flex-direction: column; text-align: center; padding: 16px 24px; }
        }
      `}</style>

      <div className="login-root">

        {/* ── Mobile topbar ── */}
        <div className="mobile-bar">
          <div className="logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M12 2v15M4 7l8 5 8-5" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700 }} className="gradient-text">Avinya HRMS</span>
        </div>

        {/* ── Main split ── */}
        <div className="login-main" style={{ flex: 1, display: "flex" }}>

          {/* LEFT PANEL */}
          <div className="left-panel">
            <div className="dot-grid" />
            <div className="orb" style={{ width: 320, height: 320, top: -80, right: -80, background: "rgba(0,180,219,0.18)" }} />
            <div className="orb" style={{ width: 220, height: 220, bottom: -40, left: -40, background: "rgba(255,255,255,0.05)" }} />

            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.7 } }}
              style={{ position: "relative", zIndex: 1, maxWidth: 440 }}
            >
              {/* Logo */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
                <div className="logo-mark">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M12 2v15M4 7l8 5 8-5" stroke="white" strokeWidth="2"/>
                  </svg>
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Avinya HRMS</span>
              </div>

              <h1 style={{ fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-1.2px", marginBottom: 16 }}>
                Welcome back to<br />
                <span className="serif" style={{ fontStyle: "italic", color: "rgba(255,255,255,0.75)", fontWeight: 400 }}>your HR hub.</span>
              </h1>

              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, marginBottom: 40 }}>
                Everything you need to manage your people—payroll, attendance, leave, and analytics—all in one place.
              </p>

              {/* Feature list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>
                {features.map((f, i) => (
                  <motion.div key={f.text}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: 0.15 + i * 0.08 } }}
                    className="feature-row"
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <f.icon size={15} color="#fff" />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{f.text}</span>
                    <CheckCircle size={14} color="rgba(255,255,255,0.4)" style={{ marginLeft: "auto" }} />
                  </motion.div>
                ))}
              </div>

              {/* Mini stats */}
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { value: "500+", label: "Companies" },
                  { value: "50K+", label: "Users" },
                  { value: "24/7", label: "Support" },
                ].map(s => (
                  <div key={s.label} className="stat-mini">
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* RIGHT PANEL */}
          <div className="right-panel">
            <motion.div
              className="form-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 } }}
            >
              {/* Header */}
              <div style={{ marginBottom: 36 }}>
                <div className="form-badge" style={{ marginBottom: 20 }}>
                  <Lock size={11} /> Secure Sign In
                </div>
                <h2 className="header-text" style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.15, marginBottom: 10 }}>
                  Sign in to your<br />
                  <span className="serif accent-text" style={{ fontStyle: "italic" }}>account.</span>
                </h2>
                <p className="subheader-text" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Enter your credentials to access the dashboard.
                </p>
              </div>

              {/* Form Card */}
              <div className="form-card-container" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 32, boxShadow: "0 10px 40px rgba(0,0,0,0.08)" }}>
                {/* Form */}
                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                  <div>
                    <label className="form-label" htmlFor="userid">User ID</label>
                    <input
                      className="form-input"
                      id="userid"
                      type="text"
                      placeholder="Enter your User ID"
                      value={userId}
                      onChange={e => setUserId(e.target.value)}
                      autoComplete="username"
                      disabled={loading}
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                      <label className="form-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
                      <Link href="/forgot-password" className="forgot-link" style={{ fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                      >Forgot password?</Link>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        className="form-input"
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ paddingRight: 44 }}
                        autoComplete="current-password"
                        disabled={loading}
                        required
                      />
                      <button
                        type="button"
                        className="eye-btn"
                        onClick={() => setShowPassword(p => !p)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <div className="helper-row">
                    <label className="remember-wrap" htmlFor="remember-me">
                      <input
                        id="remember-me"
                        type="checkbox"
                        className="remember-checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={loading}
                      />
                      <span className="remember-label">Keep me signed in</span>
                    </label>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="error-box"
                    >
                      <p className="error-text">{error}</p>
                    </motion.div>
                  )}

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        Signing in…
                      </>
                    ) : (
                      <>Sign In <ArrowRight size={16} /></>
                    )}
                  </button>
                  <div className="security-note">
                    <Shield size={12} />
                    Protected with enterprise-grade security
                  </div>

                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </form>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bottom-footer">
          <span className="footer-text">© 2026 Avinya HRMS. All rights reserved.</span>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Support", "/support"]].map(([label, href]) => (
              <Link key={label} href={href} className="footer-link">{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
