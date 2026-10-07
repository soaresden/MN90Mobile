# Compile l'APK Wear OS « MN90 Montre » (sans Android Studio) et peut publier la release GitHub.
#   powershell -ExecutionPolicy Bypass -File tools\build-wear.ps1                    -> version actuelle de wear\app\build.gradle
#   powershell -ExecutionPolicy Bypass -File tools\build-wear.ps1 -Version 1.0.1     -> passe en 1.0.1 (versionCode + 1)
#   powershell -ExecutionPolicy Bypass -File tools\build-wear.ps1 -Publish           -> puis crée la release wear-vX.Y.Z avec l'APK
# Outils attendus : JDK 17, Gradle 8.11.1 dans C:\Android\gradle-8.11.1, SDK dans C:\Android\sdk (android-35).
# Clé de signature : wear\keystore\mn90wear.jks + keystore.properties (non commités, à sauvegarder : sans elle,
# impossible de mettre à jour l'appli déjà installée sur la montre).
param([string]$Version = '', [switch]$Publish)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$gradleFile = Join-Path $root 'wear\app\build.gradle'
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path (Join-Path $root 'wear\keystore\keystore.properties'))) { throw 'Clé de signature absente : wear\keystore\keystore.properties' }

$g = [IO.File]::ReadAllText($gradleFile)
if ($Version) {
  $code = [int]([regex]::Match($g, 'versionCode\s+(\d+)').Groups[1].Value) + 1
  $g = $g -replace 'versionCode\s+\d+', "versionCode $code" -replace "versionName\s+'[^']*'", "versionName '$Version'"
  [IO.File]::WriteAllText($gradleFile, $g, $utf8)
}
$Version = [regex]::Match($g, "versionName\s+'([^']+)'").Groups[1].Value
Write-Host "MN90 Montre $Version"

$jdk = Get-ChildItem 'C:\Program Files\Microsoft' -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($jdk) { $env:JAVA_HOME = $jdk.FullName; $env:Path = "$($jdk.FullName)\bin;$env:Path" }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = 'C:\Android\sdk' }
[IO.File]::WriteAllText((Join-Path $root 'wear\local.properties'), "sdk.dir=$($env:ANDROID_HOME -replace '\\', '/')`n", $utf8)

& 'C:\Android\gradle-8.11.1\bin\gradle.bat' -p (Join-Path $root 'wear') assembleRelease --no-daemon --console=plain
if ($LASTEXITCODE -ne 0) { throw "La compilation a échoué ($LASTEXITCODE)" }

New-Item -ItemType Directory -Force (Join-Path $root 'release') | Out-Null
$apk = Join-Path $root 'release\MN90-Montre.apk'
Copy-Item -Force (Join-Path $root 'wear\app\build\outputs\apk\release\app-release.apk') $apk
Write-Host "APK : $apk ($([math]::Round((Get-Item $apk).Length / 1KB)) Ko)"

if ($Publish) {
  $tag = "wear-v$Version"
  $notes = "MN90 Montre $Version pour Wear OS 3+ (montres Android). Installation : voir le README."
  gh release create $tag $apk --repo soaresden/MN90Mobile --title "MN90 Montre $Version (Wear OS)" --notes $notes
  if ($LASTEXITCODE -ne 0) { throw 'Publication de la release impossible' }
  Write-Host "Release publiée : https://github.com/soaresden/MN90Mobile/releases/tag/$tag"
}
