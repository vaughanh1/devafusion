#!/usr/bin/env node
// Downloads the official gitleaks release binary for the current OS/arch,
// verifies its SHA256 checksum against the values published by
// gitleaks/gitleaks on GitHub, and prints the absolute path to the
// executable on stdout. All diagnostic output goes to stderr so callers can
// safely capture stdout as the binary path (see .husky/pre-commit).
//
// Source of truth: https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1
// Checksums copied verbatim from gitleaks_8.30.1_checksums.txt.

import { createHash } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  chmodSync,
} from "node:fs";
import { get } from "node:https";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GITLEAKS_VERSION = "8.30.1";

const RELEASES = {
  "darwin-arm64": {
    asset: `gitleaks_${GITLEAKS_VERSION}_darwin_arm64.tar.gz`,
    sha256: "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5",
  },
  "darwin-x64": {
    asset: `gitleaks_${GITLEAKS_VERSION}_darwin_x64.tar.gz`,
    sha256: "dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709",
  },
  "linux-arm64": {
    asset: `gitleaks_${GITLEAKS_VERSION}_linux_arm64.tar.gz`,
    sha256: "e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080",
  },
  "linux-x64": {
    asset: `gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz`,
    sha256: "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb",
  },
  "win32-arm64": {
    asset: `gitleaks_${GITLEAKS_VERSION}_windows_arm64.zip`,
    sha256: "b95f5e4f5c425cedca7ee203d9afd29597e692c4924a12ed42f970537c72cc0f",
  },
  "win32-x64": {
    asset: `gitleaks_${GITLEAKS_VERSION}_windows_x64.zip`,
    sha256: "d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e",
  },
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(
  REPO_ROOT,
  ".tools",
  "gitleaks",
  GITLEAKS_VERSION,
);
const BIN_NAME = process.platform === "win32" ? "gitleaks.exe" : "gitleaks";
const BIN_PATH = path.join(CACHE_DIR, BIN_NAME);

function log(message) {
  process.stderr.write(`[ensure-gitleaks] ${message}\n`);
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function downloadToFile(url, destPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error(`Too many redirects downloading ${url}`));
      return;
    }

    const request = get(
      url,
      { headers: { "User-Agent": "devafusion-gitleaks-installer" } },
      (response) => {
        const { statusCode, headers } = response;

        if (
          statusCode &&
          statusCode >= 300 &&
          statusCode < 400 &&
          headers.location
        ) {
          response.resume();
          downloadToFile(headers.location, destPath, redirectCount + 1).then(
            resolve,
            reject,
          );
          return;
        }

        if (statusCode !== 200) {
          reject(new Error(`HTTP ${statusCode} downloading ${url}`));
          return;
        }

        const fileStream = createWriteStream(destPath);
        response.pipe(fileStream);
        fileStream.on("finish", () => fileStream.close(() => resolve()));
        fileStream.on("error", reject);
      },
    );

    request.on("error", reject);
  });
}

async function ensureGitleaks() {
  if (existsSync(BIN_PATH)) {
    return BIN_PATH;
  }

  const key = `${process.platform}-${process.arch}`;
  const release = RELEASES[key];

  if (!release) {
    throw new Error(
      `No published gitleaks v${GITLEAKS_VERSION} release for platform "${key}". ` +
        "See https://github.com/gitleaks/gitleaks/releases for supported targets.",
    );
  }

  mkdirSync(CACHE_DIR, { recursive: true });

  const archivePath = path.join(CACHE_DIR, release.asset);
  const downloadUrl = `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${release.asset}`;

  log(`Downloading ${downloadUrl}`);
  await downloadToFile(downloadUrl, archivePath);

  const actualSha256 = sha256File(archivePath);
  if (actualSha256 !== release.sha256) {
    throw new Error(
      `Checksum mismatch for ${release.asset}. ` +
        `Expected ${release.sha256}, got ${actualSha256}. Refusing to run an unverified binary.`,
    );
  }
  log(`Checksum verified for ${release.asset}`);

  log(`Extracting ${release.asset}`);
  execFileSync("tar", ["-xf", archivePath, "-C", CACHE_DIR], {
    stdio: ["ignore", "ignore", "inherit"],
  });

  if (process.platform !== "win32") {
    chmodSync(BIN_PATH, 0o755);
  }

  if (!existsSync(BIN_PATH)) {
    throw new Error(
      `Extraction of ${release.asset} did not produce ${BIN_PATH}`,
    );
  }

  return BIN_PATH;
}

ensureGitleaks()
  .then((binPath) => {
    process.stdout.write(`${binPath}\n`);
  })
  .catch((error) => {
    log(error.message);
    process.exitCode = 1;
  });
