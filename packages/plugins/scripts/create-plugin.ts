#!/usr/bin/env node
/**
 * Plugin scaffold script.
 *
 * Usage:
 *   ts-node scripts/create-plugin.ts <slug>
 *
 * Copies `packages/plugins/template/` → `packages/plugins/official/<slug>/`
 * and replaces all {{PLUGIN_NAME}}, {{PLUGIN_SLUG}}, {{PLUGIN_VERSION}}
 * template variables in every file.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const TEMPLATE_DIR = path.resolve(__dirname, "..", "template");
const OFFICIAL_DIR = path.resolve(__dirname, "..", "official");

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

// ─── Entry point ──────────────────────────────────────────────────────────────

const [, , slug] = process.argv;

if (!slug) {
  console.error("Usage: create-plugin.ts <slug>");
  console.error("Example: create-plugin.ts my-awesome-plugin");
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error(
    "Slug must be lowercase alphanumeric with hyphens, starting with a letter.",
  );
  process.exit(1);
}

const destDir = path.join(OFFICIAL_DIR, slug);

if (fs.existsSync(destDir)) {
  console.error(`Plugin directory already exists: ${destDir}`);
  process.exit(1);
}

// Derive display name: "my-plugin" → "My Plugin"
const displayName = slug
  .split("-")
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  .join(" ");

const VERSION = "1.0.0";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".zip",
  ".gz",
  ".tar",
]);

function substituteVars(content: string): string {
  return content
    .replaceAll("{{PLUGIN_NAME}}", displayName)
    .replaceAll("{{PLUGIN_SLUG}}", slug)
    .replaceAll("{{PLUGIN_VERSION}}", VERSION);
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) {
        fs.copyFileSync(srcPath, destPath);
      } else {
        const content = substituteVars(fs.readFileSync(srcPath, "utf-8"));
        fs.writeFileSync(destPath, content, "utf-8");
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(OFFICIAL_DIR, { recursive: true });
copyDir(TEMPLATE_DIR, destDir);

// Patch the copied package.json: name, version, description, remove private flag
const pkgPath = path.join(destDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<
  string,
  unknown
>;
pkg["name"] = `@agentbase/plugin-${slug}`;
pkg["version"] = VERSION;
pkg["description"] = `${displayName} plugin for Agentbase`;
delete pkg["private"];
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");

console.log(`\nPlugin scaffolded successfully.`);
console.log(`  Directory: packages/plugins/official/${slug}/`);
console.log(`  Package:   @agentbase/plugin-${slug}`);
console.log(`  Name:      ${displayName}`);
console.log(`  Version:   ${VERSION}`);
console.log(`\nNext steps:`);
console.log(
  `  1. Edit packages/plugins/official/${slug}/src/index.ts — implement your plugin`,
);
console.log(
  `  2. Edit packages/plugins/official/${slug}/manifest.json — update description`,
);
console.log(`  3. pnpm run plugin:test ${slug}  — run unit tests`);
console.log(`  4. pnpm run plugin:build ${slug} — compile + package ZIP`);
