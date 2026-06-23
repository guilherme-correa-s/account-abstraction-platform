"use client";

import { useState, type ReactNode } from "react";
import {
  useLogin,
  useLoginWithEmail,
  useLoginWithOAuth,
} from "@privy-io/react-auth";

function errMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return fallback;
}

type View = "idle" | "code" | "busy";

/**
 * Login screen wired to Privy (v3 headless hooks):
 *  - email  -> useLoginWithEmail (sendCode -> loginWithCode OTP)
 *  - google/apple -> useLoginWithOAuth (initOAuth, redirect flow)
 *  - wallet -> useLogin modal scoped to the wallet connectors
 *
 * On success Privy flips `authenticated`, and app/page.tsx swaps to the header.
 */
export function LoginScreen() {
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { initOAuth } = useLoginWithOAuth();
  const { login } = useLogin();

  const [view, setView] = useState<View>("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const busy = view === "busy";

  async function onSendCode() {
    if (!emailValid || busy) return;
    setError(null);
    setView("busy");
    try {
      await sendCode({ email: email.trim() });
      setView("code");
    } catch (e) {
      setError(
        errMessage(e, "Couldn't send the code — email login may be disabled for this app."),
      );
      setView("idle");
    }
  }

  async function onVerifyCode() {
    if (code.trim().length < 4 || busy) return;
    setError(null);
    setView("busy");
    try {
      await loginWithCode({ code: code.trim() });
      // authenticated flips -> page swaps to the header
    } catch (e) {
      setError(errMessage(e, "Invalid or expired code."));
      setView("code");
    }
  }

  async function onOAuth(provider: "google" | "apple") {
    if (busy) return;
    setError(null);
    setView("busy");
    try {
      await initOAuth({ provider });
      // OAuth redirects the browser; on return the user is authenticated.
    } catch (e) {
      setError(
        errMessage(e, `Couldn't start ${provider} login — it may be disabled for this app.`),
      );
      setView("idle");
    }
  }

  function onWallet() {
    if (busy) return;
    setError(null);
    try {
      login({ loginMethods: ["wallet"] });
    } catch (e) {
      setError(errMessage(e, "Couldn't open the wallet picker."));
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px] animate-fade-up">
        {/* Brand */}
        <div className="mb-[26px] flex flex-col items-center">
          <div className="flex size-[52px] items-center justify-center rounded-[15px] bg-brand text-[19px] font-bold tracking-tight text-white shadow-[0_8px_22px_rgba(110,86,207,0.32)]">
            AA
          </div>
          <h1 className="mt-[18px] mb-[5px] text-center text-[21px] font-bold tracking-tight text-foreground">
            Account Abstraction Platform
          </h1>
          <p className="text-sm text-[#71717a]">Sign in to your smart account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#e7e7e4] bg-white p-[22px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {busy && (
            <div className="flex flex-col items-center px-1.5 py-[18px] text-center">
              <div className="size-[34px] animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" />
              <p className="mt-[18px] mb-1 text-[15px] font-semibold">
                Upgrading your account
              </p>
              <p className="text-[13px] text-[#71717a]">
                EIP-7702 authorization · Kernel smart account · no deploy
              </p>
            </div>
          )}

          {view === "idle" && (
            <div>
              <label className="text-[12.5px] font-semibold text-[#52525b]">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSendCode()}
                placeholder="you@email.com"
                type="email"
                className="my-[7px] mb-3 w-full rounded-[10px] border border-input bg-[#fcfcfb] px-[14px] py-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/15"
              />
              <button
                onClick={onSendCode}
                disabled={!emailValid}
                className="w-full rounded-[10px] bg-brand py-[13px] text-[15px] font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#e4e4e7] disabled:text-[#a1a1aa]"
              >
                Continue with email
              </button>

              <div className="my-[18px] flex items-center gap-3">
                <div className="h-px flex-1 bg-[#ececec]" />
                <span className="text-xs text-[#a1a1aa]">or</span>
                <div className="h-px flex-1 bg-[#ececec]" />
              </div>

              <div className="flex flex-col gap-[9px]">
                <OutlineButton onClick={() => onOAuth("google")}>
                  <span className="flex size-[18px] items-center justify-center rounded-full border border-input bg-white text-[11px] font-bold text-[#4285F4]">
                    G
                  </span>
                  Continue with Google
                </OutlineButton>
                <OutlineButton onClick={() => onOAuth("apple")}>
                  <span className="flex size-[18px] items-center justify-center text-[15px] text-[#18181b]">
                    {""}
                  </span>
                  Continue with Apple
                </OutlineButton>
                <OutlineButton onClick={onWallet}>
                  <span className="flex size-[18px] items-center justify-center rounded-[5px] bg-[#f6851b] text-[10px] font-bold text-white">
                    W
                  </span>
                  Continue with a wallet
                </OutlineButton>
              </div>
            </div>
          )}

          {view === "code" && (
            <div>
              <label className="text-[12.5px] font-semibold text-[#52525b]">
                Enter the code sent to {email}
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && onVerifyCode()}
                placeholder="123456"
                inputMode="numeric"
                autoFocus
                className="my-[7px] mb-3 w-full rounded-[10px] border border-input bg-[#fcfcfb] px-[14px] py-3 text-center font-mono text-lg tracking-[4px] outline-none focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/15"
              />
              <button
                onClick={onVerifyCode}
                disabled={code.trim().length < 4}
                className="w-full rounded-[10px] bg-brand py-[13px] text-[15px] font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#e4e4e7] disabled:text-[#a1a1aa]"
              >
                Confirm code
              </button>
              <button
                onClick={() => {
                  setView("idle");
                  setCode("");
                  setError(null);
                }}
                className="mt-2 w-full py-2 text-xs font-medium text-[#71717a] hover:text-foreground"
              >
                ← Use a different method
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 text-center text-xs font-medium text-danger">{error}</p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-[#a1a1aa]">
          Privy auth · Kernel smart account via EIP-7702
        </p>
      </div>
    </div>
  );
}

function OutlineButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-input bg-white py-[11px] text-sm font-semibold text-[#27272a] hover:border-[#d4d4d8] hover:bg-[#fafafa]"
    >
      {children}
    </button>
  );
}
