#!/usr/bin/env node
/**
 * Build script for Agentbase plugins.
 *
 * Usage:
 *   ts-node scripts/build-plugin.ts <slug>          # build one plugin
 *   ts-node scripts/build-plugin.ts --all           # build every plugin in official/
 *
 * For each plugin this script:
 *   1. Reads and validates manifest.json against the same Ajv schema used by
 *      the marketplace scanning service.
 *   2. Compiles TypeScript → JS (ES2020 / CommonJS) via a per-plugin tsconfig.
 *   3. Packages the compiled output + manifest.json into
 *      packages/plugins/dist/<slug>-<version>.zip
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import Ajv from "ajv";
import AdmZip from "adm-zip";

// ─── Manifest schema (mirrors scanning.service.ts in marketplace) ─────────────

const MANIFEST_SCHEMA = {
  type: "object",
  required: ["name", "version", "description", "entryPoint"],
  properties: {
    name: { type: "string", minLength: 1 },
    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+" },
    description: { type: "string", minLength: 1 },
    entryPoint: { type: "string", minLength: 1 },
    agentbaseVersion: { type: "string" },
    author: { type: "string" },
    permissions: { type: "array", items: { type: "string" } },
    peerDependencies: {
      type: "object",
      additionalProperties: { type: "string" },
    },
  },
  additionalProperties: true,
} as const;

const ajv = new Ajv();
const validateManifest = ajv.compile(MANIFEST_SCHEMA);

// ─── Paths ────────────────────────────────────────────────────────────────────

const PLUGINS_ROOT = path.resolve(__dirname, "..");
const OFFICIAL_DIR = path.join(PLUGINS_ROOT, "official");
const DIST_DIR = path.join(PLUGINS_ROOT, "dist");

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface PluginManifest {
  name: string;
  version: string;
  description: string;
  entryPoint: string;
  [key: string]: unknown;
}

function readManifest(pluginDir: string): PluginManifest {
  const manifestPath = path.join(pluginDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found in ${pluginDir}`);
  }
  const raw = fs.readFileSync(manifestPath, "utf-8");
  return JSON.parse(raw) as PluginManifest;
}

function validateManifestOrThrow(
  manifest: PluginManifest,
  pluginDir: string,
): void {
  const valid = validateManifest(manifest);
  if (!valid) {
    const errors = (validateManifest.errors ?? [])
      .map(
        (e) =>
          `  - ${e.instancePath || "(root)"}: ${e.message ?? "unknown error"}`,
      )
      .join("\n");
    throw new Error(
      `manifest.json in ${pluginDir} failed validation:\n${errors}`,
    );
  }
}

function compilePlugin(pluginDir: string, slug: string): void {
  // Generate a transient tsconfig that sets correct rootDir/outDir
  const tsconfigPath = path.join(pluginDir, "tsconfig.build.json");
  const tsconfig = {
    extends: "./tsconfig.json",
    compilerOptions: {
      target: "ES2020",
      module: "commonjs",
      outDir: "./dist",
      rootDir: "./src",
      noEmit: false,
      declaration: false,
      sourceMap: false,
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist", "__tests__"],
  };

  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  try {
    // Resolve tsc relative to the plugin's own node_modules then fall back to
    // the workspace root node_modules so this works in both monorepo and CI.
    const tscBin =
      path.join(pluginDir, "node_modules", ".bin", "tsc") +
      (process.platform === "win32" ? ".cmd" : "");
    const fallbackTsc =
      path.join(PLUGINS_ROOT, "..", "..", "node_modules", ".bin", "tsc") +
      (process.platform === "win32" ? ".cmd" : "");
    const tsc = fs.existsSync(tscBin) ? tscBin : fallbackTsc;

    console.log(`  [tsc] Compiling ${slug}…`);
    execSync(`"${tsc}" --project "${tsconfigPath}"`, {
      cwd: pluginDir,
      stdio: "inherit",
    });
  } finally {
    // Always remove the transient config regardless of success/failure
    fs.rmSync(tsconfigPath, { force: true });
  }
}

function buildZip(pluginDir: string, slug: string, version: string): string {
  const compiledDir = path.join(pluginDir, "dist");
  if (!fs.existsSync(compiledDir)) {
    throw new Error(
      `Compiled output directory not found at ${compiledDir}. Did tsc succeed?`,
    );
  }

  fs.mkdirSync(DIST_DIR, { recursive: true });

  const zipName = `${slug}-${version}.zip`;
  const zipPath = path.join(DIST_DIR, zipName);

  const zip = new AdmZip();

  // Add manifest.json
  zip.addLocalFile(path.join(pluginDir, "manifest.json"));

  // Recursively add all files from dist/
  addDirectoryToZip(zip, compiledDir, "");

  zip.writeZip(zipPath);
  return zipPath;
}

function addDirectoryToZip(zip: AdmZip, dir: string, zipPrefix: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      addDirectoryToZip(zip, fullPath, zipPath);
    } else {
      zip.addFile(zipPath, fs.readFileSync(fullPath));
    }
  }
}

// ─── Core build function ──────────────────────────────────────────────────────

function buildPlugin(slug: string): void {
  const pluginDir = path.join(OFFICIAL_DIR, slug);

  if (!fs.existsSync(pluginDir)) {
    throw new Error(`Plugin directory not found: ${pluginDir}`);
  }

  console.log(`\nBuilding plugin: ${slug}`);

  const manifest = readManifest(pluginDir);
  validateManifestOrThrow(manifest, pluginDir);
  console.log(`  [manifest] Valid — ${manifest.name}@${manifest.version}`);

  compilePlugin(pluginDir, slug);
  console.log(`  [tsc] Compiled successfully`);

  const zipPath = buildZip(pluginDir, slug, manifest.version);
  console.log(`  [zip] Created: ${path.relative(process.cwd(), zipPath)}`);
}

function buildAll(): void {
  if (!fs.existsSync(OFFICIAL_DIR)) {
    console.warn(`No official/ directory found at ${OFFICIAL_DIR}`);
    return;
  }

  const slugs = fs
    .readdirSync(OFFICIAL_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (slugs.length === 0) {
    console.warn("No plugins found in official/ — nothing to build.");
    return;
  }

  const failed: string[] = [];
  for (const slug of slugs) {
    try {
      buildPlugin(slug);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [FAILED] ${slug}: ${message}`);
      failed.push(slug);
    }
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`Built ${slugs.length - failed.length}/${slugs.length} plugins.`);
  if (failed.length > 0) {
    console.error(`Failed: ${failed.join(", ")}`);
    process.exit(1);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const [, , ...args] = process.argv;

if (args.length === 0) {
  console.error("Usage: build-plugin.ts <slug> | --all");
  process.exit(1);
}

if (args[0] === "--all") {
  buildAll();
} else {
  const slug = args[0];
  try {
    buildPlugin(slug);
  } catch (err: unknown) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
