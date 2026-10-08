"use client";

import { useEffect, useState } from "react";
import { analyticsReport, AnalyticsReport } from "@/lib/api/analytics";

const number = new Intl.NumberFormat("en-GH");
const day = new Intl.DateTimeFormat("en-GH", { weekday: "short" });

export function AnalyticsAdmin() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    analyticsReport(days).then((data) => { if (active) setReport(data); }).catch(() => { if (active) setError("Analytics could not be loaded. Please try again."); });
    return () => { active = false; };
  }, [days]);

  if (error) return <section className="mt-8 border-l-2 border-[var(--color-error)] bg-red-50 p-6" role="alert"><h2 className="font-serif text-2xl">Analytics unavailable</h2><p className="mt-2 text-sm">{error}</p></section>;
  if (!report) return <section className="mt-8" aria-live="polite"><div className="h-64 animate-pulse bg-[var(--color-paper)]" /></section>;

  const maxViews = Math.max(...report.daily.map((entry) => entry.page_views), 1);
  return <section className="mt-8 max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><p className="max-w-2xl text-sm leading-6 text-[var(--color-slate)]">Cookie-free, first-party analytics. Visitor markers are one-way hashes that rotate daily; raw IP addresses and browser identifiers are never stored.</p><label className="text-sm font-semibold">Period<select value={days} onChange={(event) => { setError(""); setDays(Number(event.target.value)); }} className="ml-3 h-10 border border-[var(--color-line)] bg-white px-3 font-normal"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></div>
    <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Page views" value={report.totals.page_views} detail={`Last ${report.range.days} days`} /><Metric label="Unique daily visits" value={report.totals.unique_daily_visitors} detail="Daily identities are not linked" /><Metric label="Views today" value={report.today.page_views} detail="Public pages only" /><Metric label="Visitors today" value={report.today.unique_visitors} detail="Estimated from a daily marker" /></div>
    <section className="mt-8 border border-[var(--color-line)] bg-white p-6"><div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Traffic</p><h2 className="mt-2 font-serif text-3xl">Daily page views.</h2></div><p className="text-xs text-[var(--color-slate)]">{report.range.from} – {report.range.to}</p></div><div className="mt-8 grid h-48 grid-cols-7 items-end gap-2 sm:grid-cols-[repeat(14,minmax(0,1fr))]">{report.daily.map((entry, index) => <div className="flex h-full min-w-0 flex-col justify-end" key={entry.date} title={`${entry.date}: ${entry.page_views} page views`}><div className="min-h-px bg-[var(--color-accent)]" style={{ height: `${Math.max((entry.page_views / maxViews) * 100, entry.page_views ? 3 : 0)}%` }} /><span className="mt-2 truncate text-center text-[0.6rem] text-[var(--color-slate)]">{report.daily.length <= 14 || index % Math.ceil(report.daily.length / 7) === 0 ? day.format(new Date(`${entry.date}T00:00:00`)) : ""}</span></div>)}</div></section>
    <div className="mt-8 grid gap-5 lg:grid-cols-3"><Breakdown title="Most visited pages" rows={report.pages.map((item) => [item.path, item.page_views])} empty="No public page views yet." /><Breakdown title="Top referral sources" rows={report.referrers.map((item) => [item.referrer_host, item.page_views])} empty="No external referrals yet." /><Breakdown title="Devices" rows={report.devices.map((item) => [item.device_type, item.page_views])} empty="No device data yet." /></div>
  </section>;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) { return <article className="border border-[var(--color-line)] bg-white p-6"><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]">{label.toUpperCase()}</p><p className="mt-5 font-serif text-4xl">{number.format(value)}</p><p className="mt-3 text-sm text-[var(--color-slate)]">{detail}</p></article>; }
function Breakdown({ title, rows, empty }: { title: string; rows: Array<[string, number]>; empty: string }) { return <section className="border border-[var(--color-line)] bg-white"><div className="border-b border-[var(--color-line)] p-5"><h2 className="font-serif text-2xl">{title}</h2></div>{rows.length ? <ol>{rows.map(([label, value]) => <li className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4 text-sm last:border-0" key={label}><span className="min-w-0 truncate font-medium">{label}</span><strong>{number.format(value)}</strong></li>)}</ol> : <p className="p-5 text-sm text-[var(--color-slate)]">{empty}</p>}</section>; }
