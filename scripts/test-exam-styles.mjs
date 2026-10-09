import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const styles = read("apps/exam-portal/app/styles.css");
const mainStyles = read("src/app/globals.css");
const portalLayout = read("apps/exam-portal/app/layout.tsx");

test("Exam pages use the same self-hosted Inter setup as the main site", () => {
  for (const path of ["src/app/layout.tsx", "apps/exam-portal/app/layout.tsx"]) {
    const layout = read(path);
    assert.match(layout, /import \{ Inter \} from "next\/font\/google"/);
    assert.match(layout, /variable: "--font-inter"/);
    assert.match(layout, /display: "swap"/);
    assert.match(layout, /className=\{inter.variable\}/);
  }
  assert.match(styles, /font-family: var\(--font-inter\), Arial, Helvetica, sans-serif/);
  assert.doesNotMatch(styles, /Georgia|(?<![-\w])serif\s*[;,}]|monospace/);
  assert.match(styles, /font-variant-numeric: tabular-nums/);
});

test("Exam portal header uses the CMS logo without a duplicate IoD-Gh wordmark", () => {
  assert.match(portalLayout, /getNavbarLogo/);
  assert.match(portalLayout, /className="brand-logo"/);
  assert.match(styles, /\.brand-logo\s*\{[^}]*object-fit: contain[^}]*filter:/);
  assert.doesNotMatch(portalLayout, /IoD<span>-Gh<\/span>/);
  assert.match(portalLayout, />Institute of Directors-Ghana</);
  assert.match(read("apps/exam-portal/proxy.ts"), /img-src 'self' data: \$\{apiOrigin\}/);
  assert.match(read("apps/exam-portal/next.config.ts"), /devIndicators: false/);
});

test("Exam colors stay aligned with the main website", () => {
  for (const [portal, main] of Object.entries({ ink: "ink", accent: "accent", "accent-dark": "accent-dark", "accent-light": "accent-light", paper: "paper", "warm-white": "warm-white", line: "line", muted: "slate", error: "error" })) {
    const value = (css, name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]+)`, "i"))?.[1];
    assert.ok(value(mainStyles, `color-${main}`), `Main site token ${main} exists`);
    assert.equal(value(styles, portal), value(mainStyles, `color-${main}`), portal);
  }
});

test("Exam content and header share the main site's responsive gutters", () => {
  for (const css of [styles, mainStyles]) {
    assert.match(css, /width: min\(100% - 3rem, 1280px\)/);
    assert.match(css, /width: min\(100% - 4rem, 1280px\)/);
    assert.match(css, /@media \(min-width: 640px\)/);
  }
  assert.match(styles, /\.masthead-inner\s*\{[^}]*min-height: 72px/);
  assert.match(styles, /h1, h2, h3, legend\s*\{[^}]*font-weight: 700/);
});
