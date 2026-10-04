"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { FormInput } from "@/components/ui/FormFields";
import { registerAccount } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) return setError("Your passwords do not match.");
    setError("");
    setSubmitting(true);
    try {
      await registerAccount(form);
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We could not create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="bg-[var(--color-paper)] py-14 sm:py-20"><section className="site-container max-w-2xl"><div className="border-t-4 border-[var(--color-ink)] bg-white p-7 sm:p-10"><p className="eyebrow">Create account</p><h1 className="mt-4 font-serif text-5xl tracking-[-0.05em]">Start your IoD-Gh account.</h1>{submitted ? <div className="mt-8 border-l-2 border-[var(--color-accent)] bg-[var(--color-warm-white)] p-6"><h2 className="font-serif text-2xl">Check your email.</h2><p className="mt-3 leading-7 text-[var(--color-slate)]">We have sent a verification link to <strong>{form.email}</strong>. Verify your email before signing in.</p><Link href="/login" className="mt-5 inline-block text-sm font-bold underline underline-offset-4">Return to sign in</Link></div> : <form onSubmit={submit}><p className="mt-4 leading-7 text-[var(--color-slate)]">Create an account to access the IoD-Gh member area. Membership is subject to application and approval.</p>{error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm">{error}</p>}<div className="mt-8 grid gap-5 sm:grid-cols-2"><FormInput label="First name" required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /><FormInput label="Last name" required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /><FormInput label="Email address" type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} /><FormInput label="Phone number" type="tel" required value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} /><FormInput label="Password" type="password" required value={form.password} onChange={(event) => update("password", event.target.value)} /><FormInput label="Confirm password" type="password" required value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} /></div><button type="submit" disabled={submitting} className="mt-8 inline-flex min-h-12 items-center justify-center bg-[var(--color-ink)] px-6 text-sm font-bold text-white transition-colors hover:bg-[var(--color-accent-dark)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Creating account…" : "Create account"}</button><p className="mt-6 text-sm text-[var(--color-slate)]">Already have an account? <Link href="/login" className="font-bold text-[var(--color-ink)] underline">Sign in</Link></p></form>}</div></section></main>;
}
