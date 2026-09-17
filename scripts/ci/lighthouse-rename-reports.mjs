#!/usr/bin/env node
// Copies lhci's representative-run HTML reports into a folder of
// friendly, page-identifiable filenames, so PublishHtmlReport@1
// (blakyaks.azure-pipeline-html-reports, pipelines/ci/web.yml's
// LighthouseCI job) shows readable tab names ("home", "projects", "log")
// instead of lhci's default lhr-<timestamp>.html files - with 3 pages x
// 3 runs each, the raw .lighthouseci/ folder has 9 timestamped files
// that don't say which page or run they belong to.
//
// Reads lhci's own filesystem-upload manifest.json (written because
// .lighthouserc.js's ci.upload.target is "filesystem"); only the
// isRepresentativeRun entry per URL is copied - that's the same
// median-of-numberOfRuns run lhci's own categories:* assertions gate on,
// so the published tab matches what the merge-blocking check evaluated,
// not an arbitrary one of the 3 runs per page.

import { readFileSync, copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { manifest: null, outDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--manifest") args.manifest = argv[++i];
    else if (argv[i] === "--out-dir") args.outDir = argv[++i];
  }
  if (!args.manifest || !args.outDir) {
    throw new Error("Usage: lighthouse-rename-reports.mjs --manifest <path> --out-dir <path>");
  }
  return args;
}

function friendlyNameForUrl(rawUrl) {
  const { pathname } = new URL(rawUrl);
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "home" : trimmed.replace(/\//g, "-");
}

function main() {
  const { manifest: manifestPath, outDir } = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const representative = manifest.filter((entry) => entry.isRepresentativeRun);

  mkdirSync(outDir, { recursive: true });

  for (const entry of representative) {
    const destination = path.join(outDir, `${friendlyNameForUrl(entry.url)}.html`);
    copyFileSync(entry.htmlPath, destination);
    process.stdout.write(`Copied ${entry.htmlPath} -> ${destination}\n`);
  }

  if (representative.length === 0) {
    process.stdout.write("No representative runs found in manifest - nothing copied.\n");
  }
}

main();
