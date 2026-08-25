# Scripts de Build Android – PeloNaRoupa
# Requisitos: Node.js, pnpm, JDK 17+, Android SDK (sdkmanager, gradlew)

param(
    [ValidateSet("apk", "aab")]
    [string]$Target = "apk",
    [switch]$Release = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🐾 PeloNaRoupa – Android Build" -ForegroundColor Cyan
Write-Host "Target: $Target | Mode: $(if ($Release) { 'Release' } else { 'Debug' })"

# 1. Build web assets
Write-Host "`n📦 Step 1/3: Building web assets..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) { Write-Error "Web build failed"; exit 1 }

# 2. Sync Capacitor
Write-Host "`n🔄 Step 2/3: Syncing Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Error "Capacitor sync failed"; exit 1 }

# 3. Gradle build
Write-Host "`n🔨 Step 3/3: Running Gradle..." -ForegroundColor Yellow
$GradleTask = if ($Target -eq "aab") {
    if ($Release) { "bundleRelease" } else { "bundleDebug" }
} else {
    if ($Release) { "assembleRelease" } else { "assembleDebug" }
}

Push-Location android
try {
    .\gradlew $GradleTask
    if ($LASTEXITCODE -ne 0) { Write-Error "Gradle build failed"; exit 1 }
} finally {
    Pop-Location
}

# 4. Locate output
$OutputDir = if ($Target -eq "aab") {
    "android\app\build\outputs\bundle\$(if ($Release) { 'release' } else { 'debug' })"
} else {
    "android\app\build\outputs\apk\$(if ($Release) { 'release' } else { 'debug' })"
}

Write-Host "`n✅ Build complete!" -ForegroundColor Green
Write-Host "📂 Output: $OutputDir"

$files = Get-ChildItem -Path $OutputDir -Filter "*.$Target" -ErrorAction SilentlyContinue
if ($files) {
    $files | ForEach-Object { Write-Host "  → $($_.Name) ($([math]::Round($_.Length / 1MB, 1)) MB)" }
} else {
    Write-Warning "No output file found in $OutputDir"
}
