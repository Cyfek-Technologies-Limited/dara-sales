"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({
              email: String(data.get("email") ?? ""),
              password: String(data.get("password") ?? ""),
            })
          : await authClient.signUp.email({
              email: String(data.get("email") ?? ""),
              password: String(data.get("password") ?? ""),
              name: String(data.get("name") ?? ""),
            });
      if (result.error) {
        console.error("[v0] Authentication request failed:", result.error);
        setError(
          `${result.error.code || "AUTH_REQUEST_FAILED"}: ${
            result.error.message || "Check your details and try again."
          }`
        );
        return;
      }
      if (mode === "sign-up") {
        router.replace("/onboarding");
      } else {
        const redirectResponse = await fetch("/api/auth/redirect", {
          cache: "no-store",
        });
        const redirectData = await redirectResponse.json();
        if (!redirectResponse.ok) {
          setError(
            `${
              redirectData.code || "ROLE_LOOKUP_FAILED"
            }: Could not determine your workspace role.`
          );
          return;
        }
        console.log("[v0] Sign-in role redirect:", redirectData);
        router.replace(redirectData.destination);
      }
      router.refresh();
    } catch (cause) {
      console.error("[v0] Authentication request threw:", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "The request failed. Please try again."
      );
    } finally {
      setPending(false);
    }
  }

  async function continueWithGoogle() {
    setPending(true);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/onboarding",
    });
    if (result.error)
      setError(
        `${result.error.code || "GOOGLE_AUTH_FAILED"}: ${
          result.error.message || "Google sign-in could not be started."
        }`
      );
    setPending(false);
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-lg flex-col gap-4 rounded-[28px] border border-[#d6deea] bg-[#f4f6f9] p-8 text-[#111827] shadow-2xl"
    >
      <div>
        <a
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5366df]"
        >
          Dara
        </a>
        <h1 className="mt-3 font-serif text-4xl font-normal">
          {mode === "sign-in"
            ? "Welcome back to Dara."
            : "Create your workspace."}
        </h1>
        <p className="mt-2 text-sm text-[#596579]">
          {mode === "sign-in"
            ? "Sign in to your sales workspace."
            : "Create a company workspace and invite your sales team privately."}
        </p>
      </div>
      {mode === "sign-up" && (
        <input
          name="name"
          required
          placeholder="Your name"
          className="rounded-xl border border-[#d6deea] bg-[#ffffff] px-4 py-3 outline-none"
        />
      )}
      <input
        name="email"
        type="email"
        required
        placeholder="Work email"
        className="rounded-xl border border-[#d6deea] bg-[#ffffff] px-4 py-3 outline-none"
      />
      <input
        name="password"
        type="password"
        minLength={8}
        required
        placeholder="Password"
        className="rounded-xl border border-[#d6deea] bg-[#ffffff] px-4 py-3 outline-none"
      />
      {error && (
        <p role="alert" className="text-sm text-[#b43825]">
          {error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-full bg-[#06101c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b1c31] disabled:opacity-60"
      >
        {pending
          ? "Please wait…"
          : mode === "sign-in"
          ? "Sign in"
          : "Create workspace"}
      </button>
      <div className="flex items-center gap-3 text-xs text-[#657286]">
        <span className="h-px flex-1 bg-[#d6deea]" />
        or
        <span className="h-px flex-1 bg-[#d6deea]" />
      </div>
      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={pending}
        className="inline-flex items-center justify-center gap-3 rounded-full border border-[#d6deea] px-5 py-3 text-sm font-semibold disabled:opacity-60"
      >
        <svg aria-hidden="true" className="size-5" viewBox="0 0 48 48">
          <path
            fill="#FFC107"
            d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z"
          />
          <path
            fill="#FF3D00"
            d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z"
          />
          <path
            fill="#4CAF50"
            d="M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18l6.8-5.2Z"
          />
          <path
            fill="#1976D2"
            d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.2C14.2 15.6 18.7 12 24 12Z"
          />
        </svg>
        Continue with Google
      </button>
      <a
        href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
        className="text-center text-xs underline"
      >
        {mode === "sign-in"
          ? "Create a company workspace"
          : "Already have an account? Sign in"}
      </a>
    </form>
  );
}
