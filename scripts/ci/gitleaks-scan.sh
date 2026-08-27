#!/usr/bin/env bash
# Downloads the official gitleaks release binary (Linux x64), verifies its
# SHA256 checksum against the value published by gitleaks/gitleaks on
# GitHub, then scans the full repository history for secrets.
#
# Source of truth: https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1
# Checksum copied verbatim from gitleaks_8.30.1_checksums.txt.
#
# Kept in sync with scripts/ensure-gitleaks.mjs (same pinned version).

set -euo pipefail

GITLEAKS_VERSION="8.30.1"
ASSET="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
EXPECTED_SHA256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
DOWNLOAD_URL="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${ASSET}"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "Downloading ${DOWNLOAD_URL}"
curl -sSfL "$DOWNLOAD_URL" -o "${WORK_DIR}/${ASSET}"

ACTUAL_SHA256="$(sha256sum "${WORK_DIR}/${ASSET}" | awk '{print $1}')"
if [ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]; then
  echo "Checksum mismatch for ${ASSET}. Expected ${EXPECTED_SHA256}, got ${ACTUAL_SHA256}." >&2
  exit 1
fi
echo "Checksum verified for ${ASSET}"

tar -xf "${WORK_DIR}/${ASSET}" -C "$WORK_DIR"
chmod +x "${WORK_DIR}/gitleaks"

"${WORK_DIR}/gitleaks" detect \
  --source="$(pwd)" \
  --config="$(pwd)/.gitleaks.toml" \
  --redact \
  --no-banner
