param(
    [hashtable]$ModuleConfig,
    [switch]$Uninstall
)

# ── Persistence ────────────────────────────────────────────────
$Script:ServiceConfig = @{
    TaskName    = "LNKProtection"
    InstallDir  = "C:\ProgramData\Antivirus"
    ScriptName  = "LNKProtection.ps1"
}

function Install-Persistence {
    $dir = $Script:ServiceConfig.InstallDir
    $dest = Join-Path $dir $Script:ServiceConfig.ScriptName
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Copy-Item -Path $PSCommandPath -Destination $dest -Force
    Write-Host "Copied to $dest" -ForegroundColor Gray

    $existing = Get-ScheduledTask -TaskName $Script:ServiceConfig.TaskName -ErrorAction SilentlyContinue
    if ($existing) { Unregister-ScheduledTask -TaskName $Script:ServiceConfig.TaskName -Confirm:$false }

    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$dest`""
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

    Register-ScheduledTask -TaskName $Script:ServiceConfig.TaskName `
        -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
        -Description "Fake UAC dialog detection monitor (Gorstak)" | Out-Null

    Write-Host "[OK] $($Script:ServiceConfig.TaskName) installed and will run at logon." -ForegroundColor Green
    exit 0
}

function Uninstall-Persistence {
    $task = Get-ScheduledTask -TaskName $Script:ServiceConfig.TaskName -ErrorAction SilentlyContinue
    if ($task) {
        if ($task.State -eq "Running") { Stop-ScheduledTask -TaskName $Script:ServiceConfig.TaskName -ErrorAction SilentlyContinue }
        Unregister-ScheduledTask -TaskName $Script:ServiceConfig.TaskName -Confirm:$false
        Write-Host "Task removed." -ForegroundColor Gray
    }
    $dest = Join-Path $Script:ServiceConfig.InstallDir $Script:ServiceConfig.ScriptName
    if (Test-Path $dest) { Remove-Item $dest -Force -ErrorAction SilentlyContinue }
    Write-Host "[OK] $($Script:ServiceConfig.TaskName) uninstalled." -ForegroundColor Green
    exit 0
}

Install-Persistence
if ($Uninstall) { Uninstall-Persistence }

while($true){
    $s=New-Object -Com WScript.Shell
    $paths = "$env:USERPROFILE\Desktop", 
             "$env:APPDATA\Microsoft\Windows\Start Menu\Programs", 
             "$env:APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"

    gci $paths -Recurse -Include *.lnk -ErrorAction SilentlyContinue | ? {
        $s.CreateShortcut($_.FullName).TargetPath -like "\\*"
    } | rm -Force
    
    sleep 3600
}

