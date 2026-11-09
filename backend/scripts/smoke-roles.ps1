param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$AdminIdentifier = "admin",
    [string]$MonitorIdentifier = "charles_monitor"
)

$ErrorActionPreference = "Stop"
$script:Pass = 0
$script:Fail = 0

function New-Client { return @{ Web = (New-Object Microsoft.PowerShell.Commands.WebRequestSession); Csrf = $null } }

function Invoke-Api($Client, [string]$Method, [string]$Path, $Body = $null) {
    $headers = @{}
    if ($Client.Csrf) { $headers[$Client.Csrf.headerName] = $Client.Csrf.token }
    $req = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = $headers; WebSession = $Client.Web; UseBasicParsing = $true }
    if ($null -ne $Body) {
        $req.Body = ($Body | ConvertTo-Json -Depth 5 -Compress)
        $req.ContentType = "application/json"
    }
    $code = 0; $text = ""
    try {
        $r = Invoke-WebRequest @req
        $code = [int]$r.StatusCode
        $text = $r.Content
    } catch {
        $resp = $_.Exception.Response
        if ($resp) { $code = [int]$resp.StatusCode }
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $text = $_.ErrorDetails.Message
        } elseif ($resp -and $resp.GetType().GetMethod("GetResponseStream")) {
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $text = $reader.ReadToEnd()
        } else {
            throw
        }
    }
    $json = $null
    if ($text) { try { $json = $text | ConvertFrom-Json } catch { } }
    return [pscustomobject]@{ Code = $code; Json = $json; Text = $text }
}

function Check($name, $ok, $detail = "") {
    if ($ok) { $script:Pass++; Write-Host ("PASS  " + $name) -ForegroundColor Green }
    else     { $script:Fail++; Write-Host ("FAIL  " + $name + "   " + $detail) -ForegroundColor Red }
}

function Refresh-Csrf($Client) {
    $r = Invoke-Api $Client GET "/api/auth/csrf"
    if ($r.Code -ne 200) { throw "CSRF endpoint returned $($r.Code)" }
    $Client.Csrf = $r.Json
}

function Sign-In($Client, [string]$Identifier, [string]$Plain) {
    Refresh-Csrf $Client
    $r = Invoke-Api $Client POST "/api/auth/login" @{ identifier = $Identifier; password = $Plain }
    if ($r.Code -eq 200) { Refresh-Csrf $Client }
    return $r
}

function Read-Secret([string]$Prompt) {
    $s = Read-Host $Prompt -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

function MustChange($r) { return ($r.Text -match '"mustChangePassword"\s*:\s*true') }

function Run-MonitorChecks($Client, [string]$Label) {
    $l = Invoke-Api $Client GET "/api/employers"
    Check "$Label can list employers" ($l.Code -eq 200) "status $($l.Code)"

    $first = $null
    if ($l.Json -and $l.Json.content -and $l.Json.content.Count -gt 0) { $first = $l.Json.content[0].employerId }
    if ($first) {
        $d = Invoke-Api $Client GET "/api/employers/$first"
        Check "$Label can view an employer" ($d.Code -eq 200) "status $($d.Code)"
    }

    $suffix = Get-Random -Maximum 999999
    $c = Invoke-Api $Client POST "/api/employers" @{ employerRef = "SMK-ROLE-$suffix"; legalName = "Must Not Be Created" }
    Check "$Label cannot create an employer (403)" ($c.Code -eq 403) "status $($c.Code)"

    # An empty patch changes nothing even if authorisation were missing, so this test is side-effect free.
    $target = if ($first) { $first } else { 1 }
    $u = Invoke-Api $Client PATCH "/api/employers/$target" @{}
    Check "$Label cannot update an employer (403)" ($u.Code -eq 403) "status $($u.Code)"

    $a = Invoke-Api $Client GET "/api/admin/users"
    Check "$Label cannot list user accounts (403)" ($a.Code -eq 403) "status $($a.Code)"
}

# ---- administrator ----
$admin = New-Client
$pw = Read-Secret "APPLICATION password for $AdminIdentifier (not the database password)"
$r = Sign-In $admin $AdminIdentifier $pw
$pw = $null
Check "administrator signs in" ($r.Code -eq 200 -and -not (MustChange $r)) "status $($r.Code)"
if ($r.Code -ne 200) { exit 1 }

# ---- existing monitor (optional) ----
$pw = Read-Secret "APPLICATION password for $MonitorIdentifier (press Enter to skip this part)"
if ($pw) {
    $mon = New-Client
    $r = Sign-In $mon $MonitorIdentifier $pw
    $pw = $null
    Check "existing monitor signs in" ($r.Code -eq 200 -and -not (MustChange $r)) "status $($r.Code)"
    if ($r.Code -eq 200) { Run-MonitorChecks $mon "existing monitor" }
}

# ---- brand-new account: forced password change, then monitor behaviour ----
$suffix = Get-Random -Maximum 999999
$uname = "smoke_tmp_$suffix"
$cu = Invoke-Api $admin POST "/api/admin/users" @{
    username = $uname; institutionalEmail = "$uname@smartcompliance.local"
    displayName = "Smoke Test Monitor"; roleCode = "COMPLIANCE_MONITOR" }
Check "administrator creates a temporary monitor (201)" ($cu.Code -eq 201) "status $($cu.Code)"

if ($cu.Code -eq 201) {
    $temp = $cu.Json.temporaryPassword
    $tmp = New-Client
    $r = Sign-In $tmp $uname $temp
    Check "new account signs in and is flagged to change its password" ($r.Code -eq 200 -and (MustChange $r)) "status $($r.Code)"

    $blocked = Invoke-Api $tmp GET "/api/employers"
    Check "ordinary endpoints are blocked while a password change is pending" ($blocked.Code -eq 401 -or $blocked.Code -eq 403) "status $($blocked.Code)"

    $newPw = "Sm0ke-" + (-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 14 | ForEach-Object { [char]$_ }))
    $ch = Invoke-Api $tmp POST "/api/auth/password/change" @{ currentPassword = $temp; newPassword = $newPw }
    Check "password change is accepted (204)" ($ch.Code -eq 204) "status $($ch.Code)"
    $temp = $null

    $tmp2 = New-Client
    $r2 = Sign-In $tmp2 $uname $newPw
    $newPw = $null
    Check "signs in with the new password, no change pending" ($r2.Code -eq 200 -and -not (MustChange $r2)) "status $($r2.Code)"
    if ($r2.Code -eq 200) { Run-MonitorChecks $tmp2 "new monitor" }

    Write-Host ""
    Write-Host "Test account created: $uname  - disable it afterwards in the user administration screen." -ForegroundColor Yellow
}

Write-Host ""
Write-Host ("Passed: " + $script:Pass + "   Failed: " + $script:Fail)