import { useEffect } from "react";
import { createPortal } from "react-dom";

/* Demo-video popup player — same video the novonus.com top bar plays,
   streamed from Vercel Blob. */
const DEMO_URL =
  "https://uwdwktvnnfhx26nw.public.blob.vercel-storage.com/intro-launch-video-1080p.mp4";

export function DemoVideoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  /* portal to <body> — see ContactModal (QA-4 #3) */
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.86)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        animation: "contact-fade-in 0.22s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(1080px, 94vw)",
          animation: "contact-rise-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: -36,
            right: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
            padding: "0.2rem",
            lineHeight: 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <video
          src={DEMO_URL}
          controls
          autoPlay
          playsInline
          style={{
            width: "100%",
            display: "block",
            borderRadius: 12,
            boxShadow: "0 32px 80px rgba(0,0,0,0.65)",
            background: "#000",
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
