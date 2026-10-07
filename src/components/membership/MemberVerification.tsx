"use client";

import { FormEvent, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { PublicMemberVerification, verifyPublicMember } from "@/lib/api/membership";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "Not specified";
}

export function MemberVerification() {
  const [membershipNumber, setMembershipNumber] = useState("");
  const [member, setMember] = useState<PublicMemberVerification | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMember(null);
    setSubmitting(true);
    try {
      setMember(await verifyPublicMember(membershipNumber));
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 404 ? "No publicly verifiable member was found with that membership number." : reason instanceof ApiError ? reason.message : "We could not verify this membership number. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={verify} className="border border-[var(--color-line)] bg-[var(--color-warm-white)] p-7 sm:p-10"><label className="block"><span className="mb-2 block text-sm font-bold text-[var(--color-ink)]">Membership number <span className="text-[var(--color-error)]">*</span></span><input value={membershipNumber} onChange={(event) => setMembershipNumber(event.target.value)} required autoComplete="off" placeholder="e.g. M-12345" className="h-12 w-full border border-[var(--color-line)] bg-white px-4 text-sm outline-none transition-colors placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold-dark)]" /></label><button type="submit" disabled={submitting} className="mt-6 inline-flex min-h-12 items-center justify-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-6 text-sm font-bold text-white transition-[background-color,border-color,color] hover:border-[var(--color-accent-dark)] hover:bg-[var(--color-accent-dark)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Verifying…" : "Verify membership"}</button><p className="mt-5 text-sm leading-6 text-[var(--color-slate)]">Enter the member&apos;s IoD-Gh membership number to confirm their public membership standing.</p>{error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm text-[var(--color-ink)]">{error}</p>}{member && <section aria-live="polite" className="mt-7 border-t-4 border-[var(--color-accent)] bg-white p-6"><p className="eyebrow text-[var(--color-accent-dark)]">Membership verified</p><h2 className="mt-3 font-serif text-3xl tracking-[-0.04em]">{member.full_name}</h2><p className="mt-3 text-sm font-bold text-emerald-800">Member in good standing</p><dl className="mt-6 grid gap-5 border-t border-[var(--color-line)] pt-5 sm:grid-cols-3"><div><dt className="text-xs font-bold tracking-[0.08em] text-[var(--color-slate)]">MEMBERSHIP NO.</dt><dd className="mt-2 text-sm font-bold">{member.membership_number}</dd></div><div><dt className="text-xs font-bold tracking-[0.08em] text-[var(--color-slate)]">MEMBERSHIP TYPE</dt><dd className="mt-2 text-sm font-bold">{member.membership_type}</dd></div><div><dt className="text-xs font-bold tracking-[0.08em] text-[var(--color-slate)]">VALID TO</dt><dd className="mt-2 text-sm font-bold">{formatDate(member.membership_end_date)}</dd></div></dl></section>}</form>;
}
