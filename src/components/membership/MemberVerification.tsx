"use client";

import { FormEvent, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { PublicMemberVerification, verifyPublicMember } from "@/lib/api/membership";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export function MemberVerification() {
  const [memberName, setMemberName] = useState("");
  const [members, setMembers] = useState<PublicMemberVerification[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMembers([]);
    setSubmitting(true);
    try {
      setMembers(await verifyPublicMember(memberName));
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 404 ? "No member was found in the published Members in Good Standing register with that name." : reason instanceof ApiError ? reason.message : "We could not verify this member. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={verify} className="border border-[var(--color-line)] bg-[var(--color-warm-white)] p-7 sm:p-10"><label className="block"><span className="mb-2 block text-sm font-bold text-[var(--color-ink)]">Member&apos;s name <span className="text-[var(--color-error)]">*</span></span><input value={memberName} onChange={(event) => setMemberName(event.target.value)} required autoComplete="name" placeholder="e.g. Ama or Mensah Ama" className="h-12 w-full border border-[var(--color-line)] bg-white px-4 text-sm outline-none transition-colors placeholder:text-[var(--color-slate)] focus:border-[var(--color-gold-dark)]" /></label><button type="submit" disabled={submitting} className="mt-6 inline-flex min-h-12 items-center justify-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-6 text-sm font-bold text-white transition-[background-color,border-color,color] hover:border-[var(--color-accent-dark)] hover:bg-[var(--color-accent-dark)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Searching..." : "Verify membership"}</button><p className="mt-5 text-sm leading-6 text-[var(--color-slate)]">Enter any part of the member&apos;s name. You may use the names in either order.</p>{error && <p role="alert" className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 px-4 py-3 text-sm text-[var(--color-ink)]">{error}</p>}{members.length > 0 && <section aria-live="polite" className="mt-7 border-t-4 border-[var(--color-accent)] bg-white p-6"><p className="eyebrow text-[var(--color-accent-dark)]">{members.length === 1 ? "Membership verified" : "Matching members"}</p><p className="mt-3 text-sm font-bold text-emerald-800">{members.length === 1 ? "Member in good standing" : `${members.length} members in good standing`}</p><div className="mt-6 grid gap-4 border-t border-[var(--color-line)] pt-5">{members.map((member) => <article key={`${member.full_name}-${member.designation}`} className="border border-[var(--color-line)] p-5"><h2 className="font-serif text-2xl tracking-[-0.04em]">{member.full_name}</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs font-bold tracking-[0.08em] text-[var(--color-slate)]">DESIGNATION</dt><dd className="mt-2 text-sm font-bold">{member.designation}</dd></div><div><dt className="text-xs font-bold tracking-[0.08em] text-[var(--color-slate)]">REGISTER UPDATED</dt><dd className="mt-2 text-sm font-bold">{formatDate(member.as_of_date)}</dd></div></dl></article>)}</div></section>}</form>;
}
