// app/login/page.tsx
// Halaman sign-in — Google OAuth + Email/Password register & login.
"use client";

import { useCallback, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useLanguage } from "@/contexts/language-context";

type Tab = "register" | "google";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("register");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const safeCallbackUrl =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard";

  const handleGoogleSignIn = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        await signIn("google", { callbackUrl: safeCallbackUrl });
      } catch (e) {
        console.error("Sign in failed:", e);
        setError("Gagal memulai sign in, coba lagi.");
      }
    });
  }, [safeCallbackUrl]);

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      startTransition(async () => {
        try {
          const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? t("auth.registerError"));
            return;
          }
          // Auto sign in after registration
          const signInResult = await signIn("credentials", {
            email: regEmail,
            password: regPassword,
            redirect: false,
          });
          if (signInResult?.error) {
            setError(t("auth.registerError"));
          } else {
            router.push(safeCallbackUrl);
          }
        } catch (e) {
          console.error("Register failed:", e);
          setError(t("auth.registerError"));
        }
      });
    },
    [regName, regEmail, regPassword, safeCallbackUrl, t, router],
  );

  const handlePasswordLogin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      startTransition(async () => {
        try {
          const result = await signIn("credentials", {
            email: regEmail,
            password: regPassword,
            redirect: false,
          });
          if (result?.error) {
            setError("Email atau kata sandi salah.");
          } else {
            router.push(safeCallbackUrl);
          }
        } catch (e) {
          console.error("Sign in failed:", e);
          setError("Gagal masuk, coba lagi.");
        }
      });
    },
    [regEmail, regPassword, safeCallbackUrl, router],
  );

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-md">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-lg">
        <div className="flex flex-col items-center gap-sm">
          <span className="text-[40px]">🌱</span>
          <h1 className="font-display-lg text-display-lg text-primary">Ripen</h1>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant">
          {t("login.tagline")}
        </p>

        {/* Tab switcher */}
        <div className="flex w-full rounded-lg overflow-hidden border border-outline-variant">
          <button
            onClick={() => setTab("register")}
            className={`flex-1 py-sm font-body-sm text-body-sm font-medium transition-colors ${
              tab === "register"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {t("auth.passwordTab")}
          </button>
          <button
            onClick={() => setTab("google")}
            className={`flex-1 py-sm font-body-sm text-body-sm font-medium transition-colors ${
              tab === "google"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {t("auth.googleTab")}
          </button>
        </div>

        {tab === "register" ? (
          <>
            {/* Register form */}
            <form onSubmit={handleRegister} className="w-full flex flex-col gap-md">
              <input
                type="text"
                placeholder={t("auth.registerName")}
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest font-body-md text-body-md focus:outline-none focus:border-primary"
              />
              <input
                type="email"
                placeholder={t("auth.registerEmail")}
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest font-body-md text-body-md focus:outline-none focus:border-primary"
              />
              <input
                type="password"
                placeholder={t("auth.registerPassword")}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest font-body-md text-body-md focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={pending}
                className="w-full py-sm bg-primary text-on-primary rounded-lg font-body-md text-body-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {pending ? t("login.connecting") : t("auth.registerButton")}
              </button>
            </form>

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t("auth.orContinueWith")}
            </p>

            <button
              onClick={handleGoogleSignIn}
              disabled={pending}
              className="w-full flex items-center justify-center gap-sm bg-surface-container-lowest hover:bg-surface-container transition-colors border border-outline-variant rounded-lg px-lg py-md font-body-md text-body-md font-medium shadow-sm disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              {t("login.signInGoogle")}
            </button>
          </>
        ) : (
          /* Google sign-in tab */
          <button
            onClick={handleGoogleSignIn}
            disabled={pending}
            className="w-full flex items-center justify-center gap-sm bg-surface-container-lowest hover:bg-surface-container transition-colors border border-outline-variant rounded-lg px-lg py-md font-body-md text-body-md font-medium shadow-sm disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            {pending ? t("login.connecting") : t("login.signInGoogle")}
          </button>
        )}

        {error && <p className="font-body-md text-body-md text-error">{error}</p>}

      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
