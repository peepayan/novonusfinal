import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";

/* The novonus.com "Get in touch" modal, ported: dark card, gradient accent
   line, name/email/message over Web3Forms. */

type ContactState = "idle" | "submitting" | "success" | "error";

const FONT = "var(--font-sans)";

const fieldStyle: CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid rgba(245,239,229,0.15)",
  padding: "0.55rem 0",
  color: "#f5efe5",
  fontFamily: FONT,
  fontSize: "14px",
  outline: "none",
  lineHeight: 1.6,
};

const labelStyle: CSSProperties = {
  display: "block",
  fontFamily: FONT,
  fontSize: "10px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(245,239,229,0.62)",
  marginBottom: "0.3rem",
};

export function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<ContactState>("idle");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setName("");
        setEmail("");
        setMessage("");
        setStatus("idle");
      }, 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "9fd2589c-5724-420a-9224-85c431af712b",
          name,
          email,
          message,
        }),
      });
      const data = await res.json();
      setStatus(data.success ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (!open) return null;

  /* portal to <body> — inside a section's stacking context the fixed nav
     would paint over the modal (QA-4 #3) */
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        animation: "contact-fade-in 0.22s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#1a1917",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(245,239,229,0.07)",
          fontFamily: FONT,
          animation: "contact-rise-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        {/* gradient accent line */}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.6) 30%, rgba(110,231,183,0.6) 70%, transparent 100%)",
          }}
        />

        <div style={{ padding: "1.75rem 2rem 2.25rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "1.75rem",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(245,239,229,0.35)",
                  marginBottom: "0.35rem",
                }}
              >
                Novonus
              </p>
              <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#f5efe5", lineHeight: 1.2, margin: 0 }}>
                Get in touch
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(245,239,229,0.35)",
                padding: "0.2rem",
                lineHeight: 1,
                marginTop: "0.15rem",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {status === "success" ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0 0.5rem" }}>
              <p style={{ fontSize: "15px", fontWeight: 500, color: "rgba(110,231,183,0.9)", marginBottom: "0.5rem" }}>
                Message sent.
              </p>
              <p style={{ fontSize: "13px", color: "rgba(245,239,229,0.42)" }}>We'll be in touch shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input
                    type="text"
                    className="contact-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    className="contact-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Message</label>
                  <textarea
                    className="contact-field"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    placeholder="What would you like to discuss?"
                    rows={4}
                    style={{ ...fieldStyle, resize: "none" }}
                  />
                </div>
              </div>

              {status === "error" && (
                <p style={{ fontSize: "12px", color: "rgba(248,113,113,0.8)", marginTop: "1rem" }}>
                  Something went wrong, please try again.
                </p>
              )}

              <div style={{ marginTop: "1.75rem" }}>
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  style={{
                    width: "100%",
                    padding: "0.72rem 1.5rem",
                    background: status === "submitting" ? "rgba(245,239,229,0.08)" : "#f5efe5",
                    color: status === "submitting" ? "rgba(245,239,229,0.35)" : "#1a1917",
                    border: "none",
                    borderRadius: 4,
                    fontFamily: FONT,
                    fontSize: "13px",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    cursor: status === "submitting" ? "not-allowed" : "pointer",
                    transition: "background 0.18s, color 0.18s",
                  }}
                >
                  {status === "submitting" ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
