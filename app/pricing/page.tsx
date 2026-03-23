"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Clock3,
  Mail,
  Phone,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

type CompareValue = boolean | string;

const starterFeatures = [
  "Employee directory and profiles",
  "Leave and attendance tracking",
  "Payroll exports and reports",
  "Email support",
];

const proFeatures = [
  "Everything in Starter",
  "Automated payroll workflows",
  "Advanced analytics dashboard",
  "Mobile app access",
  "Priority support + onboarding",
  "Custom role permissions and API access",
];

const compareRows: Array<{ label: string; starter: CompareValue; pro: CompareValue }> = [
  { label: "Employee Directory", starter: true, pro: true },
  { label: "Leave & Attendance", starter: true, pro: true },
  { label: "Payroll Processing", starter: "Standard", pro: "Automated" },
  { label: "Analytics", starter: "Basic", pro: "Advanced" },
  { label: "Mobile App", starter: false, pro: true },
  { label: "Workflow Automation", starter: false, pro: true },
  { label: "API Access", starter: false, pro: true },
  { label: "Support", starter: "Email", pro: "Priority" },
];

function renderCompareValue(value: CompareValue) {
  if (typeof value === "boolean") {
    return value ? (
      <Check size={17} color="#22c55e" strokeWidth={2.4} />
    ) : (
      <span className="compare-no">-</span>
    );
  }

  return <span className="compare-text">{value}</span>;
}

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="pricing-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');

        :root {
          --ink: #0f172a;
          --muted: #64748b;
          --brand: #0f4f93;
          --brand-2: #1296db;
          --line: rgba(15, 23, 42, 0.1);
          --surface: #ffffff;
          --surface-soft: #eef6ff;
          --soft-text: #475569;
          --hero-points: #334155;
          --compare-text: #0f172a;
          --compare-muted: #94a3b8;
          --setup-chip-bg: rgba(15,79,147,.09);
          --setup-chip-text: #0f4f93;
        }

        .pricing-root {
          min-height: 100vh;
          color: var(--ink);
          font-family: 'DM Sans', sans-serif;
          background:
            radial-gradient(1200px 600px at 90% -20%, rgba(18, 150, 219, 0.16), transparent 55%),
            radial-gradient(900px 500px at 0% 0%, rgba(15, 79, 147, 0.12), transparent 60%),
            linear-gradient(180deg, #f8fbff 0%, #f4f8fc 55%, #f8fbff 100%);
        }

        .dark .pricing-root {
          --ink: #e2e8f0;
          --muted: #94a3b8;
          --brand: #60a5fa;
          --brand-2: #22d3ee;
          --line: rgba(148, 163, 184, 0.24);
          --surface: #0f172a;
          --surface-soft: #111827;
          --soft-text: #94a3b8;
          --hero-points: #cbd5e1;
          --compare-text: #e2e8f0;
          --compare-muted: #64748b;
          --setup-chip-bg: rgba(96,165,250,.16);
          --setup-chip-text: #93c5fd;
          background:
            radial-gradient(1200px 600px at 90% -20%, rgba(34, 211, 238, 0.12), transparent 55%),
            radial-gradient(900px 500px at 0% 0%, rgba(96, 165, 250, 0.16), transparent 60%),
            linear-gradient(180deg, #020617 0%, #0b1120 55%, #020617 100%);
        }

        .display-font {
          font-family: 'Space Grotesk', sans-serif;
        }

        .shell {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .nav {
          position: sticky;
          top: 0;
          z-index: 40;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          background: rgba(248, 251, 255, 0.82);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
        }

        .dark .pricing-root .nav {
          background: rgba(2, 6, 23, 0.82);
          border-bottom-color: rgba(148, 163, 184, 0.2);
        }

        .logo-mark {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(15, 79, 147, 0.35);
        }

        .btn {
          border: none;
          border-radius: 12px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform .22s ease, box-shadow .22s ease, background .22s ease;
        }

        .btn-primary {
          color: #fff;
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          box-shadow: 0 8px 24px rgba(15, 79, 147, 0.32);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(15, 79, 147, 0.4);
        }

        .btn-ghost {
          background: rgba(255, 255, 255, 0.88);
          color: var(--ink);
          border: 1px solid rgba(15, 23, 42, 0.12);
        }

        .btn-ghost:hover {
          transform: translateY(-2px);
          background: #fff;
        }

        .dark .pricing-root .btn-ghost {
          background: rgba(15, 23, 42, 0.72);
          border-color: rgba(148, 163, 184, 0.25);
        }

        .dark .pricing-root .btn-ghost:hover {
          background: rgba(15, 23, 42, 0.92);
        }

        .hero {
          padding: 96px 0 54px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(15, 79, 147, 0.12), rgba(18, 150, 219, 0.14));
          border: 1px solid rgba(15, 79, 147, 0.22);
          font-size: 12px;
          font-weight: 700;
          color: var(--brand);
          letter-spacing: .01em;
        }

        .hero-grid {
          margin-top: 28px;
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 28px;
          align-items: stretch;
        }

        .hero-copy h1 {
          margin: 0;
          font-size: clamp(34px, 5.8vw, 64px);
          line-height: 1.04;
          letter-spacing: -0.03em;
          font-weight: 700;
        }

        .gradient-word {
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-copy p {
          margin: 18px 0 0;
          max-width: 580px;
          font-size: 18px;
          line-height: 1.72;
          color: var(--muted);
        }

        .hero-actions {
          margin-top: 30px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .hero-points {
          margin-top: 28px;
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          color: var(--hero-points);
          font-size: 13px;
          font-weight: 600;
        }

        .hero-surface {
          border-radius: 24px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%);
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
          padding: 28px;
          position: relative;
          overflow: hidden;
        }

        .dark .pricing-root .hero-surface {
          background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
          border-color: rgba(148, 163, 184, 0.2);
          box-shadow: 0 24px 70px rgba(2, 6, 23, 0.35);
        }

        .hero-surface::before {
          content: "";
          position: absolute;
          top: -120px;
          right: -70px;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(18,150,219,.24) 0%, rgba(18,150,219,0) 70%);
        }

        .metric-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .metric {
          border-radius: 14px;
          padding: 14px;
          background: #fff;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }

        .dark .pricing-root .metric {
          background: #111827;
          border-color: rgba(148, 163, 184, 0.22);
        }

        .metric .num {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 2px;
        }

        .metric .label {
          color: var(--muted);
          font-size: 12px;
          font-weight: 600;
        }

        .plans {
          padding: 22px 0 80px;
        }

        .plans-head {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 34px;
        }

        .plans-head h2 {
          margin: 0 0 10px;
          font-size: clamp(28px, 3.8vw, 44px);
          letter-spacing: -0.02em;
          font-weight: 700;
        }

        .plans-head p {
          margin: 0;
          font-size: 17px;
          line-height: 1.7;
          color: var(--muted);
        }

        .plans-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .plan-card {
          border-radius: 24px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: var(--surface);
          padding: 30px 26px;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
          position: relative;
        }

        .dark .pricing-root .plan-card {
          border-color: rgba(148, 163, 184, 0.22);
          box-shadow: 0 18px 48px rgba(2, 6, 23, 0.28);
        }

        .plan-card.highlight {
          border: 1px solid rgba(15, 79, 147, 0.33);
          background: linear-gradient(180deg, #f9fcff 0%, #edf6ff 100%);
          box-shadow: 0 24px 56px rgba(15, 79, 147, 0.18);
        }

        .dark .pricing-root .plan-card.highlight {
          border-color: rgba(96, 165, 250, 0.45);
          background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
          box-shadow: 0 24px 56px rgba(2, 6, 23, 0.34);
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          font-size: 11px;
          letter-spacing: 0.03em;
          font-weight: 700;
          text-transform: uppercase;
          padding: 7px 11px;
        }

        .pill-starter {
          color: #334155;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }

        .dark .pricing-root .pill-starter {
          color: #cbd5e1;
          background: rgba(148, 163, 184, 0.16);
          border-color: rgba(148, 163, 184, 0.26);
        }

        .pill-pro {
          color: #0f4f93;
          background: rgba(15, 79, 147, 0.13);
          border: 1px solid rgba(15, 79, 147, 0.25);
        }

        .dark .pricing-root .pill-pro {
          color: #bfdbfe;
          background: rgba(96, 165, 250, 0.16);
          border-color: rgba(96, 165, 250, 0.34);
        }

        .plan-title {
          margin: 12px 0 6px;
          font-size: 31px;
          line-height: 1.1;
          letter-spacing: -0.02em;
          font-weight: 700;
        }

        .plan-subtitle {
          margin: 0 0 18px;
          font-size: 15px;
          color: var(--muted);
          line-height: 1.62;
        }

        .plan-price-row {
          margin: 0 0 18px;
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }

        .plan-price {
          font-size: clamp(34px, 4.2vw, 46px);
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .plan-cycle {
          font-size: 14px;
          color: var(--soft-text);
          font-weight: 600;
          margin-bottom: 4px;
        }

        .plan-note {
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .plan-note-starter {
          background: #f8fafc;
          color: var(--soft-text);
          border: 1px solid #e2e8f0;
        }

        .dark .pricing-root .plan-note-starter {
          background: rgba(148, 163, 184, 0.1);
          border-color: rgba(148, 163, 184, 0.24);
          color: #cbd5e1;
        }

        .plan-note-pro {
          background: rgba(15, 79, 147, 0.1);
          color: #0f4f93;
          border: 1px solid rgba(15, 79, 147, 0.18);
        }

        .dark .pricing-root .plan-note-pro {
          background: rgba(96, 165, 250, 0.12);
          border-color: rgba(96, 165, 250, 0.32);
          color: #bfdbfe;
        }

        .plan-list {
          margin: 0 0 22px;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 10px;
        }

        .plan-list li {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          font-size: 14px;
          line-height: 1.6;
          color: #1e293b;
          font-weight: 500;
        }

        .dark .pricing-root .plan-list li {
          color: #e2e8f0;
        }

        .compare-section {
          padding: 8px 0 72px;
        }

        .compare-card {
          border-radius: 24px;
          background: #fff;
          border: 1px solid rgba(15, 23, 42, 0.1);
          box-shadow: 0 18px 46px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }

        .dark .pricing-root .compare-card {
          background: #0f172a;
          border-color: rgba(148, 163, 184, 0.22);
          box-shadow: 0 18px 46px rgba(2, 6, 23, 0.28);
        }

        .compare-head {
          padding: 20px 24px;
          background: linear-gradient(135deg, #f1f7ff, #eef5fb);
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .dark .pricing-root .compare-head {
          background: linear-gradient(135deg, #0f172a, #111827);
          border-bottom-color: rgba(148, 163, 184, 0.2);
        }

        .compare-table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 640px;
        }

        th {
          text-align: left;
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 14px 24px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          white-space: nowrap;
        }

        th:nth-child(2),
        th:nth-child(3),
        td:nth-child(2),
        td:nth-child(3) {
          text-align: center;
        }

        td {
          padding: 16px 24px;
          font-size: 14px;
          color: var(--compare-text);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
        }

        .dark .pricing-root th {
          border-bottom-color: rgba(148, 163, 184, 0.2);
        }

        .dark .pricing-root td {
          border-bottom-color: rgba(148, 163, 184, 0.14);
        }

        tr:last-child td {
          border-bottom: none;
        }

        .assurance {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .assurance-card {
          background: #fff;
          border-radius: 16px;
          padding: 14px 14px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .dark .pricing-root .assurance-card {
          background: #0f172a;
          border-color: rgba(148, 163, 184, 0.22);
        }

        .assurance-card p {
          margin: 0;
          font-size: 13px;
          color: var(--hero-points);
          line-height: 1.45;
          font-weight: 600;
        }

        .cta-block {
          margin-top: 34px;
          border-radius: 24px;
          padding: 36px 28px;
          background: linear-gradient(135deg, #0f335f 0%, #0f4f93 44%, #1296db 100%);
          color: #fff;
          position: relative;
          overflow: hidden;
        }

        .cta-block::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.11) 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: .5;
          pointer-events: none;
        }

        .cta-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .cta-inner h3 {
          margin: 0;
          font-size: clamp(26px, 3.5vw, 42px);
          line-height: 1.08;
          letter-spacing: -0.03em;
          font-weight: 700;
        }

        .contact-row {
          margin-top: 22px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .contact-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 8px 13px;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.24);
        }

        .footer {
          padding: 34px 24px 30px;
          text-align: center;
          color: var(--soft-text);
          font-size: 13px;
          line-height: 1.5;
        }

        .setup-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 700;
          background: var(--setup-chip-bg);
          color: var(--setup-chip-text);
        }

        .hero-surface-copy {
          margin: 0;
          font-size: 14px;
          line-height: 1.65;
          color: var(--muted);
        }

        .compare-head-note {
          color: var(--soft-text);
          font-size: 13px;
          font-weight: 600;
        }

        .cta-copy {
          margin: 10px 0 0;
          color: rgba(255,255,255,0.84);
          font-size: 16px;
          line-height: 1.65;
          max-width: 640px;
        }

        .cta-button {
          background: #fff;
          color: #0f4f93;
          min-width: 220px;
          box-shadow: 0 10px 30px rgba(0,0,0,.18);
        }

        .dark .pricing-root .cta-button {
          background: #0b1220;
          color: #bfdbfe;
          border: 1px solid rgba(191, 219, 254, 0.32);
          box-shadow: 0 10px 30px rgba(2, 6, 23, 0.38);
        }

        .footer-link {
          border: none;
          background: none;
          color: var(--soft-text);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          padding: 0;
          font-family: inherit;
        }

        .footer-trial-link {
          border: none;
          background: none;
          color: var(--brand);
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0;
          font-family: inherit;
        }

        .compare-no {
          color: var(--compare-muted);
          font-weight: 700;
        }

        .compare-text {
          color: var(--compare-text);
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .hero {
            padding-top: 76px;
          }

          .hero-grid,
          .plans-grid,
          .assurance {
            grid-template-columns: 1fr;
          }

          .hero-copy p {
            font-size: 16px;
          }
        }

        @media (max-width: 720px) {
          .shell {
            padding: 0 16px;
          }

          .hero {
            padding-top: 66px;
          }

          .hero-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .btn {
            width: 100%;
          }

          .plan-card {
            padding: 24px 18px;
          }

          .compare-head {
            padding: 16px;
          }

          .cta-block {
            padding: 28px 18px;
          }
        }
      `}</style>

      <main className="shell">
        <section className="hero">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="hero-badge"
          >
            <Sparkles size={13} /> Launch Offer: Pro Free for 6 Months
          </motion.span>

          <div className="hero-grid">
            <motion.div
              className="hero-copy"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <h1 className="display-font">
                Pricing that <span className="gradient-word">moves with</span> your team.
              </h1>
              <p>
                Start with a risk-free trial, then scale into a full HR platform with payroll, attendance, and analytics in one place.
              </p>

              <div className="hero-actions">
                <button className="btn btn-primary" onClick={() => router.push("/start-trial")}>
                  Start Free Trial <ArrowRight size={16} />
                </button>
                <button className="btn btn-ghost" onClick={() => router.push("/contact-sales")}>
                  Contact Sales
                </button>
              </div>

              <div className="hero-points">
                <span>No credit card required</span>
                <span>Cancel anytime</span>
                <span>Fast onboarding support</span>
              </div>
            </motion.div>

            <motion.aside
              className="hero-surface"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.08 }}
            >
              <div className="setup-chip">
                <Clock3 size={13} /> 14-day quick setup promise
              </div>
              <h3 className="display-font" style={{ margin: "14px 0 6px", fontSize: 26, letterSpacing: "-0.02em" }}>
                Built for growing teams
              </h3>
              <p className="hero-surface-copy">
                Whether you run a 15-person startup or a 500-person company, Avinya adapts to your HR process.
              </p>

              <div className="metric-grid">
                <div className="metric">
                  <div className="num">500+</div>
                  <div className="label">Companies trust Avinya</div>
                </div>
                <div className="metric">
                  <div className="num">99.9%</div>
                  <div className="label">Platform uptime</div>
                </div>
                <div className="metric">
                  <div className="num">24 / 7</div>
                  <div className="label">Support availability</div>
                </div>
                <div className="metric">
                  <div className="num">6 mo</div>
                  <div className="label">Free Pro launch window</div>
                </div>
              </div>
            </motion.aside>
          </div>
        </section>

        <section className="plans">
          <div className="plans-head">
            <h2 className="display-font">Choose your growth lane</h2>
            <p>
              Start with Starter or jump straight to Pro. Both include full onboarding assistance.
            </p>
          </div>

          <div className="plans-grid">
            <motion.article
              className="plan-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
            >
              <span className="pill pill-starter">Starter</span>
              <h3 className="plan-title display-font">Start Smart</h3>
              <p className="plan-subtitle">
                Perfect for small teams looking to organize HR operations quickly.
              </p>

              <div className="plan-price-row">
                <div className="plan-price">₹1,499</div>
                <div className="plan-cycle">/ month</div>
              </div>

              <div className="plan-note plan-note-starter">
                Includes 14-day free trial before billing starts.
              </div>

              <ul className="plan-list">
                {starterFeatures.map((feature) => (
                  <li key={feature}>
                    <Check size={16} color="#22c55e" /> {feature}
                  </li>
                ))}
              </ul>

              <button className="btn btn-ghost" onClick={() => router.push("/start-trial")} style={{ width: "100%" }}>
                Start Starter Trial <ArrowRight size={15} />
              </button>
            </motion.article>

            <motion.article
              className="plan-card highlight"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.06 }}
            >
              <span className="pill pill-pro">
                <Sparkles size={12} /> Most Popular
              </span>
              <h3 className="plan-title display-font">Pro Launch</h3>
              <p className="plan-subtitle">
                Advanced HR automation and analytics for scaling organizations.
              </p>

              <div className="plan-price-row">
                <div className="plan-price">₹0</div>
                <div className="plan-cycle">for 6 months</div>
              </div>

              <div className="plan-note plan-note-pro">
                Then ₹2,999/month. Save ₹17,994 during launch period.
              </div>

              <ul className="plan-list">
                {proFeatures.map((feature) => (
                  <li key={feature}>
                    <Check size={16} color="#22c55e" /> {feature}
                  </li>
                ))}
              </ul>

              <button className="btn btn-primary" onClick={() => router.push("/start-trial")} style={{ width: "100%" }}>
                Claim Pro Offer <ArrowRight size={15} />
              </button>
            </motion.article>
          </div>
        </section>

        <section className="compare-section">
          <div className="compare-card">
            <div className="compare-head">
              <h3 className="display-font" style={{ margin: 0, fontSize: 24, letterSpacing: "-0.02em" }}>
                Plan Comparison
              </h3>
              <span className="compare-head-note">
                Straightforward features, no hidden limits.
              </span>
            </div>

            <div className="compare-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Starter</th>
                    <th>Pro Launch</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.label}>
                      <td style={{ fontWeight: 600 }}>{row.label}</td>
                      <td>{renderCompareValue(row.starter)}</td>
                      <td>{renderCompareValue(row.pro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="assurance">
            <div className="assurance-card">
              <Shield size={18} color="#0f4f93" />
              <p>SOC style controls with role-based data permissions.</p>
            </div>
            <div className="assurance-card">
              <Users size={18} color="#0f4f93" />
              <p>Onboarding help for admins, HR managers, and employees.</p>
            </div>
            <div className="assurance-card">
              <Clock3 size={18} color="#0f4f93" />
              <p>Migration support so your team can move fast without downtime.</p>
            </div>
          </div>

          <div className="cta-block">
            <div className="cta-inner">
              <div>
                <h3 className="display-font">Ready to start your trial?</h3>
                <p className="cta-copy">
                  Launch your workspace today and let your HR team run everything from one dashboard.
                </p>
              </div>
              <button
                className="btn cta-button"
                onClick={() => router.push("/start-trial")}
              >
                Start Free Trial <ArrowRight size={16} />
              </button>
            </div>

            <div className="contact-row">
              <span className="contact-chip">
                <Mail size={13} /> sales@avinya-hrms.com
              </span>
              <span className="contact-chip">
                <Phone size={13} /> +91 98765 43210
              </span>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
