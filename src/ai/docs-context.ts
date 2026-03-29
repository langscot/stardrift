import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DOCS_DIR = join(import.meta.dirname, "../../docs/docs");

function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectMarkdownFiles(full));
    } else if (entry.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---[\s\S]*?---\n*/m, "");
}

function loadDocs(): string {
  const files = collectMarkdownFiles(DOCS_DIR);
  return files
    .map((f) => {
      const rel = relative(DOCS_DIR, f).replace(/\\/g, "/");
      const content = stripFrontmatter(readFileSync(f, "utf-8")).trim();
      return `=== ${rel} ===\n${content}`;
    })
    .join("\n\n");
}

export const docsContext = loadDocs();
