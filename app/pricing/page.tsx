"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Clock3,
  Database,
  Globe,
  Mail,
  Shield,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";

const SALES_EMAIL = "sales@avinya-hrms.com";
const SALES_MAILTO = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
  "Enterprise HRMS Inquiry"
)}&body=${encodeURIComponent(
  "Hi Avinya team,\n\nWe want to discuss the Enterprise plan for our organization.\n\nOrganization name:\nTeam size:\nRequirements:\n\nThanks."
)}`;

type PlanSection = {
  title: string;
  icon: "mobile" | "web" | "admin" | "infra";
  items: string[];
};

type PlanCard = {
  badge: string;
  name: string;
  description: string;
  value: string;
  cycle?: string;
  note: string;
  accent: "basic" | "pro" | "enterprise";
  ctaLabel: string;
  pricingTypeId?: number;
  ctaMode: "trial" | "mailto";
  featured?: boolean;
  highlights: string[];
  sections: PlanSection[];
};

const sectionIcons = {
  mobile: Smartphone,
  web: Globe,
  admin: Users,
  infra: Database,
} as const;

const plans: PlanCard[] = [
  {
    badge: "Attendance Core",
    name: "Basic",
    description:
      "Attendance-first pricing for teams that only need the daily essentials across mobile, employee web, and admin web.",
    value: "₹299",
    cycle: "/ month",
    note:
      "Built for attendance, leave, WFH, and timeslips only. No services area on mobile.",
    accent: "basic",
    ctaLabel: "Start Basic",
    pricingTypeId: 1,
    ctaMode: "trial",
    highlights: [
      "Attendance-first rollout",
      "Mobile without services area",
      "Best for lean teams",
    ],
    sections: [
      {
        title: "Mobile App",
        icon: "mobile",
        items: [
          "Attendance",
          "Leave",
          "WFH",
          "Timeslips",
          "No services area",
        ],
      },
      {
        title: "Employee Web",
        icon: "web",
        items: [
          "Attendance history",
          "Leave requests",
          "WFH requests",
          "Timeslip updates",
          "Basic profile access",
        ],
      },
      {
        title: "Admin Web",
        icon: "admin",
        items: [
          "Attendance dashboard",
          "Leave approvals",
          "WFH approvals",
          "Timeslip review",
          "Basic employee reports",
        ],
      },
    ],
  },
  {
    badge: "Most Popular",
    name: "Pro Launch",
    description:
      "Complete HRMS coverage for growing organizations that want every Avinya feature available across all product surfaces.",
    value: "₹499",
    cycle: "/ month",
    note:
      "Full product access across mobile, employee web, and admin web with no feature restrictions.",
    accent: "pro",
    ctaLabel: "Start Pro Launch",
    pricingTypeId: 2,
    ctaMode: "trial",
    featured: true,
    highlights: [
      "All HRMS features",
      "Admin + employee + mobile",
      "Best for scaling teams",
    ],
    sections: [
      {
        title: "Mobile App",
        icon: "mobile",
        items: [
          "All employee sections",
          "Attendance, leave, WFH, timeslips",
          "Service and self-service tools",
          "Notices, chat, updates",
          "Expanded employee experience",
        ],
      },
      {
        title: "Employee Web",
        icon: "web",
        items: [
          "Full employee portal",
          "Payroll and documents",
          "Projects and expenses",
          "Meetings and notices",
          "End-to-end self-service",
        ],
      },
      {
        title: "Admin Web",
        icon: "admin",
        items: [
          "Attendance and leave operations",
          "Payroll and performance",
          "Projects, expenses, meetings",
          "Policies, notices, chat",
          "Dashboards and analytics",
        ],
      },
    ],
  },
  {
    badge: "Dedicated Setup",
    name: "Enterprise",
    description:
      "Dedicated enterprise rollout for organizations that need their own database, custom scope, and the highest priority support.",
    value: "Contact us",
    note:
      "Own database, isolated data environment, tailored customizations, and priority support for your rollout.",
    accent: "enterprise",
    ctaLabel: "Email Sales",
    ctaMode: "mailto",
    highlights: [
      "Own dedicated database",
      "Priority support",
      "Custom rollout and integrations",
    ],
    sections: [
      {
        title: "Product Scope",
        icon: "web",
        items: [
          "Everything in Pro Launch",
          "Custom workflows",
          "Custom modules on request",
          "Tailored employee experience",
          "Flexible rollout planning",
        ],
      },
      {
        title: "Data & Security",
        icon: "infra",
        items: [
          "Your own dedicated database",
          "Isolated enterprise data",
          "Custom hosting discussions",
          "Security review support",
          "Enterprise rollout governance",
        ],
      },
      {
        title: "Support & Delivery",
        icon: "admin",
        items: [
          "Priority support lane",
          "Customization according to your org",
          "Integration planning",
          "Dedicated onboarding",
          "Direct sales coordination",
        ],
      },
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();

  const goToTrial = (pricingTypeId: number) => {
    router.push(`/start-trial?pricingTypeId=${pricingTypeId}`);
  };

  const openSalesMail = () => {
    window.location.href = SALES_MAILTO;
  };

  const handlePlanClick = (plan: PlanCard) => {
    if (plan.ctaMode === "mailto") {
      openSalesMail();
      return;
    }

    goToTrial(plan.pricingTypeId ?? 2);
  };

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
          --setup-chip-bg: rgba(15, 79, 147, 0.09);
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
          --setup-chip-bg: rgba(96, 165, 250, 0.16);
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
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
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
          transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
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
          padding: 96px 0 48px;
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
          letter-spacing: 0.01em;
        }

        .hero-grid {
          margin-top: 28px;
          display: grid;
          grid-template-columns: 1.02fr 0.98fr;
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
          max-width: 620px;
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
          background: radial-gradient(circle, rgba(18, 150, 219, 0.24) 0%, rgba(18, 150, 219, 0) 70%);
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
          padding: 20px 0 76px;
        }

        .plans-head {
          text-align: center;
          max-width: 760px;
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
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          align-items: stretch;
        }

        .plan-card {
          border-radius: 24px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: var(--surface);
          padding: 30px 24px;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .dark .pricing-root .plan-card {
          border-color: rgba(148, 163, 184, 0.22);
          box-shadow: 0 18px 48px rgba(2, 6, 23, 0.28);
        }

        .plan-card.pro {
          border-color: rgba(15, 79, 147, 0.33);
          background: linear-gradient(180deg, #f9fcff 0%, #edf6ff 100%);
          box-shadow: 0 24px 56px rgba(15, 79, 147, 0.18);
        }

        .dark .pricing-root .plan-card.pro {
          border-color: rgba(96, 165, 250, 0.45);
          background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
          box-shadow: 0 24px 56px rgba(2, 6, 23, 0.34);
        }

        .plan-card.enterprise {
          border-color: rgba(14, 116, 144, 0.24);
          background: linear-gradient(180deg, #f8fcff 0%, #f1f8ff 100%);
        }

        .dark .pricing-root .plan-card.enterprise {
          background: linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
          border-color: rgba(34, 211, 238, 0.24);
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
          width: fit-content;
        }

        .pill.basic {
          color: #334155;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }

        .pill.pro {
          color: #0f4f93;
          background: rgba(15, 79, 147, 0.13);
          border: 1px solid rgba(15, 79, 147, 0.25);
        }

        .pill.enterprise {
          color: #0f766e;
          background: rgba(15, 118, 110, 0.1);
          border: 1px solid rgba(15, 118, 110, 0.2);
        }

        .dark .pricing-root .pill.basic {
          color: #cbd5e1;
          background: rgba(148, 163, 184, 0.16);
          border-color: rgba(148, 163, 184, 0.26);
        }

        .dark .pricing-root .pill.pro {
          color: #bfdbfe;
          background: rgba(96, 165, 250, 0.16);
          border-color: rgba(96, 165, 250, 0.34);
        }

        .dark .pricing-root .pill.enterprise {
          color: #99f6e4;
          background: rgba(45, 212, 191, 0.12);
          border-color: rgba(45, 212, 191, 0.24);
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
          flex-wrap: wrap;
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

        .plan-note.basic {
          background: #f8fafc;
          color: var(--soft-text);
          border: 1px solid #e2e8f0;
        }

        .plan-note.pro {
          background: rgba(15, 79, 147, 0.1);
          color: #0f4f93;
          border: 1px solid rgba(15, 79, 147, 0.18);
        }

        .plan-note.enterprise {
          background: rgba(15, 118, 110, 0.08);
          color: #0f766e;
          border: 1px solid rgba(15, 118, 110, 0.14);
        }

        .dark .pricing-root .plan-note.basic {
          background: rgba(148, 163, 184, 0.1);
          border-color: rgba(148, 163, 184, 0.24);
          color: #cbd5e1;
        }

        .dark .pricing-root .plan-note.pro {
          background: rgba(96, 165, 250, 0.12);
          border-color: rgba(96, 165, 250, 0.32);
          color: #bfdbfe;
        }

        .dark .pricing-root .plan-note.enterprise {
          background: rgba(45, 212, 191, 0.12);
          border-color: rgba(45, 212, 191, 0.24);
          color: #99f6e4;
        }

        .plan-highlights {
          margin: 0 0 18px;
          padding: 0;
          list-style: none;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .plan-highlights li {
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          color: var(--brand);
          background: rgba(15, 79, 147, 0.08);
        }

        .dark .pricing-root .plan-highlights li {
          color: #bfdbfe;
          background: rgba(96, 165, 250, 0.12);
        }

        .platform-grid {
          display: grid;
          gap: 10px;
          margin-bottom: 22px;
        }

        .platform-card {
          border-radius: 16px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.72);
          padding: 14px;
        }

        .dark .pricing-root .platform-card {
          background: rgba(15, 23, 42, 0.72);
          border-color: rgba(148, 163, 184, 0.2);
        }

        .platform-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 13px;
          font-weight: 700;
          color: var(--ink);
        }

        .platform-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 8px;
        }

        .platform-list li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 14px;
          line-height: 1.55;
          color: #1e293b;
          font-weight: 500;
        }

        .dark .pricing-root .platform-list li {
          color: #e2e8f0;
        }

        .plan-card .btn {
          width: 100%;
          margin-top: auto;
        }

        .details-section {
          padding: 6px 0 72px;
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
          padding: 14px;
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
          background-image: radial-gradient(rgba(255, 255, 255, 0.11) 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: 0.5;
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

        .cta-copy {
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.84);
          font-size: 16px;
          line-height: 1.65;
          max-width: 640px;
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

        .cta-button {
          background: #fff;
          color: #0f4f93;
          min-width: 220px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
        }

        .dark .pricing-root .cta-button {
          background: #0b1220;
          color: #bfdbfe;
          border: 1px solid rgba(191, 219, 254, 0.32);
          box-shadow: 0 10px 30px rgba(2, 6, 23, 0.38);
        }

        .footer {
          padding: 34px 24px 30px;
          text-align: center;
          color: var(--soft-text);
          font-size: 13px;
          line-height: 1.5;
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

        @media (max-width: 1100px) {
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
            <Sparkles size={13} /> 3 pricing types: Basic, Pro Launch, Enterprise
          </motion.span>

          <div className="hero-grid">
            <motion.div
              className="hero-copy"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <h1 className="display-font">
                Pricing built for <span className="gradient-word">real HR needs</span>.
              </h1>
              <p>
                Start with an attendance-first Basic plan, move into full-suite Pro
                Launch, or choose Enterprise when you need your own database and a
                tailored rollout.
              </p>

              <div className="hero-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => goToTrial(2)}
                >
                  Start Trial <ArrowRight size={16} />
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={openSalesMail}
                >
                  Contact Sales
                </button>
              </div>

              <div className="hero-points">
                <span>Transparent monthly pricing</span>
                <span>Mobile + employee web + admin web coverage</span>
                <span>Enterprise option with own dedicated DB</span>
              </div>
            </motion.div>

            <motion.aside
              className="hero-surface"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.08 }}
            >
              <div className="setup-chip">
                <Clock3 size={13} /> Flexible onboarding by plan size
              </div>
              <h3
                className="display-font"
                style={{
                  margin: "14px 0 6px",
                  fontSize: 26,
                  letterSpacing: "-0.02em",
                }}
              >
                One platform, three lanes
              </h3>
              <p className="hero-surface-copy">
                Choose the entry point that matches your team today without paying
                for the wrong level of HR complexity.
              </p>

              <div className="metric-grid">
                <div className="metric">
                  <div className="num">₹299</div>
                  <div className="label">Basic monthly plan</div>
                </div>
                <div className="metric">
                  <div className="num">₹499</div>
                  <div className="label">Pro Launch monthly plan</div>
                </div>
                <div className="metric">
                  <div className="num">3</div>
                  <div className="label">Clear pricing types</div>
                </div>
                <div className="metric">
                  <div className="num">Own DB</div>
                  <div className="label">Enterprise isolation option</div>
                </div>
              </div>
            </motion.aside>
          </div>
        </section>

        <section className="plans">
          <div className="plans-head">
            <h2 className="display-font">Choose the right rollout level</h2>
            <p>
              Basic is focused on attendance-related operations, Pro Launch opens
              the full HRMS, and Enterprise is tailored for organizations that need
              isolated data and custom implementation.
            </p>
          </div>

          <div className="plans-grid">
            {plans.map((plan, index) => (
              <motion.article
                key={plan.name}
                className={`plan-card ${plan.accent}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
              >
                <span className={`pill ${plan.accent}`}>
                  {plan.featured ? <Sparkles size={12} /> : null}
                  {plan.badge}
                </span>

                <h3 className="plan-title display-font">{plan.name}</h3>
                <p className="plan-subtitle">{plan.description}</p>

                <div className="plan-price-row">
                  <div className="plan-price">{plan.value}</div>
                  {plan.cycle ? <div className="plan-cycle">{plan.cycle}</div> : null}
                </div>

                <div className={`plan-note ${plan.accent}`}>{plan.note}</div>

                <ul className="plan-highlights">
                  {plan.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>

                <div className="platform-grid">
                  {plan.sections.map((section) => {
                    const SectionIcon = sectionIcons[section.icon];

                    return (
                      <div className="platform-card" key={section.title}>
                        <div className="platform-head">
                          <SectionIcon size={15} />
                          <span>{section.title}</span>
                        </div>
                        <ul className="platform-list">
                          {section.items.map((item) => (
                            <li key={item}>
                              <Check size={15} color="#22c55e" /> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <button
                  className={`btn ${plan.featured ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => handlePlanClick(plan)}
                >
                  {plan.ctaLabel} <ArrowRight size={15} />
                </button>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="details-section">
          <div className="assurance">
            <div className="assurance-card">
              <Shield size={18} color="#0f4f93" />
              <p>Basic keeps the product focused on attendance-related workflows.</p>
            </div>
            <div className="assurance-card">
              <Sparkles size={18} color="#0f4f93" />
              <p>Pro Launch unlocks the complete HRMS across mobile, employee web, and admin web.</p>
            </div>
            <div className="assurance-card">
              <Database size={18} color="#0f4f93" />
              <p>Enterprise is for organizations that need their own database and custom rollout scope.</p>
            </div>
          </div>

          <div className="cta-block">
            <div className="cta-inner">
              <div>
                <h3 className="display-font">
                  Need a dedicated enterprise setup?
                </h3>
                <p className="cta-copy">
                  We can scope Enterprise for your organization with an isolated
                  database, customization, and a higher-priority support lane.
                </p>
                <div className="contact-row">
                  <a className="contact-chip" href={SALES_MAILTO}>
                    <Mail size={14} /> sales@avinya-hrms.com
                  </a>
                </div>
              </div>

              <button
                className="btn cta-button"
                onClick={openSalesMail}
              >
                Talk to Sales <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        Need help choosing a plan?{" "}
        <button
          className="footer-link"
          onClick={openSalesMail}
        >
          Contact the sales team
        </button>
      </footer>
    </div>
  );
}
