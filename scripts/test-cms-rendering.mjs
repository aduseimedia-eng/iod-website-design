// Render the real TSX components with React's server renderer. This small loader
// uses the existing TypeScript dependency and keeps the app's path aliases intact.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { runInThisContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = process.cwd();
const cache = new Map();
function load(source) {
  const filename = [source, source + ".tsx", source + ".ts"].find(existsSync);
  assert.ok(filename, `Missing test module ${source}`);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loadedModule = { exports: {} };
  cache.set(filename, loadedModule);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const dependency = (specifier) => specifier.startsWith("@/") ? load(path.join(root, "src", specifier.slice(2))) : specifier.startsWith(".") ? load(path.resolve(path.dirname(filename), specifier)) : createRequire(filename)(specifier);
  runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(dependency, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const { CmsPageContext } = load(path.join(root, "src/components/cms/PageContext"));
const { CmsPageText } = load(path.join(root, "src/components/content/useCmsContent"));
const { ArticlePage } = load(path.join(root, "src/components/cms/ArticlePage"));
const { HomepageContent } = load(path.join(root, "src/components/content/HomepageContent"));
const { PartnerLogos } = load(path.join(root, "src/components/content/PartnerLogos"));
const { default: MembershipDetail } = load(path.join(root, "src/app/membership/[slug]/page"));
const revision = {
  title: "Updated member register", eyebrow: "Current membership", summary: "The saved register introduction",
  body: "", sections: [{ slot: "hero_image", data: { image_url: "/images/updated-hero.png" }, is_enabled: true }],
};

test("Members in Good Standing renders CMS hero fields and selected image", async () => {
  const page = await MembershipDetail({ params: Promise.resolve({ slug: "members-in-good-standing" }) });
  const html = renderToStaticMarkup(React.createElement(CmsPageContext.Provider, { value: { slug: "membership-members-in-good-standing", revision } }, page));
  assert.match(html, /<h1[^>]*>Updated member register<\/h1>/);
  assert.match(html, /Current membership/);
  assert.match(html, /The saved register introduction/);
  assert.match(html, /src="\/images\/updated-hero.png"/);
  assert.doesNotMatch(html, /A public register for recognising/);
});

test("Clearing a CMS description does not resurrect fallback text", () => {
  const html = renderToStaticMarkup(React.createElement(CmsPageContext.Provider, { value: { slug: "example", revision: { ...revision, summary: "" } } }, React.createElement(CmsPageText, { slug: "example", field: "summary", fallback: "Old description" })));
  assert.equal(html, "");
});

test("Public articles and previews render byline, category, date, image, caption and content", () => {
  const html = renderToStaticMarkup(React.createElement(ArticlePage, { article: {
    content_type: "news", author_display_name: "Ama Example", category: { name: "Governance" }, published_at: "2026-10-03T12:00:00Z",
    revision: { title: "Edited article title", standfirst: "Edited excerpt", body: "Edited article body", cover_media: { file_url: "/images/test-news.png", alt_text: "Directors at the forum", caption: "The annual forum", credit: "IoD-Gh" } },
  } }));
  for (const value of ["Ama Example", "Governance", "3 October 2026", "Edited article title", "Edited excerpt", "Edited article body", "Directors at the forum", "The annual forum", "IoD-Gh"]) assert.ok(html.includes(value), `Missing ${value}`);
  assert.ok(html.indexOf("test-news.png", html.indexOf("<figure")) < html.indexOf("Edited article body"));
});

test("Homepage partners render uploaded logos in saved order, with optional links", () => {
  const html = renderToStaticMarkup(React.createElement(HomepageContent, { revision: {
    sections: [{ slot: "main", section_type: "card_grid", is_enabled: true, position: 0, data: {
      home_section: "partners", heading: "Corporate partners", items: [
        { id: "one", title: "First partner", image_url: "/images/partner-one.png", href: "https://partner.example" },
        { id: "two", title: "Second partner", image_url: "/images/partner-two.png", href: "" },
        { id: "empty", title: "Not uploaded yet", image_url: "", href: "" },
      ],
    } }],
  } }));
  assert.match(html, /alt="First partner"/);
  assert.match(html, /alt="Second partner"/);
  assert.match(html, /href="https:\/\/partner.example"/);
  assert.match(html, /object-contain/);
  assert.ok(html.indexOf('alt="First partner"') < html.indexOf('alt="Second partner"'));
  assert.doesNotMatch(html, /Not uploaded yet|href="\/"/);
});

test("Partner logos omit missing or unsafe images and do not invent placeholders", () => {
  assert.equal(renderToStaticMarkup(React.createElement(PartnerLogos, { items: [] })), "");
  assert.equal(renderToStaticMarkup(React.createElement(PartnerLogos, { items: [{ id: "bad", title: "Invalid", image_url: "javascript:alert(1)", href: "", metadata: {} }] })), "");
});
