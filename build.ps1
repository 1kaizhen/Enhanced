$ErrorActionPreference = 'Stop'

# Read version from manifest.json so the zip name stays in sync.
$manifest = Get-Content -Raw -Path 'manifest.json' | ConvertFrom-Json
$version = $manifest.version
$out = "dist\orbit-$version.zip"

New-Item -ItemType Directory -Force -Path dist | Out-Null
if (Test-Path $out) { Remove-Item $out }

$include = @(
  'manifest.json',
  'newtab.html',
  'app.js',
  'background.js',
  'media-content.js',
  'style.css',
  'icons',
  'vendor'
)

# Verify every input exists before zipping so we never ship a partial bundle.
foreach ($p in $include) {
  if (-not (Test-Path $p)) { throw "Missing required path: $p" }
}

Compress-Archive -Path $include -DestinationPath $out -Force
$size = (Get-Item $out).Length
Write-Host "Built $out  ($([math]::Round($size/1KB,1)) KB)"
