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

# ---- anonymous access blocked ----
$anon = New-Client
Check "anonymous periods list -> 401" ((Invoke-Api $anon GET "/api/contribution-periods").Code -eq 401)
Check "anonymous data sources list -> 401" ((Invoke-Api $anon GET "/api/data-sources").Code -eq 401)

# ---- admin sign-in ----
$admin = New-Client
$pw = Read-Secret "APPLICATION password for $AdminIdentifier"
$r = Sign-In $admin $AdminIdentifier $pw
$pw = $null
Check "admin login succeeds" ($r.Code -eq 200) "status $($r.Code)"
if ($r.Code -ne 200) { exit 1 }

# ---- contribution periods ----
$existing = Invoke-Api $admin GET "/api/contribution-periods?size=100"
$usedLeap = @()
if ($existing.Json -and $existing.Json.content) {
    $usedLeap = $existing.Json.content | Where-Object { $_.periodMonth -eq 2 } | ForEach-Object { [int]$_.periodYear }
}
$testYear = @(2196, 2192, 2188, 2184, 2180, 2176, 2172, 2168) | Where-Object { $usedLeap -notcontains $_ } | Select-Object -First 1
if (-not $testYear) { throw "No unused test leap year in 2168..2196; clean up test periods first." }

$cp = Invoke-Api $admin POST "/api/contribution-periods" @{ periodYear = $testYear; periodMonth = 2 }
Check "create period -> 201" ($cp.Code -eq 201) "status $($cp.Code) $($cp.Text)"
$periodId = $cp.Json.periodId
Check "derived leap-year start/end/label & OPEN status" (
    $cp.Json.periodStart -eq "$testYear-02-01" -and
    $cp.Json.periodEnd -eq "$testYear-02-29" -and
    $cp.Json.periodLabel -eq "February $testYear" -and
    $cp.Json.status -eq "OPEN"
) "got $($cp.Text)"

$dup = Invoke-Api $admin POST "/api/contribution-periods" @{ periodYear = $testYear; periodMonth = 2 }
Check "duplicate year+month -> 409" ($dup.Code -eq 409) "status $($dup.Code)"

$badPeriod = Invoke-Api $admin POST "/api/contribution-periods" @{ periodYear = 1999; periodMonth = 13 }
Check "invalid period body -> 400 naming fields" (
    $badPeriod.Code -eq 400 -and $badPeriod.Text -match "periodYear" -and $badPeriod.Text -match "periodMonth"
) "status $($badPeriod.Code) $($badPeriod.Text)"

$listP = Invoke-Api $admin GET "/api/contribution-periods?year=$testYear&status=OPEN&size=500"
Check "list period filters & page size capped at 100" (
    $listP.Code -eq 200 -and $listP.Json.size -eq 100 -and $listP.Json.content.Count -ge 1
) "status $($listP.Code)"

Check "unknown period status filter -> 400" ((Invoke-Api $admin GET "/api/contribution-periods?status=BOGUS").Code -eq 400)
Check "unknown period id -> 404" ((Invoke-Api $admin GET "/api/contribution-periods/99999999").Code -eq 404)

# Lifecycle transitions: OPEN -> CLOSED -> ARCHIVED
$skipArch = Invoke-Api $admin PATCH "/api/contribution-periods/$periodId/status" @{ status = "ARCHIVED" }
Check "OPEN -> ARCHIVED rejected (409)" ($skipArch.Code -eq 409) "status $($skipArch.Code)"

$badStat = Invoke-Api $admin PATCH "/api/contribution-periods/$periodId/status" @{ status = "BANANA" }
Check "unknown transition status -> 400" ($badStat.Code -eq 400) "status $($badStat.Code)"

$toClosed = Invoke-Api $admin PATCH "/api/contribution-periods/$periodId/status" @{ status = "CLOSED" }
Check "OPEN -> CLOSED -> 200" ($toClosed.Code -eq 200 -and $toClosed.Json.status -eq "CLOSED") "status $($toClosed.Code)"

$reopen = Invoke-Api $admin PATCH "/api/contribution-periods/$periodId/status" @{ status = "OPEN" }
Check "CLOSED -> OPEN rejected (409)" ($reopen.Code -eq 409) "status $($reopen.Code)"

