param(
    [string]$BaseUrl = "http://localhost:8080",
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
        $req.Body = ($Body | ConvertTo-Json -Depth 6 -Compress)
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

$anon = New-Client
Check "anonymous rules list -> 401" ((Invoke-Api $anon GET "/api/contribution-rules").Code -eq 401)

$mon = New-Client
$mpw = Read-Secret "APPLICATION password for $MonitorIdentifier"
$mr = Sign-In $mon $MonitorIdentifier $mpw
$mpw = $null
Check "monitor login succeeds" ($mr.Code -eq 200) "status $($mr.Code)"
if ($mr.Code -ne 200) { exit 1 }

$rules = Invoke-Api $mon GET "/api/contribution-rules"
Check "list rules returns 2024-2026 (3 versions)" ($rules.Code -eq 200 -and $rules.Json.Count -ge 3)

$app2024 = Invoke-Api $mon GET "/api/contribution-rules/applicable?date=2024-06-15"
Check "applicable rule for 2024-06-15 -> v1 ceiling 29816.00" (
    $app2024.Code -eq 200 -and $app2024.Json.versionNo -eq 1 -and $app2024.Json.ceilingAmount -eq 29816
)

$app2023 = Invoke-Api $mon GET "/api/contribution-rules/applicable?date=2023-06-15"
Check "applicable rule for 2023-06-15 -> 409" ($app2023.Code -eq 409)

$prev2026 = Invoke-Api $mon POST "/api/contribution-calculations/preview" @{
    grossPay = 50000.00; date = "2026-05-01"
}
Check "preview 2026 capped at 37236.00 -> 1861.80 + 1861.80 = 3723.60" (
    $prev2026.Code -eq 200 -and
    $prev2026.Json.calculationStatus -eq "CALCULATED" -and
    $prev2026.Json.totalAmount -eq 3723.6
)

$prevNull = Invoke-Api $mon POST "/api/contribution-calculations/preview" @{
    grossPay = $null; date = "2026-05-01"
}
Check "preview NULL grossPay -> EXCLUDED (not 0)" (
    $prevNull.Code -eq 200 -and $prevNull.Json.calculationStatus -eq "EXCLUDED" -and $null -eq $prevNull.Json.totalAmount
)

Write-Host ""
Write-Host ("Passed: " + $script:Pass + "   Failed: " + $script:Fail)