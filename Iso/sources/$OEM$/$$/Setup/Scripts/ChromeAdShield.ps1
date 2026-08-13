# ChromeAdShield.ps1
# Installs GSecurity Ad Shield into Chrome via local extension files + policy.
# Chrome on Windows refuses self-hosted update URLs, but accepts file:/// paths.
# This script:
#   1. Copies the extension folder to a protected system path
#   2. Writes a local update.xml referencing the local CRX
#   3. Sets ExtensionInstallForcelist to point Chrome at the local update.xml
#
# Author: Gorstak (gorstak.eu)
#Requires -RunAsAdministrator

$ErrorActionPreference = "SilentlyContinue"

$ExtId      = "mmnddienopidpnlodoapnncbjokofebn"
$InstallDir = "$env:ProgramFiles\GSecurity-Ad-Shield"
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceDir  = Join-Path $ScriptDir "GSecurity-Ad-Shield"

# Only proceed if the extension source was bundled with the image
if (-not (Test-Path $SourceDir)) { exit 0 }

# Copy extension to Program Files (protected from user tampering)
if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
Copy-Item -Path $SourceDir -Destination $InstallDir -Recurse -Force

# Read version from manifest.json
$manifest = Get-Content (Join-Path $InstallDir "manifest.json") -Raw | ConvertFrom-Json
$Version = $manifest.version

# Write local update.xml (Chrome checks this to determine if install is valid)
$updateXml = @"
<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="$ExtId">
    <updatecheck codebase="file:///$($InstallDir -replace '\\','/')/gsecurity-ad-shield.crx" version="$Version" />
  </app>
</gupdate>
"@
Set-Content -Path (Join-Path $InstallDir "update.xml") -Value $updateXml -Encoding UTF8

# Pack CRX if a .pem key exists, otherwise use unpacked approach
$keyPath = Join-Path $SourceDir "key.pem"
$crxPath = Join-Path $InstallDir "gsecurity-ad-shield.crx"

# For Chrome force-install from file path, we need the External Extensions JSON approach
# This is the one method Chrome respects on Windows for non-store extensions.
# Registry key: HKLM\Software\Google\Chrome\Extensions\<id>\path + version
# OR: HKLM\Software\Wow6432Node\Google\Chrome\Extensions\<id>\path + version (for 32-bit keys)

$regPaths = @(
    "HKLM:\Software\Google\Chrome\Extensions\$ExtId",
    "HKLM:\Software\WOW6432Node\Google\Chrome\Extensions\$ExtId"
)

foreach ($regPath in $regPaths) {
    if (-not (Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }
    # Point to local update.xml - Chrome accepts file:// for this specific registry method
    $updateXmlPath = Join-Path $InstallDir "update.xml"
    Set-ItemProperty -Path $regPath -Name "update_url" -Value "file:///$($updateXmlPath -replace '\\','/')" -Type String -Force
}

# Also try the ExtensionSettings policy (belt and suspenders)
$chromePolPath = "HKLM:\Software\Policies\Google\Chrome"
if (-not (Test-Path $chromePolPath)) { New-Item -Path $chromePolPath -Force | Out-Null }

# ExtensionSettings JSON allows installation_mode with a file:// update_url
$extSettings = @{
    $ExtId = @{
        installation_mode = "force_installed"
        update_url = "file:///$($updateXmlPath -replace '\\','/')"
    }
}
$existingSettings = $null
try {
    $raw = (Get-ItemProperty -Path $chromePolPath -Name "ExtensionSettings" -ErrorAction Stop).ExtensionSettings
    $existingSettings = $raw | ConvertFrom-Json
} catch {}

if ($existingSettings) {
    $existingSettings | Add-Member -NotePropertyName $ExtId -NotePropertyValue $extSettings[$ExtId] -Force
    $json = $existingSettings | ConvertTo-Json -Compress -Depth 5
} else {
    $json = $extSettings | ConvertTo-Json -Compress -Depth 5
}
Set-ItemProperty -Path $chromePolPath -Name "ExtensionSettings" -Value $json -Type String -Force

exit 0
