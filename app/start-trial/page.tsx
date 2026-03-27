"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Shield, Users, Zap } from "lucide-react";
import { startTrialSignup } from "@/app/api/api";

type TrialFormData = {
  name: string;
  email: string;
  company: string;
  teamSize: string;
  phone: string;
};

const initialFormData: TrialFormData = {
  name: "",
  email: "",
  company: "",
  teamSize: "",
  phone: "",
};

const SALES_EMAIL = "sales@avinya-hrms.com";
const SALES_MAILTO = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
  "Enterprise HRMS Inquiry"
)}&body=${encodeURIComponent(
  "Hi Avinya team,\n\nWe want to discuss the Enterprise plan for our organization.\n\nOrganization name:\nTeam size:\nRequirements:\n\nThanks."
)}`;

const TRIAL_PLANS = [
  {
    pricingTypeId: 1,
    name: "Basic",
    priceLabel: "₹299 / month",
    shortNote: "Attendance, leave, WFH, timeslips, and no service tab on mobile.",
    heroCopy:
      "Start with the attendance-focused setup for teams that only need the daily essentials.",
    setupPoints: [
      "Attendance-first workspace setup",
      "Mobile without service tab",
      "Employee web + admin web essentials",
      "Fast rollout for lean teams",
    ],
  },
  {
    pricingTypeId: 2,
    name: "Pro Launch",
    priceLabel: "₹499 / month",
    shortNote: "Full HRMS access across mobile, employee web, and admin web.",
    heroCopy:
      "Launch the full Avinya HRMS for organizations that want every major module from day one.",
    setupPoints: [
      "Full HRMS workspace setup",
      "All employee and admin modules",
      "Best fit for growing teams",
      "Ready for broader rollout",
    ],
  },
] as const;

const DEFAULT_TRIAL_PLAN_ID = 2;

export default function StartTrialPage() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<TrialFormData>(initialFormData);
  const [selectedPricingTypeId, setSelectedPricingTypeId] = useState<number>(
    DEFAULT_TRIAL_PLAN_ID
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const pricingTypeFromQuery = Number(searchParams.get("pricingTypeId") || "");
    if (TRIAL_PLANS.some((plan) => plan.pricingTypeId === pricingTypeFromQuery)) {
      setSelectedPricingTypeId(pricingTypeFromQuery);
    }
  }, [searchParams]);

  const selectedPlan =
    TRIAL_PLANS.find((plan) => plan.pricingTypeId === selectedPricingTypeId) ??
    TRIAL_PLANS.find((plan) => plan.pricingTypeId === DEFAULT_TRIAL_PLAN_ID)!;

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!formData.name || !formData.email || !formData.company || !formData.teamSize) {
      setError("Please fill all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        pricingTypeId: selectedPlan.pricingTypeId,
        source: "pricing-start-trial",
        submittedAt: new Date().toISOString(),
      };

      const response = await startTrialSignup(payload);
      const messageFromApi = response?.data?.message;
      const message =
        typeof messageFromApi === "string" && messageFromApi.trim().length > 0
          ? messageFromApi
          : "Username and password have been sent to your mail.";

      toast.success(message);
      setSuccessMessage("Username and password have been sent to your mail.");
      setFormData(initialFormData);
    } catch (submitError) {
      console.error("Trial form submission failed:", submitError);
      const apiMessage = (
        submitError as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      if (Array.isArray(apiMessage) && apiMessage.length > 0) {
        setError(String(apiMessage[0]));
      } else if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
        setError(apiMessage);
      } else {
        setError("Unable to start trial right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="trial-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');

        .trial-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'DM Sans', 'Plus Jakarta Sans', sans-serif;
          background: #f8fafc;
          color: #0f172a;
        }

        .dark .trial-root {
          background: #020617;
          color: #e2e8f0;
        }

        .trial-nav {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(24,74,140,0.08);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .dark .trial-root .trial-nav {
          background: rgba(2,6,23,0.85);
          border-bottom-color: rgba(148,163,184,0.22);
        }

        .trial-shell {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .trial-nav-inner {
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .brand-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-back-btn {
          background: none;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          transition: color .2s ease;
        }

        .nav-back-btn:hover {
          color: #184a8c;
        }

        .dark .trial-root .nav-back-btn {
          color: #94a3b8;
        }

        .dark .trial-root .nav-back-btn:hover {
          color: #bfdbfe;
        }

        .logo-mark {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #184a8c, #00b4db);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(24,74,140,0.3);
          flex-shrink: 0;
        }

        .gradient-text {
          background: linear-gradient(135deg, #184a8c 0%, #1e6fbf 50%, #00b4db 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .trial-main {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .trial-left {
          background: linear-gradient(150deg, #0f2d5c 0%, #184a8c 45%, #1a6db5 75%, #00b4db 100%);
          color: white;
          padding: 72px 56px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
        }

        .trial-right {
          padding: 72px 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
        }

        .dark .trial-root .trial-right {
          background: #020617;
        }

        .trial-form-card {
          width: 100%;
          max-width: 480px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 32px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
        }

        .dark .trial-root .trial-form-card {
          background: #0f172a;
          border-color: rgba(148,163,184,0.22);
          box-shadow: 0 20px 50px rgba(2,6,23,0.4);
        }

        .trial-form-title {
          margin: 0;
          font-size: 28px;
          color: #0f172a;
          font-weight: 800;
        }

        .trial-form-subtitle {
          margin: 8px 0 24px;
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
        }

        .dark .trial-root .trial-form-title {
          color: #e2e8f0;
        }

        .dark .trial-root .trial-form-subtitle {
          color: #94a3b8;
        }

        .trial-form-grid {
          display: grid;
          gap: 16px;
        }

        .plan-picker {
          display: grid;
          gap: 12px;
        }

        .plan-picker-label {
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }

        .dark .trial-root .plan-picker-label {
          color: #cbd5e1;
        }

        .plan-option-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .plan-option {
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          background: #f8fafc;
          padding: 14px;
          text-align: left;
          cursor: pointer;
          transition: border-color .2s, box-shadow .2s, transform .2s;
        }

        .plan-option:hover {
          transform: translateY(-1px);
        }

        .plan-option.active {
          border-color: #184a8c;
          background: #eef6ff;
          box-shadow: 0 0 0 3px rgba(24,74,140,0.08);
        }

        .dark .trial-root .plan-option {
          border-color: rgba(148,163,184,0.24);
          background: #111827;
        }

        .dark .trial-root .plan-option.active {
          border-color: #60a5fa;
          background: rgba(15, 23, 42, 0.95);
          box-shadow: 0 0 0 3px rgba(96,165,250,0.16);
        }

        .plan-option-name {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }

        .dark .trial-root .plan-option-name {
          color: #e2e8f0;
        }

        .plan-option-price {
          margin-top: 4px;
          font-size: 13px;
          font-weight: 700;
          color: #184a8c;
        }

        .dark .trial-root .plan-option-price {
          color: #93c5fd;
        }

        .plan-option-note {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.5;
          color: #64748b;
        }

        .dark .trial-root .plan-option-note {
          color: #94a3b8;
        }

        .enterprise-note {
          font-size: 12px;
          color: #64748b;
          line-height: 1.6;
        }

        .enterprise-note a {
          color: #184a8c;
          font-weight: 700;
          text-decoration: none;
        }

        .dark .trial-root .enterprise-note {
          color: #94a3b8;
        }

        .dark .trial-root .enterprise-note a {
          color: #93c5fd;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }

        .dark .trial-root .form-label {
          color: #cbd5e1;
        }

        .form-input {
          width: 100%;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #0f172a;
          background: #fff;
          padding: 12px 14px;
          transition: border-color .2s, box-shadow .2s;
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
        }

        .dark .trial-root .form-input {
          border-color: rgba(148,163,184,0.25);
          color: #e2e8f0;
          background: #111827;
        }

        .dark .trial-root .form-input::placeholder {
          color: #94a3b8;
        }

        .form-input:focus {
          border-color: #184a8c;
          box-shadow: 0 0 0 3px rgba(24,74,140,0.1);
        }

        .dark .trial-root .form-input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96,165,250,0.2);
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #184a8c, #1e6fbf);
          color: white;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all .25s;
          box-shadow: 0 4px 20px rgba(24,74,140,0.26);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(24,74,140,0.36);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .feature-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(255,255,255,0.11);
          border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.95);
          font-size: 14px;
          font-weight: 500;
        }

        .dark .trial-root .feature-row {
          background: rgba(15,23,42,0.35);
          border-color: rgba(191,219,254,0.28);
        }

        .left-copy {
          max-width: 480px;
          position: relative;
          z-index: 1;
        }

        .feature-list {
          display: grid;
          gap: 10px;
        }

        .trial-hero-title {
          font-size: clamp(30px, 4vw, 52px);
          line-height: 1.1;
          letter-spacing: -1px;
          margin-bottom: 16px;
          font-weight: 800;
        }

        .trial-hero-copy {
          color: rgba(255,255,255,0.82);
          font-size: 16px;
          line-height: 1.7;
          margin-bottom: 26px;
        }

        .error-text {
          font-size: 13px;
          color: #dc2626;
          font-weight: 500;
          margin-top: 4px;
        }

        .success-text {
          font-size: 13px;
          color: #15803d;
          font-weight: 500;
          margin-top: 4px;
        }

        @media (max-width: 1024px) {
          .trial-main {
            grid-template-columns: 1fr;
          }

          .trial-left {
            padding: 44px 24px;
          }

          .trial-right {
            padding: 34px 18px 44px;
          }

          .trial-form-card {
            padding: 22px;
          }
        }

        @media (max-width: 700px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .plan-option-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="trial-main">
        <section className="trial-left">
          <div className="left-copy">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="trial-hero-title"
            >
              Start Your {selectedPlan.name} Trial
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="trial-hero-copy"
            >
              {selectedPlan.heroCopy}
            </motion.p>

            <div className="feature-list">
              {selectedPlan.setupPoints.map((point, index) => {
                const Icon =
                  index === 0
                    ? CheckCircle
                    : index === 1
                      ? Shield
                      : index === 2
                        ? Users
                        : Zap;

                return (
                  <div className="feature-row" key={point}>
                    <Icon size={16} /> {point}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="trial-right">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="trial-form-card"
          >
            <h2 className="trial-form-title">
              Trial Details
            </h2>
            <p className="trial-form-subtitle">
              Complete the required details and start your {selectedPlan.name} trial.
            </p>

            <form onSubmit={handleSubmit} className="trial-form-grid">
              <div className="plan-picker">
                <div className="plan-picker-label">Choose your plan</div>
                <div className="plan-option-grid">
                  {TRIAL_PLANS.map((plan) => (
                    <button
                      key={plan.pricingTypeId}
                      type="button"
                      className={`plan-option ${selectedPricingTypeId === plan.pricingTypeId ? "active" : ""}`}
                      onClick={() => setSelectedPricingTypeId(plan.pricingTypeId)}
                    >
                      <div className="plan-option-name">{plan.name}</div>
                      <div className="plan-option-price">{plan.priceLabel}</div>
                      <div className="plan-option-note">{plan.shortNote}</div>
                    </button>
                  ))}
                </div>
                <div className="enterprise-note">
                  Need Enterprise with a dedicated database and custom rollout?{" "}
                  <a href={SALES_MAILTO}>Email {SALES_EMAIL}</a>.
                </div>
              </div>

              <div className="form-grid">
                <div>
                  <label className="form-label" htmlFor="name">
                    Full Name *
                  </label>
                  <input
                    className="form-input"
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="email">
                    Work Email *
                  </label>
                  <input
                    className="form-input"
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div>
                  <label className="form-label" htmlFor="company">
                    Company Name *
                  </label>
                  <input
                    className="form-input"
                    id="company"
                    name="company"
                    placeholder="Acme Pvt Ltd"
                    value={formData.company}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="teamSize">
                    Team Size *
                  </label>
                  <select
                    className="form-input"
                    id="teamSize"
                    name="teamSize"
                    value={formData.teamSize}
                    onChange={handleChange}
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-500">201-500</option>
                    <option value="500+">500+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="phone">
                  Phone Number (Optional)
                </label>
                <input
                  className="form-input"
                  id="phone"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {error ? <p className="error-text">{error}</p> : null}
              {successMessage ? <p className="success-text">{successMessage}</p> : null}

              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? "Starting Trial..." : `Start ${selectedPlan.name} Trial`} <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
