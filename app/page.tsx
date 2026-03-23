"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  Users,
  Calendar,
  DollarSign,
  ArrowRight,
  Shield,
  BarChart3,
  Smartphone,
  Zap,
  Star,
  CheckCircle,
  Award,
  ChevronDown,
  Play,
  TrendingUp,
  Clock,
  Globe,
  Layers,
} from "lucide-react";

/* ─────────────── tiny helpers ─────────────── */
function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 20);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─────────────── main page ─────────────── */
export default function Home() {
  const router = useRouter();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -80]);

  const features = [
    { icon: Users,      title: "Employee Directory",   desc: "Centralise records, org charts, and contact info across every department.",  color: "#2563eb", bg: "#eff6ff" },
    { icon: Calendar,   title: "Leave Management",     desc: "One-click requests, smart approvals, and real-time balance tracking.",        color: "#059669", bg: "#ecfdf5" },
    { icon: DollarSign, title: "Payroll & Attendance", desc: "Automated payroll synced with live attendance data—zero errors guaranteed.",  color: "#7c3aed", bg: "#f5f3ff" },
    { icon: BarChart3,  title: "Analytics Dashboard",  desc: "Predictive insights and custom reports that surface what matters most.",      color: "#ea580c", bg: "#fff7ed" },
    { icon: Shield,     title: "Enterprise Security",  desc: "Role-based access, SSO, audit trails, and SOC 2 Type II compliance.",        color: "#0891b2", bg: "#ecfeff" },
    { icon: Smartphone, title: "Mobile-First",         desc: "Native iOS & Android apps so your team stays connected on the move.",        color: "#be185d", bg: "#fdf2f8" },
  ];

  const testimonials = [
    { name: "Sarah Johnson",   role: "HR Director · TechCorp",       quote: "Avinya cut our HR admin by 60%. Setup took one afternoon—adoption was immediate.", rating: 5, avatar: "SJ" },
    { name: "Michael Chen",    role: "CEO · StartupXYZ",              quote: "The best people-ops decision we made. Scales perfectly from 10 to 1,000 employees.", rating: 5, avatar: "MC" },
    { name: "Emily Rodriguez", role: "Operations · GlobalInc",        quote: "Employees actually enjoy using it. The self-service portal alone paid for itself.", rating: 5, avatar: "ER" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900" style={{ fontFamily: "'DM Sans', 'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');

        .serif { font-family: 'Instrument Serif', serif; }

        .nav-glass {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(24,74,140,0.08);
        }

        .dark .nav-glass {
          background: rgba(15,23,42,0.85);
          border-bottom: 1px solid rgba(148,163,184,0.1);
        }

        .hero-grid {
          background-color: #f8fafc;
          background-image:
            linear-gradient(rgba(24,74,140,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(24,74,140,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .dark .hero-grid {
          background-color: #0f172a;
          background-image:
            linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px);
        }

        .gradient-text {
          background: linear-gradient(135deg, #184a8c 0%, #1e6fbf 50%, #00b4db 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-title-sub {
          color: #1e293b;
        }
        .dark .hero-title-sub {
          color: #e2e8f0;
        }
        .hero-description {
          color: #64748b;
        }
        .dark .hero-description {
          color: #94a3b8;
        }
        .hero-trust-text {
          color: #64748b;
        }
        .dark .hero-trust-text {
          color: #cbd5e1;
        }
        .section-title {
          color: #0f172a;
        }
        .dark .section-title {
          color: #e2e8f0;
        }
        .section-subtitle {
          color: #64748b;
        }
        .dark .section-subtitle {
          color: #94a3b8;
        }
        .section-accent {
          color: #184a8c;
        }
        .dark .section-accent {
          color: #38bdf8;
        }
        .card-title-text {
          color: #0f172a;
        }
        .dark .card-title-text {
          color: #e2e8f0;
        }
        .card-subtitle-text {
          color: #64748b;
        }
        .dark .card-subtitle-text {
          color: #94a3b8;
        }
        .testimonial-quote {
          color: #334155;
        }
        .dark .testimonial-quote {
          color: #cbd5e1;
        }

        .btn-primary {
          background: linear-gradient(135deg, #184a8c, #1e6fbf);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 14px 32px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all .25s;
          box-shadow: 0 4px 20px rgba(24,74,140,0.25);
          font-family: inherit;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(24,74,140,0.35); }

        .btn-outline {
          background: transparent;
          color: #184a8c;
          border: 1.5px solid rgba(24,74,140,0.3);
          border-radius: 12px;
          padding: 13px 32px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all .25s;
          font-family: inherit;
        }
        .btn-outline:hover { background: rgba(24,74,140,0.06); border-color: #184a8c; }

        .btn-white {
          background: #fff;
          color: #184a8c;
          border: none;
          border-radius: 12px;
          padding: 14px 32px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all .25s;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
          font-family: inherit;
        }
        .btn-white:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.2); }

        .feature-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid rgba(0,0,0,0.06);
          padding: 36px 32px;
          transition: all .3s;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity .3s;
          background: linear-gradient(135deg, rgba(24,74,140,0.03), rgba(0,180,219,0.03));
        }
        .feature-card:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(0,0,0,0.1); border-color: rgba(24,74,140,0.15); }
        .feature-card:hover::before { opacity: 1; }

        .dark .feature-card {
          background: #1e293b;
          border-color: rgba(148,163,184,0.1);
        }
        .dark .feature-card:hover {
          border-color: rgba(24,74,140,0.3);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 100px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.9);
          backdrop-filter: blur(8px);
        }

        .testimonial-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid rgba(0,0,0,0.06);
          padding: 36px;
          height: 100%;
          transition: all .3s;
        }
        .testimonial-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.08); }

        .dark .testimonial-card {
          background: #1e293b;
          border-color: rgba(148,163,184,0.1);
        }
        .dark .testimonial-card:hover {
          box-shadow: 0 16px 48px rgba(0,0,0,0.3);
        }

        .scroll-indicator {
          animation: bounce 2s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }

        .stats-section {
          background: #fff !important;
        }
        .dark .stats-section {
          background: #0f172a !important;
          border-color: rgba(148,163,184,0.1) !important;
        }

        .features-section {
          background: #f8fafc !important;
        }
        .dark .features-section {
          background: #0f172a !important;
        }

        .how-it-works-section {
          background: #fff !important;
        }
        .dark .how-it-works-section {
          background: #1e293b !important;
        }

        .testimonials-section {
          background: #f8fafc !important;
        }
        .dark .testimonials-section {
          background: #0f172a !important;
        }

        .dashboard-mockup {
          background: #fff !important;
        }
        .dark .dashboard-mockup {
          background: #1e293b !important;
          border-color: rgba(148,163,184,0.2) !important;
        }
        .dashboard-browser {
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
        }
        .dark .dashboard-browser {
          background: #0f172a;
          border-bottom: 1px solid rgba(148,163,184,0.2);
        }
        .dashboard-address {
          background: #e2e8f0;
          color: #94a3b8;
        }
        .dark .dashboard-address {
          background: #1e293b;
          color: #94a3b8;
        }
        .dashboard-body {
          background: #f8fafc;
        }
        .dark .dashboard-body {
          background: #0f172a;
        }
        .dashboard-panel {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
        }
        .dark .dashboard-panel {
          background: #1e293b;
          border-color: rgba(148,163,184,0.2);
        }
        .dashboard-text-primary {
          color: #1e293b;
        }
        .dark .dashboard-text-primary {
          color: #e2e8f0;
        }
        .dashboard-text-muted {
          color: #94a3b8;
        }
        .dark .dashboard-text-muted {
          color: #94a3b8;
        }

        .logo-mark {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #184a8c, #00b4db);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(24,74,140,0.3);
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        .cta-section {
          background: linear-gradient(135deg, #0f2d5c 0%, #184a8c 40%, #1a6db5 70%, #00b4db 100%);
          position: relative;
          overflow: hidden;
        }

        .process-line::after {
          content: '';
          position: absolute;
          top: 24px;
          left: calc(50% + 40px);
          width: calc(100% - 80px);
          height: 1px;
          background: linear-gradient(90deg, #184a8c, #00b4db);
          opacity: 0.2;
        }

        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, rgba(24,74,140,0.08), rgba(0,180,219,0.08));
          border: 1px solid rgba(24,74,140,0.15);
          border-radius: 100px;
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #184a8c;
        }
      `}</style>

      {/* ══════════════════ HERO ══════════════════ */}
      <motion.section
        style={{ y: heroY }}
        className="hero-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px 80px", position: "relative" }}>
          
          {/* Ambient orbs */}
          <div className="orb" style={{ width: 500, height: 500, top: -100, right: -100, background: "radial-gradient(circle, rgba(0,180,219,0.12) 0%, transparent 70%)" }} />
          <div className="orb" style={{ width: 400, height: 400, bottom: 0, left: -60, background: "radial-gradient(circle, rgba(24,74,140,0.1) 0%, transparent 70%)" }} />

          <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center", position: "relative" }}>
            
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}>
              <span className="badge-pill">
                <Zap size={12} color="#184a8c" />
                Modern HR Platform for Growing Businesses
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.7 } }}
              style={{ fontSize: "clamp(42px, 7vw, 80px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", marginTop: 28, marginBottom: 24 }}
            >
              <span className="gradient-text">HR that works</span>
              <br />
              <span className="serif hero-title-sub" style={{ fontStyle: "italic", letterSpacing: "-1px" }}>as hard as you do.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.35 } }}
              className="hero-description"
              style={{ fontSize: "clamp(16px, 2vw, 20px)", maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.7 }}
            >
              Streamline every HR workflow—from hire to retire—with an intelligent 
              platform built to scale alongside your ambitions.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.45 } }}
              style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
            >
              <button className="btn-primary" onClick={() => router.push("/pricing")}>
                Start Free Trial <ArrowRight size={16} />
              </button>
              <button className="btn-outline" onClick={() => {}}>
                <Play size={14} fill="#184a8c" /> Watch Demo
              </button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.6 } }}
              style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginTop: 40 }}
            >
              {["No credit card required", "14-day free trial", "Cancel anytime"].map(t => (
                <span key={t} className="hero-trust-text" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500 }}>
                  <CheckCircle size={14} color="#10b981" strokeWidth={2.5} /> {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* ── Dashboard mock-up ── */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.55, duration: 0.8 } }}
            style={{ marginTop: 72, position: "relative" }}
          >
            {/* Glow */}
            <div style={{ position: "absolute", inset: "20px 10%", background: "linear-gradient(135deg, rgba(24,74,140,0.15), rgba(0,180,219,0.15))", filter: "blur(40px)", borderRadius: 24, zIndex: 0 }} />

            <div className="dashboard-mockup" style={{ background: "#fff", borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.12)", position: "relative", zIndex: 1 }}>
              {/* Browser chrome */}
              <div className="dashboard-browser" style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#f87171","#fbbf24","#34d399"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
                </div>
                <div className="dashboard-address" style={{ flex: 1, borderRadius: 6, padding: "4px 12px", fontSize: 12, maxWidth: 320, margin: "0 auto" }}>
                  app.avinya-hrms.com/dashboard
                </div>
              </div>

              {/* Dashboard body */}
              <div className="dashboard-body" style={{ padding: 28 }}>
                
                {/* Top stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                  {[
                    { label: "Total Employees", value: "1,284", icon: Users, delta: "+12%", color: "#2563eb" },
                    { label: "On Leave Today",  value: "47",    icon: Calendar, delta: "-3%",  color: "#7c3aed" },
                    { label: "Payroll Due",     value: "$284K", icon: DollarSign, delta: "On track", color: "#059669" },
                    { label: "Avg Attendance",  value: "96.4%", icon: TrendingUp, delta: "+1.2%", color: "#ea580c" },
                  ].map(s => (
                    <div key={s.label} className="dashboard-panel" style={{ padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div className="dashboard-text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                        <div style={{ background: s.color + "18", borderRadius: 8, padding: "4px 6px", display: "flex" }}>
                          <s.icon size={13} color={s.color} />
                        </div>
                      </div>
                      <div className="dashboard-text-primary" style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: s.delta.startsWith("+") ? "#10b981" : s.delta.startsWith("-") ? "#f43f5e" : "#64748b", fontWeight: 500 }}>{s.delta}</div>
                    </div>
                  ))}
                </div>

                {/* Bottom two columns */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Activity feed */}
                  <div className="dashboard-panel" style={{ padding: 20 }}>
                    <div className="dashboard-text-primary" style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Recent Activity</div>
                    {[
                      { name: "Alex Kumar",   action: "Submitted leave request",  time: "2m ago",   dot: "#2563eb" },
                      { name: "Priya Nair",   action: "Completed onboarding",     time: "18m ago",  dot: "#059669" },
                      { name: "Tom Wright",   action: "Updated personal details", time: "1h ago",   dot: "#7c3aed" },
                      { name: "Lisa Chang",   action: "Approved payroll batch",   time: "3h ago",   dot: "#ea580c" },
                    ].map(a => (
                      <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: a.dot + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: a.dot, flexShrink: 0 }}>
                          {a.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="dashboard-text-primary" style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div>
                          <div className="dashboard-text-muted" style={{ fontSize: 11 }}>{a.action}</div>
                        </div>
                        <div className="dashboard-text-muted" style={{ fontSize: 10, whiteSpace: "nowrap", opacity: 0.8 }}>{a.time}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mini chart */}
                  <div style={{ background: "linear-gradient(135deg, #184a8c, #1e6fbf)", borderRadius: 14, padding: 20, position: "relative", overflow: "hidden" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: 6 }}>Headcount Growth</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 4 }}>+18%</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>vs last quarter</div>
                    <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
                      {[30,45,40,55,50,70,60,80,75,90,85,100].map((h, i) => (
                        <div key={i} style={{ flex: 1, height: `${h}%`, background: i >= 9 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)", borderRadius: "3px 3px 0 0", transition: "height .5s" }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Scroll hint */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
            <div className="scroll-indicator" style={{ color: "#94a3b8", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Scroll to explore</span>
              <ChevronDown size={18} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* ══════════════════ STATS BAND ══════════════════ */}
      <section style={{ background: "#fff", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", padding: "48px 24px" }} className="stats-section">
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 32, textAlign: "center" }}>
          {[
            { value: 500, suffix: "+", label: "Companies Trust Us" },
            { value: 50000, suffix: "+", label: "Active Users" },
            { value: 99, suffix: ".9%", label: "Uptime SLA" },
            { value: 2, suffix: "hr", label: "Avg Response Time" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-1.5px" }} className="gradient-text">
                <CountUp target={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════ FEATURES ══════════════════ */}
      <section style={{ padding: "96px 24px", background: "#f8fafc" }} className="features-section">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="badge-pill" style={{ marginBottom: 20, display: "inline-flex" }}><Layers size={12} /> Platform Features</span>
              <h2 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: 16 }}>
                Everything HR, <span className="serif" style={{ fontStyle: "italic" }}>unified.</span>
              </h2>
              <p className="section-subtitle" style={{ fontSize: 18, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
                Six powerful modules, one seamless experience. No more switching between tools.
              </p>
            </motion.div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0, transition: { delay: i * 0.07 } }}
                viewport={{ once: true }}
                className="feature-card"
              >
                <div style={{ width: 52, height: 52, borderRadius: 14, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <f.icon size={24} color={f.color} strokeWidth={2} />
                </div>
                <h3 className="card-title-text" style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.3px" }}>{f.title}</h3>
                <p className="card-subtitle-text" style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section style={{ padding: "96px 24px", background: "#fff" }} className="how-it-works-section">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="badge-pill" style={{ marginBottom: 20, display: "inline-flex" }}><Clock size={12} /> Quick Setup</span>
              <h2 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-1.5px" }}>
                Up and running in <span className="serif section-accent" style={{ fontStyle: "italic" }}>minutes.</span>
              </h2>
            </motion.div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32, position: "relative" }}>
            {[
              { step: "01", icon: Globe,     title: "Create your account",  desc: "Sign up in 30 seconds—no credit card, no commitment." },
              { step: "02", icon: Users,     title: "Import your team",     desc: "Upload a CSV or connect your existing HRIS in one click." },
              { step: "03", icon: Layers,    title: "Configure workflows",  desc: "Set leave policies, payroll rules, and approval chains." },
              { step: "04", icon: Zap,       title: "Go live",              desc: "Invite employees and watch productivity soar from day one." },
            ].map((s, i) => (
              <motion.div key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0, transition: { delay: i * 0.1 } }}
                viewport={{ once: true }}
                style={{ textAlign: "center", position: "relative" }}
              >
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #184a8c, #00b4db)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(24,74,140,0.25)" }}>
                  <s.icon size={22} color="#fff" />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#00b4db", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Step {s.step}</div>
                <h3 className="card-title-text" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p className="card-subtitle-text" style={{ fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIALS ══════════════════ */}
      <section style={{ padding: "96px 24px", background: "#f8fafc" }} className="testimonials-section">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="badge-pill" style={{ marginBottom: 20, display: "inline-flex" }}><Star size={12} /> Testimonials</span>
              <h2 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-1.5px" }}>
                Loved by HR teams <span className="serif" style={{ fontStyle: "italic" }}>worldwide.</span>
              </h2>
            </motion.div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {testimonials.map((t, i) => (
              <motion.div key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0, transition: { delay: i * 0.1 } }}
                viewport={{ once: true }}
                className="testimonial-card"
              >
                <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
                  {Array.from({ length: t.rating }).map((_, j) => <Star key={j} size={16} fill="#fbbf24" color="#fbbf24" />)}
                </div>
                <p className="testimonial-quote" style={{ fontSize: 15, lineHeight: 1.75, marginBottom: 24, fontStyle: "italic" }}>
                  "{t.quote}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #184a8c, #00b4db)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="card-title-text" style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                    <div className="card-subtitle-text" style={{ fontSize: 12 }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ CTA ══════════════════ */}
      <section className="cta-section" style={{ padding: "96px 24px" }}>
        {/* Dot pattern */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
        {/* Orbs */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(0,180,219,0.15)", filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.05)", filter: "blur(60px)", pointerEvents: "none" }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}
        >
          <div className="stat-pill" style={{ marginBottom: 24, display: "inline-flex" }}>
            <Award size={13} /> Join 500+ companies already transforming HR
          </div>

          <h2 style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-2px", marginBottom: 20 }}>
            Ready to transform<br/>
            <span className="serif" style={{ fontStyle: "italic", color: "rgba(255,255,255,0.85)" }}>your HR experience?</span>
          </h2>

          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.65)", marginBottom: 44, lineHeight: 1.7 }}>
            Start your free 14-day trial and see why leading companies choose Avinya to manage their most important asset — their people.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
            <button className="btn-white" onClick={() => router.push("/pricing")}>
              Start Free Trial <ArrowRight size={16} />
            </button>
            <button
              style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(8px)", transition: "all .25s" }}
              onClick={() => router.push("/contact-sales")}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            >
              Contact Sales
            </button>
          </div>

          <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
            {["No credit card required", "14-day free trial", "Cancel anytime"].map(t => (
              <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                <CheckCircle size={14} color="rgba(255,255,255,0.55)" strokeWidth={2.5} /> {t}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

    </div>
  );
}
