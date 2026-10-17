param (
    [string]$User = "jay",
    [string]$SSHHost = "192.168.50.163",
    [int]$Port = 22
)

function Connect-SSH {
    while ($true) {
        try {
            Write-Host "Trying to connect to $User@$SSHHost..."
            ssh $User@$SSHHost -p $Port
            Write-Host "SSH disconnected, retrying in 5s..."
        } catch {
            Write-Host "Connection failed, retrying in 5s..."
        }
        Start-Sleep -Seconds 5
    }
}

Connect-SSH
