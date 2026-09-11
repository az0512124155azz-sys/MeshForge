#!/usr/bin/env bash
set -euo pipefail

REPO="az0512124155azz-sys/MeshForge"
API="https://api.github.com/repos/${REPO}/releases"
ARCH_RAW="$(uname -m)"

case "$ARCH_RAW" in
  x86_64|amd64) ARCH="x64" ;;
  *)
    echo "MeshForge does not currently publish a Linux installer for architecture: $ARCH_RAW" >&2
    exit 1
    ;;
esac

release_urls() {
  curl -fsSL "$API" \
    | grep -o '"browser_download_url":"[^"]*"' \
    | cut -d'"' -f4
}

if command -v apt >/dev/null 2>&1 || command -v dpkg >/dev/null 2>&1; then
  echo "Debian/Ubuntu-style system detected. Looking for the latest .deb installer..."
  URL="$(release_urls | grep -E 'meshforge_[0-9.]+_amd64\.deb$' | head -n 1 || true)"
  if [[ -z "$URL" ]]; then
    echo "No MeshForge .deb installer is currently available in GitHub Releases." >&2
    exit 1
  fi

  TMP_DEB="$(mktemp --suffix=.deb)"
  trap 'rm -f "$TMP_DEB"' EXIT
  echo "Downloading MeshForge..."
  curl -fL "$URL" -o "$TMP_DEB"
  echo "Installing MeshForge..."
  sudo apt install -y "$TMP_DEB"
  echo "MeshForge was installed successfully. Launch it from your application menu or run: meshforge"
else
  echo "No apt/dpkg package manager detected. Installing the latest AppImage instead..."
  URL="$(release_urls | grep -E 'MeshForge-[0-9.]+\.AppImage$' | head -n 1 || true)"
  if [[ -z "$URL" ]]; then
    echo "No MeshForge AppImage is currently available in GitHub Releases." >&2
    exit 1
  fi

  INSTALL_DIR="${HOME}/.local/bin"
  TARGET="${INSTALL_DIR}/meshforge"
  mkdir -p "$INSTALL_DIR"
  echo "Downloading MeshForge to $TARGET..."
  curl -fL "$URL" -o "$TARGET"
  chmod +x "$TARGET"
  echo "MeshForge AppImage was installed successfully at $TARGET"
  echo "If ~/.local/bin is not on PATH, launch it with: $TARGET"
fi
