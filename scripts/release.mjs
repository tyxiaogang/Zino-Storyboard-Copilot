#!/usr/bin/env node

import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const VALID_BUMPS = new Set(["major", "minor", "patch"]);
const VERSION_PATTERN =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, options = {}) {
  return execSync(command, { stdio: "pipe", encoding: "utf8", ...options }).trim();
}

function runStreaming(command, args = []) {
  execFileSync(command, args, { stdio: "inherit" });
}

function resolveRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function parseVersion(version) {
  const [core] = version.split("-", 1);
  const parts = core.split(".");
  if (parts.length !== 3) {
    fail(`Invalid current version in package.json: ${version}`);
  }
  const [major, minor, patch] = parts.map((item) => Number(item));
  if ([major, minor, patch].some((item) => Number.isNaN(item))) {
    fail(`Invalid numeric version in package.json: ${version}`);
  }
  return { major, minor, patch };
}

function bumpVersion(currentVersion, bumpType) {
  const parsed = parseVersion(currentVersion);
  if (bumpType === "major") {
    return `${parsed.major + 1}.0.0`;
  }
  if (bumpType === "minor") {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

function buildReleaseNotes(rawNotes, tag) {
  const trimmed = rawNotes.trim();
  if (!trimmed) {
    return `Release ${tag}`;
  }
  return trimmed;
}

const repoRoot = resolveRepoRoot();
process.chdir(repoRoot);

const args = process.argv.slice(2);
const versionArg = args[0];

if (!versionArg) {
  fail(
    "Usage: npm run release -- <patch|minor|major|x.y.z> [release notes]\nExample: npm run release -- patch \"修复导出崩溃\"",
  );
}

const status = run("git status --porcelain");
if (status) {
  fail("Working tree is not clean. Please commit or stash changes before release.");
}

const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const currentVersion = packageJson.version;

const nextVersion = VALID_BUMPS.has(versionArg)
  ? bumpVersion(currentVersion, versionArg)
  : versionArg;

if (!VERSION_PATTERN.test(nextVersion)) {
  fail(`Invalid target version: ${nextVersion}`);
}

if (nextVersion === currentVersion) {
  fail(`Target version equals current version (${currentVersion}).`);
}

const branch = run("git rev-parse --abbrev-ref HEAD");
if (!branch || branch === "HEAD") {
  fail("Detached HEAD is not supported for release. Please checkout a branch first.");
}

const tag = `v${nextVersion}`;
const rawNotes = args.slice(1).join(" ");
const notes = buildReleaseNotes(rawNotes, tag);

try {
  run(`git rev-parse -q --verify refs/tags/${tag}`);
  fail(`Tag ${tag} already exists.`);
} catch {
  // expected when tag does not exist
}

runStreaming(process.execPath, ["scripts/sync-version.mjs", nextVersion]);

runStreaming("git", [
  "add",
  "package.json",
  "package-lock.json",
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.conf.json",
]);
runStreaming("git", ["commit", "-m", `chore(release): ${tag}`]);
runStreaming("git", ["tag", "-a", tag, "-m", notes]);
runStreaming("git", ["push", "origin", branch]);
runStreaming("git", ["push", "origin", tag]);

console.log(`Release triggered: ${tag}`);
console.log("GitHub Actions will build artifacts and publish the Release automatically.");
