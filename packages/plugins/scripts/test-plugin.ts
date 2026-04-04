#!/usr/bin/env node
/**
 * Plugin test runner.
 *
 * Usage:
 *   ts-node scripts/test-plugin.ts <slug>    # run Jest for one plugin
 *   ts-node scripts/test-plugin.ts --all     # run Jest for all plugins in official/
 *
 * Jest is resolved from the individual plugin's node_modules first, then the
 * workspace root — so this works whether or not the plugin has been bootstrapped.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const OFFICIAL_DIR = path.resolve(__dirname, "..", "official");
const CMD_SUFFIX = process.platform === "win32" ? ".cmd" : "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveJest(pluginDir: string): string {
  const local = path.join(
    pluginDir,
    "node_modules",
    ".bin",
    `jest${CMD_SUFFIX}`,
  );
  if (fs.existsSync(local)) return local;

  // Walk up to workspace root node_modules
  const root = path.resolve(
    OFFICIAL_DIR,
    "..",
    "..",
    "..",
    "node_modules",
    ".bin",
    `jest${CMD_SUFFIX}`,
  );
  if (fs.existsSync(root)) return root;

  // Last resort: rely on PATH
  return `jest${CMD_SUFFIX}`;
}

function testPlugin(slug: string): void {
  const pluginDir = path.join(OFFICIAL_DIR, slug);

  if (!fs.existsSync(pluginDir)) {
    throw new Error(`Plugin directory not found: ${pluginDir}`);
  }

  console.log(`\nTesting plugin: ${slug}`);
  const jest = resolveJest(pluginDir);

  execSync(`"${jest}" --passWithNoTests --coverage`, {
    cwd: pluginDir,
    stdio: "inherit",
  });
}

function testAll(): void {
  if (!fs.existsSync(OFFICIAL_DIR)) {
    console.warn(`No official/ directory found at ${OFFICIAL_DIR}`);
    return;
  }

  const slugs = fs
    .readdirSync(OFFICIAL_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (slugs.length === 0) {
    console.warn("No plugins found in official/ — nothing to test.");
    return;
  }

  const failed: string[] = [];
  for (const slug of slugs) {
    try {
      testPlugin(slug);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [FAILED] ${slug}: ${message}`);
      failed.push(slug);
    }
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(
    `Tested ${slugs.length - failed.length}/${slugs.length} plugins.`,
  );
  if (failed.length > 0) {
    console.error(`Failed: ${failed.join(", ")}`);
    process.exit(1);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const [, , arg] = process.argv;

if (!arg) {
  console.error("Usage: test-plugin.ts <slug> | --all");
  process.exit(1);
}

if (arg === "--all") {
  testAll();
} else {
  try {
    testPlugin(arg);
  } catch (err: unknown) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
