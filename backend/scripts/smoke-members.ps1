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
Check "anonymous members list -> 401" ((Invoke-Api $anon GET "/api/members").Code -eq 401)

# ---- admin sign-in ----
$admin = New-Client
$pw = Read-Secret "APPLICATION password for $AdminIdentifier"
$r = Sign-In $admin $AdminIdentifier $pw
$pw = $null
Check "admin login succeeds" ($r.Code -eq 200) "status $($r.Code)"
if ($r.Code -ne 200) { exit 1 }

# ---- create & validate members ----
$suffix = Get-Random -Maximum 999999
$mRef = "SMK-MBR-$suffix"
$srcRef = "SRC-PSEUDO-$suffix"

$cm = Invoke-Api $admin POST "/api/members" @{
    memberRef = " $mRef "
    sourceMemberRef = " $srcRef "
}
Check "create member -> 201" ($cm.Code -eq 201) "status $($cm.Code) $($cm.Text)"
$memberId = $cm.Json.memberId
Check "new member starts ACTIVE with trimmed pseudonymous refs" (
    $cm.Json.memberRef -eq $mRef -and
    $cm.Json.sourceMemberRef -eq $srcRef -and
    $cm.Json.status -eq "ACTIVE"
) "got $($cm.Text)"

Check "response exposes no personal-data fields" (
    -not ($cm.Text -match '"(firstName|lastName|fullName|nrc|email|phone|dob)"')
)

$dup = Invoke-Api $admin POST "/api/members" @{ memberRef = $mRef }
Check "duplicate member reference -> 409" ($dup.Code -eq 409) "status $($dup.Code)"

$badBody = Invoke-Api $admin POST "/api/members" @{ memberRef = "" }
Check "invalid body -> 400 naming memberRef" (
    $badBody.Code -eq 400 -and $badBody.Text -match "memberRef"
) "status $($badBody.Code) $($badBody.Text)"

$badStatus = Invoke-Api $admin POST "/api/members" @{ memberRef = "SMK-BAD-$suffix"; status = "BOGUS" }
Check "invalid create status -> 400" ($badStatus.Code -eq 400) "status $($badStatus.Code)"

# ---- detail, search, pagination ----
$det = Invoke-Api $admin GET "/api/members/$memberId"
Check "member detail -> 200" ($det.Code -eq 200 -and $det.Json.memberRef -eq $mRef) "status $($det.Code)"
Check "unknown member id -> 404" ((Invoke-Api $admin GET "/api/members/99999999").Code -eq 404)

$list = Invoke-Api $admin GET "/api/members?search=$($srcRef.ToLower())&status=ACTIVE&size=500"
Check "case-insensitive search & page size capped at 100" (
    $list.Code -eq 200 -and $list.Json.size -eq 100 -and $list.Json.content.Count -eq 1
) "status $($list.Code)"

Check "unknown member status filter -> 400" ((Invoke-Api $admin GET "/api/members?status=BOGUS").Code -eq 400)

# ---- monitor RBAC checks ----
$mon = New-Client
$mpw = Read-Secret "APPLICATION password for $MonitorIdentifier (press Enter to skip)"
if ($mpw) {
    $mr = Sign-In $mon $MonitorIdentifier $mpw
    $mpw = $null
    Check "monitor signs in" ($mr.Code -eq 200) "status $($mr.Code)"
    if ($mr.Code -eq 200) {
        Check "monitor can list members (200)" ((Invoke-Api $mon GET "/api/members").Code -eq 200)
        Check "monitor can view member detail (200)" ((Invoke-Api $mon GET "/api/members/$memberId").Code -eq 200)
        Check "monitor cannot create member (403)" ((Invoke-Api $mon POST "/api/members" @{ memberRef = "SMK-FORBIDDEN-$suffix" }).Code -eq 403)
    }
}

Write-Host ""
Write-Host ("Passed: " + $script:Pass + "   Failed: " + $script:Fail)