"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { FormInput } from "@/components/ui/FormFields";
import { requestPasswordReset } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try { await requestPasswordReset(email); setSubmitted(true); } catch (reason) { setError(reason instanceof ApiError ? reason.message : "We could not send the reset link. Please try again."); } finally { setSubmitting(false); }
  }

  return <main className="bg-[var(--color-paper)] py-20"><section className="site-container max-w-2xl"><div className="border-t-4 border-[var(--color-ink)] bg-white p-8 sm:p-10"><p className="eyebrow">Password reset</p><h1 className="mt-4 font-serif text-5xl tracking-[-0.05em]">Reset your password.</h1>{submitted ? <div className="mt-7 border-l-2 border-[var(--color-accent)] bg-[var(--color-warm-white)] p-6"><p className="leading-7">If an IoD-Gh account exists for this address, we have sent password-reset instructions.</p><Link href="/login" className="mt-5 inline-block font-bold underline">Return to sign in</Link></div> : <form onSubmit={submit}><p className="mt-5 leading-7 text-[var(--color-slate)]">Enter your account email and we will send a secure password-reset link.</p>{error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm">{error}</p>}<div className="mt-8"><FormInput label="Email address" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div><button type="submit" disabled={submitting} className="mt-8 min-h-12 bg-[var(--color-ink)] px-6 text-sm font-bold text-white disabled:opacity-60">{submitting ? "Sending…" : "Send reset link"}</button></form>}</div></section></main>;
}
