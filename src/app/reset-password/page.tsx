"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { FormInput } from "@/components/ui/FormFields";
import { confirmPasswordReset } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function ResetPasswordPage() {
  return <Suspense fallback={<PageLoading />}><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!params.get("uid") || !params.get("token")) return setError("This password-reset link is incomplete. Request a new one.");
    if (password !== confirmation) return setError("Your passwords do not match.");
    setError("");
    setSubmitting(true);
    try { await confirmPasswordReset(params.get("uid")!, params.get("token")!, password); setComplete(true); } catch (reason) { setError(reason instanceof ApiError ? reason.message : "We could not reset your password. Please try again."); } finally { setSubmitting(false); }
  }

  return <main className="bg-[var(--color-paper)] py-20"><section className="site-container max-w-2xl"><div className="border-t-4 border-[var(--color-ink)] bg-white p-8 sm:p-10"><p className="eyebrow">Password reset</p><h1 className="mt-4 font-serif text-5xl tracking-[-0.05em]">Choose a new password.</h1>{complete ? <div className="mt-7 border-l-2 border-[var(--color-accent)] bg-[var(--color-warm-white)] p-6"><p className="leading-7">Your password has been reset. You can now sign in.</p><Link href="/login" className="mt-5 inline-block font-bold underline">Sign in</Link></div> : <form onSubmit={submit}>{error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm">{error}</p>}<div className="mt-8 space-y-5"><FormInput label="New password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /><FormInput label="Confirm new password" type="password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div><button type="submit" disabled={submitting} className="mt-8 min-h-12 bg-[var(--color-ink)] px-6 text-sm font-bold text-white disabled:opacity-60">{submitting ? "Resetting…" : "Reset password"}</button></form>}</div></section></main>;
}

function PageLoading() {
  return <main className="grid min-h-[50vh] place-items-center bg-[var(--color-paper)]"><p className="text-sm font-bold text-[var(--color-slate)]">Loading password reset…</p></main>;
}
