import assert from "node:assert/strict";

// Run against `next start`, not the development server.
const base = process.env.SECURITY_TEST_URL || "http://127.0.0.1:3001";
const seen = new Set();
for (const path of ["/login", "/", "/register", "/cms-preview", "/login"]) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  const csp = response.headers.get("content-security-policy") || "";
  const scriptPolicy = csp.split(";").find((directive) => directive.trim().startsWith("script-src ")) || "";
  assert.ok(!scriptPolicy.includes("unsafe-inline") && !scriptPolicy.includes("unsafe-eval"), "Production scripts must not use unsafe-inline/eval");
  assert.ok(csp.includes("object-src 'none'") && csp.includes("frame-ancestors 'self'"));
  const nonce = scriptPolicy.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce && !seen.has(nonce), "Every response needs a fresh nonce");
  seen.add(nonce);
  const html = await response.text();
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(([tag]) => tag);
  assert.ok(scripts.length > 0, "Page should include Next.js scripts");
  for (const script of scripts) assert.ok(script.includes(`nonce="${nonce}"`), `Missing/mismatched nonce: ${script}`);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  console.log(`PASS ${path}: security headers, unique nonce, ${scripts.length} authorized scripts`);
}
