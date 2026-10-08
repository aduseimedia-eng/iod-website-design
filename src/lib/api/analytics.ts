import { apiRequest } from "./client";

type DailyPoint = { date: string; page_views: number; unique_visitors: number };
type CountByPath = { path: string; page_views: number };
type CountByReferrer = { referrer_host: string; page_views: number };
type CountByDevice = { device_type: string; page_views: number };

export type AnalyticsReport = {
  range: { from: string; to: string; days: number };
  totals: { page_views: number; unique_daily_visitors: number };
  today: { page_views: number; unique_visitors: number };
  daily: DailyPoint[];
  pages: CountByPath[];
  referrers: CountByReferrer[];
  devices: CountByDevice[];
};

export const analyticsReport = (days: number) => apiRequest<AnalyticsReport>(`/analytics/report/?days=${days}`);
