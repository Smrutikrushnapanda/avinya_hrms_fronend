"use client";

import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Award,
  Shield,
  Zap,
  Star,
  Users,
} from "lucide-react";

export default function ContactSalesPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", company: "", message: "", phone: "", teamSize: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.name || !formData.email || !formData.company || !formData.message) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      toast.success("Thank you! Our sales team will reach out within 2 hours.");
      setFormData({ name: "", email: "", company: "", message: "", phone: "", teamSize: "" });
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setError("Something went wrong. Please try again or email us at sales@avinya-hrms.com");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', 'Plus Jakarta Sans', sans-serif", background: "#f8fafc" }}>

      {/* ── Fonts & Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');

        .serif { font-family: 'Instrument Serif', serif; }

        .nav-glass {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(24,74,140,0.08);
        }

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
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          color: #1e293b;
          background: #fff;
          transition: border-color .2s, box-shadow .2s;
          outline: none;
          box-sizing: border-box;
        }
        .form-input:focus { border-color: #184a8c; box-shadow: 0 0 0 3px rgba(24,74,140,0.08); }
        .form-input::placeholder { color: #94a3b8; }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
          letter-spacing: 0.01em;
        }

        .submit-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #184a8c, #1e6fbf);
          color: #fff;
          border: none;
          border-radius: 12px;
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
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(24,74,140,0.38); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .contact-method {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 14px;
          backdrop-filter: blur(8px);
          transition: background .2s;
        }
        .contact-method:hover { background: rgba(255,255,255,0.18); }

        .proof-card {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 14px;
          padding: 20px;
          backdrop-filter: blur(8px);
        }

        .footer-link {
          font-size: 13px;
          color: #475569;
          text-decoration: none;
          transition: color .2s;
        }
        .footer-link:hover { color: #94a3b8; }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
      `}</style>

      {/* ══════════════════ NAV ══════════════════ */}
      <nav className="nav-glass" style={{ position: "sticky", top: 0, zIndex: 50, width: "100%" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
            
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="logo-mark">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M12 2v15M4 7l8 5 8-5" stroke="white" strokeWidth="2"/>
                </svg>
              </div>
              <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.3px" }} className="gradient-text">
                Avinya HRMS
              </span>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <button
                onClick={() => router.push("/")}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, color: "#475569", fontFamily: "inherit", padding: "8px 14px", borderRadius: 8, transition: "all .2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#184a8c"; (e.currentTarget as HTMLElement).style.background = "rgba(24,74,140,0.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#475569"; (e.currentTarget as HTMLElement).style.background = "none"; }}
              >
                <ArrowLeft size={15} /> Back to Home
              </button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* ══════════════════ MAIN SPLIT ══════════════════ */}
      <main style={{ flex: 1, display: "flex", minHeight: "calc(100vh - 68px)" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ flex: "0 0 48%", background: "linear-gradient(150deg, #0f2d5c 0%, #184a8c 45%, #1a6db5 75%, #00b4db 100%)", padding: "72px 60px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}>

          {/* Decorative orbs */}
          <div className="orb" style={{ width: 350, height: 350, top: -80, right: -80, background: "rgba(0,180,219,0.2)" }} />
          <div className="orb" style={{ width: 250, height: 250, bottom: -40, left: -40, background: "rgba(255,255,255,0.05)" }} />
          {/* Dot grid */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.7 } }}
            style={{ position: "relative", zIndex: 1, maxWidth: 460 }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 100, padding: "7px 16px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: 28 }}>
              <Award size={12} /> Trusted by 500+ Companies Worldwide
            </div>

            <h1 style={{ fontSize: "clamp(32px, 3.5vw, 52px)", fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 18 }}>
              Let's transform HR<br />
              <span className="serif" style={{ fontStyle: "italic", color: "rgba(255,255,255,0.8)", fontWeight: 400 }}>together.</span>
            </h1>

            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, marginBottom: 44 }}>
              Our sales team is ready to give you a personalised walkthrough and build a plan that fits your company perfectly.
            </p>

            {/* Contact methods */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 44 }}>
              {[
                { icon: Mail,  label: "Email Us",        value: "sales@avinya-hrms.com" },
                { icon: Phone, label: "Call Us",          value: "+1 (555) 123-4567" },
                { icon: Clock, label: "Response Time",    value: "Within 2 business hours" },
              ].map(m => (
                <div key={m.label} className="contact-method">
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <m.icon size={16} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginTop: 2 }}>{m.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { value: "99.9%", label: "Uptime SLA", icon: Shield },
                { value: "24 / 7", label: "Expert Support", icon: Users },
                { value: "SOC 2", label: "Type II Certified", icon: Award },
                { value: "< 2 hr", label: "Response Time", icon: Zap },
              ].map(s => (
                <div key={s.label} className="proof-card">
                  <s.icon size={15} color="rgba(255,255,255,0.5)" style={{ marginBottom: 6 }} />
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Mini testimonial */}
            <div style={{ marginTop: 32, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} fill="#fbbf24" color="#fbbf24" />)}
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, fontStyle: "italic", marginBottom: 12 }}>
                "Avinya cut our HR admin by 60%. The sales team understood our needs from the very first call."
              </p>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>Sarah Johnson · HR Director, TechCorp</div>
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT PANEL (Form) ── */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "72px 60px", background: "#fff" }}>
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.7, delay: 0.15 } }}
            style={{ width: "100%", maxWidth: 480 }}
          >
            {/* Header */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, rgba(24,74,140,0.08), rgba(0,180,219,0.08))", border: "1px solid rgba(24,74,140,0.15)", borderRadius: 100, padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "#184a8c", marginBottom: 20 }}>
                <Zap size={11} /> Get Started in Minutes
              </div>
              <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1.15, marginBottom: 10 }}>
                Talk to our<br />
                <span className="serif" style={{ fontStyle: "italic", color: "#184a8c" }}>sales team.</span>
              </h2>
              <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.6 }}>
                Fill in the form below and we'll get back to you within 2 hours with a tailored proposal.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label className="form-label" htmlFor="name">Full Name *</label>
                  <input className="form-input" id="name" name="name" type="text" placeholder="John Doe" value={formData.name} onChange={handleChange} />
                </div>
                <div>
                  <label className="form-label" htmlFor="email">Work Email *</label>
                  <input className="form-input" id="email" name="email" type="email" placeholder="john@company.com" value={formData.email} onChange={handleChange} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label className="form-label" htmlFor="company">Company Name *</label>
                  <input className="form-input" id="company" name="company" type="text" placeholder="Acme Inc." value={formData.company} onChange={handleChange} />
                </div>
                <div>
                  <label className="form-label" htmlFor="teamSize">Team Size</label>
                  <select className="form-input" id="teamSize" name="teamSize" value={formData.teamSize} onChange={handleChange}>
                    <option value="">Select range</option>
                    <option value="1-10">1 – 10</option>
                    <option value="11-50">11 – 50</option>
                    <option value="51-200">51 – 200</option>
                    <option value="201-1000">201 – 1,000</option>
                    <option value="1000+">1,000+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="phone">Phone Number</label>
                <input className="form-input" id="phone" name="phone" type="tel" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={handleChange} />
              </div>

              <div>
                <label className="form-label" htmlFor="message">Tell us about your needs *</label>
                <textarea
                  className="form-input"
                  id="message"
                  name="message"
                  rows={4}
                  placeholder="I'm looking to streamline HR for a team of 80 people — particularly payroll and leave management…"
                  value={formData.message}
                  onChange={handleChange}
                  style={{ resize: "none" }}
                />
              </div>

              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px" }}>
                  <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>Sending…</>
                ) : (
                  <>Send Message <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            {/* Trust row */}
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid #f1f5f9", display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { icon: CheckCircle, text: "No spam, ever" },
                { icon: Shield,       text: "GDPR compliant" },
                { icon: Clock,        text: "Reply in 2 hrs" },
              ].map(t => (
                <span key={t.text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                  <t.icon size={13} color="#10b981" strokeWidth={2.5} /> {t.text}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer style={{ background: "#0a0f1a", padding: "48px 24px 28px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          
          {/* Top row */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 40, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div className="logo-mark"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 7v10l8 5 8-5V7L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/><path d="M12 2v15M4 7l8 5 8-5" stroke="white" strokeWidth="2"/></svg></div>
                <span style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Avinya HRMS</span>
              </div>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.75, maxWidth: 260, margin: "0 0 20px" }}>
                Modern HR infrastructure for forward-thinking businesses. Trusted by 500+ companies globally.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {["Twitter", "LinkedIn", "Facebook"].map(s => (
                  <a key={s} href="#" className="footer-link" style={{ padding: "5px 10px", border: "1px solid #1e293b", borderRadius: 7, fontSize: 12, fontWeight: 600 }}>{s}</a>
                ))}
              </div>
            </div>

            {[
              { heading: "Product",  links: ["Features", "Pricing", "Changelog", "Demo"] },
              { heading: "Company",  links: ["About", "Blog", "Careers", "Press"] },
              { heading: "Support",  links: ["Help Center", "Privacy", "Terms", "Contact"] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>{col.heading}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {col.links.map(l => <li key={l} style={{ marginBottom: 10 }}><a href="#" className="footer-link">{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <span style={{ fontSize: 13, color: "#475569" }}>© 2026 Avinya HRMS. All rights reserved.</span>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacy Policy", "Terms of Service", "Security"].map(l => (
                <a key={l} href="#" className="footer-link">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}