"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";

type GoogleUser = {
  email: string;
  name?: string;
  picture?: string;
};

type Props = {
  onSuccess: (user: GoogleUser) => void;
  onError?: (message: string) => void;
};

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton({ onSuccess, onError }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const successRef = useRef(onSuccess);
  const errorRef = useRef(onError);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    successRef.current = onSuccess;
    errorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const status = await fetch("/api/auth/google", { cache: "no-store" });
        const info = (await status.json()) as { configured?: boolean; clientId?: string };
        if (cancelled) return;
        if (!info.configured || !info.clientId) {
          setConfigured(false);
          return;
        }
        setConfigured(true);

        const render = () => {
          if (!window.google || !buttonRef.current || cancelled) return;
          buttonRef.current.innerHTML = "";
          window.google.accounts.id.initialize({
            client_id: info.clientId as string,
            auto_select: false,
            cancel_on_tap_outside: true,
            callback: async (response) => {
              if (!response.credential) {
                errorRef.current?.("Google did not return a sign-in credential.");
                return;
              }
              setBusy(true);
              try {
                const verify = await fetch("/api/auth/google", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ credential: response.credential }),
                });
                const payload = await verify.json();
                if (!verify.ok) throw new Error(payload.message || "Google sign-in could not be verified.");
                successRef.current(payload.user as GoogleUser);
              } catch (error) {
                errorRef.current?.(error instanceof Error ? error.message : "Google sign-in failed.");
              } finally {
                setBusy(false);
              }
            },
          });
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "pill",
            text: "continue_with",
            logo_alignment: "left",
            width: 360,
          });
        };

        if (window.google) {
          render();
          return;
        }

        const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
        if (existing) {
          existing.addEventListener("load", render, { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = render;
        script.onerror = () => {
          setConfigured(false);
          errorRef.current?.("Could not load Google Sign-In. Check your internet connection.");
        };
        document.head.appendChild(script);
      } catch {
        if (!cancelled) setConfigured(false);
      }
    }

    setup();
    return () => { cancelled = true; };
  }, []);

  if (configured === null) {
    return <div className="google-auth-shell"><LoaderCircle size={18} className="animate-spin" /><span>Loading Google sign-in…</span></div>;
  }

  if (!configured) {
    return <div className="google-auth-unconfigured"><ShieldCheck size={17} /><span>Google Sign-In becomes active after you add your Google Client ID in <b>.env.local</b> / Vercel Environment Variables.</span></div>;
  }

  return <div className="relative">
    <div ref={buttonRef} className={`google-render-target ${busy ? "opacity-50 pointer-events-none" : ""}`} />
    {busy && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80 text-[11px] font-black text-blue-700"><LoaderCircle size={16} className="mr-2 animate-spin" /> Verifying securely…</div>}
  </div>;
}
