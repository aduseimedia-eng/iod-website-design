import { createHmac, timingSafeEqual } from "node:crypto";

import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

type RevalidationEvent = { tags?: unknown; paths?: unknown; timestamp?: unknown };

function signatureMatches(body: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const expectedBytes = Buffer.from(expected, "utf8");
  const providedBytes = Buffer.from(signature, "utf8");
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

function safeTags(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === "string" && /^cms:[a-z0-9:_-]{1,180}$/.test(tag)) : [];
}

function safePaths(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((path): path is string => typeof path === "string" && /^\/[a-zA-Z0-9/_-]{0,240}$/.test(path)) : [];
}

export async function POST(request: NextRequest) {
  const secret = process.env.CMS_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: "CMS revalidation is not configured." }, { status: 503 });

  const body = await request.text();
  const signature = request.headers.get("x-cms-signature") || "";
  if (!signatureMatches(body, signature, secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  let event: RevalidationEvent;
  try {
    event = JSON.parse(body) as RevalidationEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  if (typeof event.timestamp !== "string" || Number.isNaN(Date.parse(event.timestamp)) || Math.abs(Date.now() - Date.parse(event.timestamp)) > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Expired revalidation event." }, { status: 400 });
  }

  const tags = safeTags(event.tags);
  const paths = safePaths(event.paths);
  tags.forEach((tag) => revalidateTag(tag, "max"));
  paths.forEach((path) => revalidatePath(path));
  return NextResponse.json({ revalidated: true, tags, paths });
}
