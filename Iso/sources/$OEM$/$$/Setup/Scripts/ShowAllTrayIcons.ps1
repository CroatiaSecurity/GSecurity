# Show All Tray Icons - Makes all notification area icons always visible
# Works for Windows 10 and 11

$ErrorActionPreference = 'SilentlyContinue'

# --- Method 1: Set the global "always show all icons" toggle ---
# This is the classic Explorer setting (EnableAutoTray = 0 means show all)
$explorerPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer'
Set-ItemProperty -Path $explorerPath -Name 'EnableAutoTray' -Value 0 -Type DWord -Force

# --- Method 2: Promote all existing individual tray icon entries ---
$notifyPath = 'HKCU:\Control Panel\NotifyIconSettings'
if (Test-Path $notifyPath) {
    Get-ChildItem -Path $notifyPath | ForEach-Object {
        Set-ItemProperty -Path $_.PSPath -Name 'IsPromoted' -Value 1 -Type DWord -Force
    }
}

# --- Method 3: Set the default profile so new users get this too ---
# Load the default user hive temporarily
$defaultNtuser = "$env:SystemDrive\Users\Default\NTUSER.DAT"
$tempHive = 'HKU\DefaultUser_Temp'
$loaded = $false

if (Test-Path $defaultNtuser) {
    reg load $tempHive $defaultNtuser 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $loaded = $true
        reg add "$tempHive\Software\Microsoft\Windows\CurrentVersion\Explorer" /v EnableAutoTray /t REG_DWORD /d 0 /f 2>&1 | Out-Null
    }
}

# --- Register a lightweight scheduled task for logon persistence ---
# This ensures any new tray icons added after logon also get promoted
$taskName = 'ShowAllTrayIcons'

$action = New-ScheduledTaskAction -Execute "$env:windir\System32\WindowsPowerShell\v1.0\powershell.exe" `
    -Argument '-NoProfile -NonInteractive -WindowStyle Hidden -Command "Set-ItemProperty -Path ''HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer'' -Name ''EnableAutoTray'' -Value 0 -Type DWord -Force; Get-ChildItem ''HKCU:\Control Panel\NotifyIconSettings'' -ErrorAction SilentlyContinue | ForEach-Object { Set-ItemProperty -Path $_.PSPath -Name ''IsPromoted'' -Value 1 -Type DWord -Force }"'

$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -GroupId 'S-1-5-32-545' -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
} catch {
    # Fallback: use schtasks.exe for debloated Windows images
    schtasks /Create /TN $taskName /SC ONLOGON /RL LIMITED `
        /TR "powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -Command `"Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer' -Name 'EnableAutoTray' -Value 0 -Type DWord -Force; Get-ChildItem 'HKCU:\Control Panel\NotifyIconSettings' -ErrorAction SilentlyContinue | ForEach-Object { Set-ItemProperty -Path `$_.PSPath -Name 'IsPromoted' -Value 1 -Type DWord -Force }`"" `
        /F 2>&1 | Out-Null
}

# Unload the default hive if we loaded it
if ($loaded) {
    [gc]::Collect()
    Start-Sleep -Seconds 1
    reg unload $tempHive 2>&1 | Out-Null
}

# Restart Explorer to apply immediately (only if a user session is active)
$explorer = Get-Process -Name explorer -ErrorAction SilentlyContinue
if ($explorer) {
    Stop-Process -Name explorer -Force
    Start-Sleep -Seconds 2
    Start-Process explorer.exe
}
