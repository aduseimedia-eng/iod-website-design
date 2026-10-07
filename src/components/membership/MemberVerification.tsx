"use client";

import { FormEvent, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { PublicMemberVerification, verifyPublicMember } from "@/lib/api/membership";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export function MemberVerification() {
  const [memberName, setMemberName] = useState("");
  const [member, setMember] = useState<PublicMemberVerification | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMember(null);
    setSubmitting(true);
    try {
      setMember(await verifyPublicMember(memberName));
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 404 ? "No member was found in the published Members in Good Standing register with that name." : reason instanceof ApiError ? reason.message : "We could not verify this member. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={verify} className="border border-[var(--color-line)] bg-[var(--color-warm-white)] p-7 sm:p-10"><label className="block"><span className="mb-2 block text-sm font-bold text-[var(--color-ink)]">Member&apos;s full name <span className="text-[var(--color-error)]">*</span></span><input value={memberName} onChange={(event) => setMemberName(event.target.value)} required autoComplete="name" placeholder="e.g. Ama Mensah" className="h-12 w-full border border-[var(--color-line)] bg-white px-4 text-sm outline-none transition-colors placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold-dark)]" /></label><button type="submit" disabled={submitting} className="mt-6 inline-flex min-h-12 items-center justify-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-6 text-sm font-bold text-white transition-[background-color,border-color,color] hover:border-[var(--color-accent-dark)] hover:bg-[var(--color-accent-dark)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Verifying..." : "Verify membership"}</button><p className="mt-5 text-sm leading-6 text-[var(--color-slate)]">Enter the member&apos;s full name as it appears in the published Members in Good Standing register.</p>{error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm text-[var(--color-ink)]">{error}</p>}{member && <section aria-live="polite" className="mt-7 border-t-4 border-[var(--color-accent)] bg-white p-6"><p className="eyebrow text-[var(--color-accent-dark)]">Membership verified</p><h2 className="mt-3 font-serif text-3xl tracking-[-0.04em]">{member.full_name}</h2><p className="mt-3 text-sm font-bold text-emerald-800">Member in good standing</p><dl className="mt-6 grid gap-5 border-t border-[var(--color-line)] pt-5 sm:grid-cols-2"><div><dt className="text-xs font-bold tracking-[0.08em] text-[var(--color-slate)]">DESIGNATION</dt><dd className="mt-2 text-sm font-bold">{member.designation}</dd></div><div><dt className="text-xs font-bold tracking-[0.08em] text-[var(--color-slate)]">REGISTER UPDATED</dt><dd className="mt-2 text-sm font-bold">{formatDate(member.as_of_date)}</dd></div></dl></section>}</form>;
}