$toArch = Invoke-Api $admin PATCH "/api/contribution-periods/$periodId/status" @{ status = "ARCHIVED" }
Check "CLOSED -> ARCHIVED -> 200" ($toArch.Code -eq 200 -and $toArch.Json.status -eq "ARCHIVED") "status $($toArch.Code)"

$fromArch = Invoke-Api $admin PATCH "/api/contribution-periods/$periodId/status" @{ status = "CLOSED" }
Check "ARCHIVED -> CLOSED rejected (409)" ($fromArch.Code -eq 409) "status $($fromArch.Code)"

# ---- data sources ----
$suffix = Get-Random -Maximum 999999
$dsName = "SMK-SYNTH-$suffix"
$ds = Invoke-Api $admin POST "/api/data-sources" @{
    sourceName = " $dsName "
    sourceType = "synthetic"
    ownerName = "   "
    permittedPurpose = "Module 2 smoke testing"
}
Check "create synthetic data source -> 201" ($ds.Code -eq 201) "status $($ds.Code) $($ds.Text)"
$dsId = $ds.Json.sourceId
Check "sourceType normalized to SYNTHETIC, status ACTIVE, receivedAt set" (
    $ds.Json.sourceName -eq $dsName -and
    $ds.Json.sourceType -eq "SYNTHETIC" -and
    $ds.Json.status -eq "ACTIVE" -and
    $null -eq $ds.Json.ownerName -and
    $null -ne $ds.Json.receivedAt
) "got $($ds.Text)"

$badDs = Invoke-Api $admin POST "/api/data-sources" @{ sourceName = ""; sourceType = ""; permittedPurpose = "" }
Check "invalid data source body -> 400 naming fields" (
    $badDs.Code -eq 400 -and $badDs.Text -match "sourceName" -and $badDs.Text -match "sourceType" -and $badDs.Text -match "permittedPurpose"
) "status $($badDs.Code) $($badDs.Text)"

$dsDetail = Invoke-Api $admin GET "/api/data-sources/$dsId"
Check "get data source detail -> 200" ($dsDetail.Code -eq 200 -and $dsDetail.Json.sourceName -eq $dsName) "status $($dsDetail.Code)"
Check "unknown data source id -> 404" ((Invoke-Api $admin GET "/api/data-sources/99999999").Code -eq 404)

$dsList = Invoke-Api $admin GET "/api/data-sources?sourceType=SYNTHETIC&search=$($dsName.ToLower())&size=500"
Check "list data sources filters case-insensitively & caps size at 100" (
    $dsList.Code -eq 200 -and $dsList.Json.size -eq 100 -and $dsList.Json.content.Count -eq 1
) "status $($dsList.Code)"
Check "unknown data source status filter -> 400" ((Invoke-Api $admin GET "/api/data-sources?status=BOGUS").Code -eq 400)

# ---- monitor RBAC checks (403 on writes, 200 on reads) ----
$mon = New-Client
$mpw = Read-Secret "APPLICATION password for $MonitorIdentifier (press Enter to skip)"
if ($mpw) {
    $mr = Sign-In $mon $MonitorIdentifier $mpw
    $mpw = $null
    Check "monitor signs in" ($mr.Code -eq 200) "status $($mr.Code)"
    if ($mr.Code -eq 200) {
        Check "monitor can list periods (200)" ((Invoke-Api $mon GET "/api/contribution-periods").Code -eq 200)
        Check "monitor can view period (200)" ((Invoke-Api $mon GET "/api/contribution-periods/$periodId").Code -eq 200)
        Check "monitor cannot create period (403)" ((Invoke-Api $mon POST "/api/contribution-periods" @{ periodYear = 2199; periodMonth = 1 }).Code -eq 403)
        Check "monitor cannot transition period status (403)" ((Invoke-Api $mon PATCH "/api/contribution-periods/$periodId/status" @{ status = "CLOSED" }).Code -eq 403)
        Check "monitor can list data sources (200)" ((Invoke-Api $mon GET "/api/data-sources").Code -eq 200)
        Check "monitor can view data source (200)" ((Invoke-Api $mon GET "/api/data-sources/$dsId").Code -eq 200)
        Check "monitor cannot create data source (403)" ((Invoke-Api $mon POST "/api/data-sources" @{ sourceName = "SMK-FORBIDDEN"; sourceType = "SYNTHETIC"; permittedPurpose = "Must fail" }).Code -eq 403)
    }
}

Write-Host ""
Write-Host ("Passed: " + $script:Pass + "   Failed: " + $script:Fail)