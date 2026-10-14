$ErrorActionPreference = 'Stop'
$env:EXPO_PUBLIC_DEMO_MODE = 'true'
try {
  npx expo export --platform web --output-dir dist --clear
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Remove-Item Env:EXPO_PUBLIC_DEMO_MODE -ErrorAction SilentlyContinue
}
