#!/usr/bin/env bash
set -euo pipefail

REPO="az0512124155azz-sys/MeshForge"
API="https://api.github.com/repos/${REPO}/releases"
ARCH_RAW="$(uname -m)"

case "$ARCH_RAW" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64|amd64) ARCH="x64" ;;
  *)
    echo "MeshForge does not currently publish a macOS build for architecture: $ARCH_RAW" >&2
    exit 1
    ;;
esac

echo "Detecting latest MeshForge macOS ${ARCH} installer..."
URL="$(curl -fsSL "$API" \
  | grep -o '"browser_download_url":"[^"]*"' \
  | cut -d'"' -f4 \
  | grep -E "MeshForge-[0-9.]+-${ARCH}\\.dmg$" \
  | head -n 1 || true)"

if [[ -z "$URL" ]]; then
  echo "No MeshForge macOS ${ARCH} DMG is currently available in GitHub Releases." >&2
  exit 1
fi

TMP_DMG="$(mktemp -t meshforge).dmg"
MOUNT_POINT=""
cleanup() {
  if [[ -n "$MOUNT_POINT" ]]; then
    hdiutil detach "$MOUNT_POINT" -quiet >/dev/null 2>&1 || true
  fi
  rm -f "$TMP_DMG"
}
trap cleanup EXIT

echo "Downloading MeshForge..."
curl -fL "$URL" -o "$TMP_DMG"

echo "Mounting installer..."
ATTACH_OUTPUT="$(hdiutil attach "$TMP_DMG" -nobrowse)"
MOUNT_POINT="$(printf '%s\n' "$ATTACH_OUTPUT" | sed -n 's#^.*\(/Volumes/.*\)$#\1#p' | tail -n 1)"

if [[ -z "$MOUNT_POINT" ]]; then
  echo "Could not determine mounted DMG path." >&2
  exit 1
fi

APP_PATH="$(find "$MOUNT_POINT" -maxdepth 1 -name 'MeshForge.app' -print -quit)"
if [[ -z "$APP_PATH" ]]; then
  echo "MeshForge.app was not found inside the DMG." >&2
  exit 1
fi

echo "Installing MeshForge to /Applications..."
if [[ -w "/Applications" ]]; then
  rm -rf "/Applications/MeshForge.app"
  ditto "$APP_PATH" "/Applications/MeshForge.app"
else
  sudo rm -rf "/Applications/MeshForge.app"
  sudo ditto "$APP_PATH" "/Applications/MeshForge.app"
fi

echo "MeshForge was installed successfully in /Applications."
echo "Note: preview builds are not yet Apple-notarized, so macOS may require approval in Privacy & Security on first launch."
