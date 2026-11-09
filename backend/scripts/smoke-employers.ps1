param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Identifier = "admin"
)

$ErrorActionPreference = "Stop"
$script:Web  = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$script:Csrf = $null
$script:Pass = 0
$script:Fail = 0

function Invoke-Api {
    param([string]$Method, [string]$Path, $Body = $null, $Session = $script:Web)
    $headers = @{}
    if ($script:Csrf) { $headers[$script:Csrf.headerName] = $script:Csrf.token }
    $req = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = $headers; WebSession = $Session; UseBasicParsing = $true }
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

function Refresh-Csrf {
    $r = Invoke-Api GET "/api/auth/csrf"
    if ($r.Code -ne 200) { throw "CSRF endpoint returned $($r.Code)" }
    $script:Csrf = $r.Json
}

# ---- sign in as the administrator ----
$secure = Read-Host "Password for $Identifier" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
Refresh-Csrf
$login = Invoke-Api POST "/api/auth/login" @{ identifier = $Identifier; password = $plain }
$plain = $null
Check "login succeeds" ($login.Code -eq 200) "status $($login.Code)"
if ($login.Code -ne 200) { exit 1 }
if ($login.Text -match '"mustChangePassword"\s*:\s*true') {
    Write-Host "This account must change its password first. Sign in once through the frontend (http://localhost:3000), set a permanent password, then run this script again." -ForegroundColor Yellow
    exit 1
}
Refresh-Csrf

# ---- employers ----
$ref = "SMK-" + (Get-Random -Maximum 999999)
$c = Invoke-Api POST "/api/employers" @{ employerRef = $ref; legalName = "Smoke Test Ltd"; tradingName = "Smoke" }
Check "create employer -> 201" ($c.Code -eq 201) "status $($c.Code) $($c.Text)"
$id = $c.Json.employerId
if (-not $id) { Write-Host "No employer id returned; stopping." -ForegroundColor Red; exit 1 }
Check "new employer starts ACTIVE" ($c.Json.status -eq "ACTIVE")

$d = Invoke-Api POST "/api/employers" @{ employerRef = $ref; legalName = "Another" }
Check "duplicate reference -> 409" ($d.Code -eq 409) "status $($d.Code)"

$g = Invoke-Api GET "/api/employers/$id"
Check "detail -> 200 with same reference" ($g.Code -eq 200 -and $g.Json.employerRef -eq $ref)

$n = Invoke-Api GET "/api/employers/999999999"
Check "unknown id -> 404" ($n.Code -eq 404) "status $($n.Code)"

$v = Invoke-Api POST "/api/employers" @{ employerRef = "bad ref!"; legalName = "" }
Check "invalid body -> 400 naming the fields" ($v.Code -eq 400 -and ($v.Json.fields -contains "employerRef") -and ($v.Json.fields -contains "legalName")) "status $($v.Code) $($v.Text)"

$s = Invoke-Api GET ("/api/employers?search=" + $ref.ToLower())
Check "search is case-insensitive" ($s.Code -eq 200 -and $s.Json.totalElements -ge 1) "status $($s.Code)"

$bad = Invoke-Api GET "/api/employers?status=BANANA"
Check "unknown status filter -> 400" ($bad.Code -eq 400) "status $($bad.Code)"

$cap = Invoke-Api GET "/api/employers?size=500"
Check "page size capped at 100" ($cap.Code -eq 200 -and $cap.Json.size -eq 100)

$u = Invoke-Api PATCH "/api/employers/$id" @{ legalName = "Smoke Test Ltd 2"; status = "SUSPENDED" }
Check "update -> 200, name and status changed" ($u.Code -eq 200 -and $u.Json.legalName -eq "Smoke Test Ltd 2" -and $u.Json.status -eq "SUSPENDED") "status $($u.Code) $($u.Text)"
Check "untouched trading name preserved" ($u.Json.tradingName -eq "Smoke")

$h = Invoke-Api PATCH "/api/employers/$id" @{ employerRef = "HACK-1" }
Check "employer reference cannot be changed" ($h.Code -eq 200 -and $h.Json.employerRef -eq $ref) "status $($h.Code)"

# ---- anonymous access ----
$anon = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$a = Invoke-Api GET "/api/employers" $null $anon
Check "anonymous list -> 401" ($a.Code -eq 401) "status $($a.Code)"

# ---- tidy up: no delete endpoint exists, so retire the test employer ----
$null = Invoke-Api PATCH "/api/employers/$id" @{ status = "INACTIVE" }

Write-Host ""
Write-Host ("Passed: " + $script:Pass + "   Failed: " + $script:Fail)