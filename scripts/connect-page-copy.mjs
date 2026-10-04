// One-time, mechanical JSX binding pass for the existing public templates.
// Run from the repository root. Backend collect_page_copy discovers the
// rendered fields, including those in dynamic lists, without changing layouts.
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const roots = ["src/app/about", "src/app/membership", "src/app/training", "src/app/events", "src/app/news", "src/app/services", "src/app/knowledge", "src/app/contact", "src/app/media", "src/components/about", "src/components/cards"];
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : entry.name.endsWith(".tsx") ? [path.join(dir, entry.name)] : []);
}
for (const file of roots.flatMap(files)) {
  if (file.includes(path.join("membership", "apply")) || file.endsWith("layout.tsx")) continue;
  const source = fs.readFileSync(file, "utf8");
  if (source.includes('import { EditableCopy }')) continue;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const changes = [];
  function visit(node) {
    if (ts.isJsxElement(node)) {
      const name = node.openingElement.tagName.getText(tree);
      if (["p", "h2", "h3", "h4", "Link", "Button"].includes(name) && !node.openingElement.getText(tree).includes("aria-hidden")) {
        const children = node.children.filter((child) => !ts.isJsxText(child) || child.text.trim());
        if (children.length === 1) {
          const child = children[0];
          let fallback;
          if (ts.isJsxText(child)) {
            const value = child.text.replace(/\s+/g, " ").trim();
            if (value.length > 2 && !value.includes("&")) fallback = JSON.stringify(value);
          } else if (ts.isJsxExpression(child) && child.expression) {
            const expr = child.expression;
            const raw = expr.getText(tree);
            if ((ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr) || ts.isElementAccessExpression(expr)) && !/^(page\.|error|notice|number|index|form\.|member\.id)/.test(raw)) fallback = "String(" + raw + " ?? \"\")";
          }
          if (fallback) {
            const start = node.openingElement.end;
            const end = node.closingElement.getStart(tree);
            const label = name.startsWith("h") ? "Heading" : ["Link", "Button"].includes(name) ? "Link text" : "Text";
            changes.push({ start, end, text: '<EditableCopy label="' + label + '" fallback={' + fallback + '} />' });
            return;
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  if (!changes.length) continue;
  let output = source;
  for (const change of changes.sort((a, b) => b.start - a.start)) output = output.slice(0, change.start) + change.text + output.slice(change.end);
  const importLine = '\nimport { EditableCopy } from "@/components/cms/EditableCopy";\n';
  if (output.startsWith('"use client";')) output = output.replace('"use client";', '"use client";' + importLine);
  else output = importLine + output;
  fs.writeFileSync(file, output);
  process.stdout.write(file + ": " + changes.length + " content fields\n");
}
