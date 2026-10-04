"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { canAccessAdmin, login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { FormInput } from "@/components/ui/FormFields";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      router.replace(canAccessAdmin(user) ? "/admin" : "/member/dashboard");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We could not sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="grid min-h-[calc(100vh-112px)] bg-[var(--color-paper)] lg:grid-cols-2"><section className="hidden bg-[var(--color-ink)] p-12 text-white lg:flex lg:flex-col lg:justify-between"><p className="eyebrow text-[var(--color-gold-light)]">IoD-Gh member area</p><div><h1 className="font-serif text-6xl leading-none tracking-[-0.05em]">Your professional home for directorship.</h1><p className="mt-7 max-w-md leading-7 text-[var(--color-mist)]">Access your membership, learning and governance resources in one place.</p></div><p className="text-sm text-[var(--color-mist)]">Not yet a member? <Link href="/membership" className="border-b border-[var(--color-gold)] text-white">Discover IoD-Gh membership</Link></p></section><section className="flex items-center justify-center px-6 py-16 sm:p-12"><form onSubmit={submit} className="w-full max-w-md"><p className="eyebrow">Member login</p><h1 className="mt-5 font-serif text-5xl tracking-[-0.05em]">Welcome back.</h1><p className="mt-4 leading-7 text-[var(--color-slate)]">Sign in to access your member experience.</p>{error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm">{error}</p>}<div className="mt-9 space-y-5"><FormInput label="Email address" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /><FormInput label="Password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div><button type="submit" disabled={submitting} className="mt-7 inline-flex min-h-12 w-full items-center justify-center bg-[var(--color-ink)] px-6 text-sm font-bold text-white transition-colors hover:bg-[var(--color-accent-dark)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Signing in…" : "Sign in"}</button><div className="mt-6 flex justify-between text-sm"><Link href="/forgot-password" className="underline">Forgot password?</Link><Link href="/register" className="underline">Create account</Link></div></form></section></main>;
}
