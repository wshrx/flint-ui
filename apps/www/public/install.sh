#!/bin/sh
# Install the flint-ui CLI from GitHub Releases.
#
#   curl -fsSL https://wshrx.github.io/flint-ui/install.sh | sh
#
# Environment:
#   FLINT_VERSION    pin a release, e.g. 0.1.0 or v0.1.0 (default: latest)
#   FLINT_BIN_DIR    where the binary goes (default: ~/.local/bin)
#
# No npm, no Node: the CLI is a single self-contained binary.

set -eu

repo="wshrx/flint-ui"
version="${FLINT_VERSION:-latest}"
bin_dir="${FLINT_BIN_DIR:-$HOME/.local/bin}"

case "$version" in
  latest) base="https://github.com/$repo/releases/latest/download" ;;
  v*) base="https://github.com/$repo/releases/download/$version" ;;
  *) base="https://github.com/$repo/releases/download/v$version" ;;
esac

os=$(uname -s)
case "$os" in
  Linux) os=linux ;;
  Darwin) os=darwin ;;
  *) echo "flint-ui: unsupported system $os (linux and macOS only)" >&2; exit 1 ;;
esac

arch=$(uname -m)
case "$arch" in
  x86_64 | amd64) arch=x64 ;;
  arm64 | aarch64) arch=arm64 ;;
  *) echo "flint-ui: unsupported architecture $arch" >&2; exit 1 ;;
esac

asset="flint-ui-$os-$arch"
url="$base/$asset"

echo "flint-ui: downloading $asset ($version)"
mkdir -p "$bin_dir"

tmp="$bin_dir/.flint-ui.$$"
trap 'rm -f "$tmp"' EXIT INT TERM

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$url" -o "$tmp"
else
  wget -qO "$tmp" "$url"
fi
chmod +x "$tmp"
mv "$tmp" "$bin_dir/flint-ui"
trap - EXIT INT TERM

echo "flint-ui: installed $("$bin_dir/flint-ui" --version) at $bin_dir/flint-ui"

case ":$PATH:" in
  *":$bin_dir:"*) ;;
  *) echo "flint-ui: add $bin_dir to PATH, e.g. export PATH=\"$bin_dir:\$PATH\"" ;;
esac
