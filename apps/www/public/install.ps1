# Install the flint-ui CLI on Windows.
#
#   irm https://wshrx.github.io/flint-ui/install.ps1 | iex
#
# Environment:
#   FLINT_VERSION   pin a release, e.g. 0.1.0 or v0.1.0 (default: latest)
#   FLINT_BIN_DIR   where the exe goes (default: %LOCALAPPDATA%\flint)
#
# No npm, no Node: the CLI is a single self-contained binary.

$ErrorActionPreference = "Stop"

$repo = "wshrx/flint-ui"
$version = if ($env:FLINT_VERSION) { $env:FLINT_VERSION.TrimStart("v") } else { $null }
$base = if ($version) {
  "https://github.com/$repo/releases/download/v$version"
} else {
  "https://github.com/$repo/releases/latest/download"
}
$dir = if ($env:FLINT_BIN_DIR) { $env:FLINT_BIN_DIR } else { Join-Path $env:LOCALAPPDATA "flint" }
$label = if ($version) { $version } else { "latest" }

New-Item -ItemType Directory -Force -Path $dir | Out-Null
$exe = Join-Path $dir "flint-ui.exe"

Write-Host "flint-ui: downloading flint-ui-windows-x64.exe ($label)"
Invoke-WebRequest -Uri "$base/flint-ui-windows-x64.exe" -OutFile $exe -UseBasicParsing

$reported = & $exe --version
Write-Host "flint-ui: installed $reported at $exe"

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$dir*") {
  Write-Host "flint-ui: $dir is not on PATH yet."
  Write-Host "  Add it under Settings > System > Environment Variables, then reopen the terminal."
}
