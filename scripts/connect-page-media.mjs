// Mechanical replacement of existing Next image/link imports with CMS-bound
// equivalents. Both preserve the original component props and styling.
import fs from "node:fs";
import path from "node:path";
const roots = ["src/app/about", "src/app/membership", "src/app/training", "src/app/events", "src/app/news", "src/app/services", "src/app/knowledge", "src/app/contact", "src/app/media", "src/components/about", "src/components/cards"];
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : entry.name.endsWith(".tsx") ? [path.join(dir, entry.name)] : []); }
for (const file of roots.flatMap(files)) {
  if (file.includes(path.join("membership", "apply")) || file.endsWith("layout.tsx")) continue;
  const source = fs.readFileSync(file, "utf8");
  const next = source.replace('import Image from "next/image";', 'import { EditableImage as Image } from "@/components/cms/EditableCopy";').replace('import Link from "next/link";', 'import { EditableLink as Link } from "@/components/cms/EditableCopy";');
  if (source !== next) fs.writeFileSync(file, next);
}
