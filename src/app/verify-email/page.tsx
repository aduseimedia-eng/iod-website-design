"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { confirmEmailVerification } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function VerifyEmailPage() {
  return <Suspense fallback={<PageLoading />}><VerifyEmailForm /></Suspense>;
}

function VerifyEmailForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";

  async function verify() {
    if (!uid || !token) return setError("This verification link is incomplete. Request a new verification email.");
    setError("");
    setSubmitting(true);
    try { await confirmEmailVerification(uid, token); setVerified(true); } catch (reason) { setError(reason instanceof ApiError ? reason.message : "We could not verify your email. Please try again."); } finally { setSubmitting(false); }
  }

  return <main className="bg-[var(--color-paper)] py-20"><section className="site-container max-w-2xl"><div className="border-t-4 border-[var(--color-ink)] bg-white p-8 sm:p-10"><p className="eyebrow">Account verification</p><h1 className="mt-4 font-serif text-5xl tracking-[-0.05em]">Verify your email.</h1>{verified ? <div className="mt-7 border-l-2 border-[var(--color-accent)] bg-[var(--color-warm-white)] p-6"><p className="leading-7">Your email has been verified. You can now sign in to your IoD-Gh account.</p><Link href="/login" className="mt-5 inline-block font-bold underline">Sign in</Link></div> : <><p className="mt-5 leading-7 text-[var(--color-slate)]">Confirm your email address to activate your IoD-Gh account.</p>{error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm">{error}</p>}<button type="button" onClick={verify} disabled={submitting} className="mt-8 min-h-12 bg-[var(--color-ink)] px-6 text-sm font-bold text-white disabled:opacity-60">{submitting ? "Verifying…" : "Verify email address"}</button></>}</div></section></main>;
}

function PageLoading() {
  return <main className="grid min-h-[50vh] place-items-center bg-[var(--color-paper)]"><p className="text-sm font-bold text-[var(--color-slate)]">Loading verification…</p></main>;
}
