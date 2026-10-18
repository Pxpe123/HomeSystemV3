$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$toolDirectory = Join-Path $taskRoot '.local/tools/inno'
$installer = Join-Path $taskRoot '.local/tools/innosetup-7.1.0-x64.exe'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $installer) | Out-Null
Invoke-WebRequest -Uri 'https://github.com/jrsoftware/issrc/releases/download/is-7_1_0/innosetup-7.1.0-x64.exe' -OutFile $installer
if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash -ne '0362A383ED217D4C4239B5933866DD96D3EB2102737DA92F80F6057A4B40DF2F') {
    throw 'Inno Setup download checksum did not match the pinned official release'
}
$process = Start-Process -FilePath $installer -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/CURRENTUSER', "/DIR=`"$toolDirectory`"") -Wait -PassThru -WindowStyle Hidden
if ($process.ExitCode -ne 0) { throw "Inno Setup installation failed: $($process.ExitCode)" }
$compiler = Join-Path $toolDirectory 'ISCC.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Inno Setup compiler is missing' }
if ($env:GITHUB_ENV) { "HOMESYSTEM_ISCC=$compiler" >> $env:GITHUB_ENV }
Write-Output "Verified installer compiler: $compiler"
