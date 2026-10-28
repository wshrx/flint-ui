#!/usr/bin/env bash
#
# Build the release assets: one self-contained CLI binary per platform and the
# two npm-style tarballs. Runs in CI on a tag, can also run locally.
#
#   bash scripts/build-release.sh
#
# Output: dist/release/ with flint-ui-<os>-<arch>[.exe], the .tgz files and
# SHA256SUMS.

set -euo pipefail

root=$(git rev-parse --show-toplevel)
cd "$root"

version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' packages/cli/package.json | head -1)
out="$root/dist/release"
rm -rf "$out"
mkdir -p "$out"

bun run --cwd packages/flint build
bun run --cwd packages/cli build

for target in bun-linux-x64 bun-linux-arm64 bun-darwin-x64 bun-darwin-arm64 bun-windows-x64; do
  rest=${target#bun-}
  os=${rest%%-*}
  arch=${rest##*-}
  ext=""
  [ "$os" = "windows" ] && ext=".exe"

  bun build --compile --minify --target="$target" \
    --define "process.env.FLINT_VERSION=\"$version\"" \
    packages/cli/src/index.ts \
    --outfile "$out/flint-ui-$os-$arch$ext"
  echo "built flint-ui-$os-$arch$ext"
done

# A small bundle for anyone who already has Bun: same CLI, no 100 MB download.
bun build --target=bun --minify \
  --define "process.env.FLINT_VERSION=\"$version\"" \
  packages/cli/src/index.ts \
  --outfile "$out/flint-ui.mjs"
echo "built flint-ui.mjs"

# `bun pm pack` names scoped packages without the scope: @flint-ui/react becomes
# flint-ui-react-0.1.0.tgz, which is exactly the filename npm expects.
# The tarballs must carry the license: MIT asks for the notice, OFL for the font
# text. Both live at the repository root, so they are copied in for the pack and
# removed after it.
cleanup() { rm -f packages/flint/LICENSE packages/flint/NOTICE packages/cli/LICENSE; }
trap cleanup EXIT
cp LICENSE packages/flint/LICENSE
cp NOTICE packages/flint/NOTICE
cp LICENSE packages/cli/LICENSE

(cd packages/flint && bun pm pack --destination "$out")
(cd packages/cli && bun pm pack --destination "$out")
cleanup
trap - EXIT

(cd "$out" && sha256sum ./* > SHA256SUMS)

ls -lh "$out"
