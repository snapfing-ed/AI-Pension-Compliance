param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$AdminIdentifier = "admin",
    [switch]$IncludeLastAdminTest
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\_lib.ps1"
$global:SC_BaseUrl = $BaseUrl

function New-TestPeriod {
    for ($i = 0; $i -lt 20; $i++) {
        $y = Get-Random -Minimum 2150 -Maximum 2200
        $m = Get-Random -Minimum 1 -Maximum 13
        $r = Invoke-Api $admin POST "/api/contribution-periods" @{ periodYear = $y; periodMonth = $m }
        if ($r.Code -eq 201) { return $r }
    }
    return $null
}

# ---------------- administrator ----------------
$admin = New-Client
$pw = Read-Secret "APPLICATION password for $AdminIdentifier (not the database password)"
$r = Sign-In $admin $AdminIdentifier $pw
$pw = $null
Check "administrator signs in" ($r.Code -eq 200 -and -not (MustChange $r)) "status $($r.Code)"
if ($r.Code -ne 200) { exit 1 }

# ---------------- employers ----------------
Write-Host "`n--- Employers: PATCH /api/employers/{id} ---"
$ref = "SMK-PATCH-" + (Get-Random -Maximum 999999)
$e = Invoke-Api $admin POST "/api/employers" @{ employerRef = $ref; legalName = "Patch Test Ltd"; tradingName = "Patch" }
Check "setup: employer created" ($e.Code -eq 201) "status $($e.Code) $($e.Text)"
if ($e.Code -ne 201) { exit 1 }
$eid = $e.Json.employerId

$u1 = Invoke-Api $admin PATCH "/api/employers/$eid" @{ legalName = "Patch Test Ltd 2" }
Check "valid change -> 200 with the new value" ($u1.Code -eq 200 -and $u1.Json.legalName -eq "Patch Test Ltd 2") "status $($u1.Code)"
Check "updatedAt moves forward" ((Dt $u1.Json.updatedAt) -gt (Dt $e.Json.updatedAt))

$u2 = Invoke-Api $admin PATCH "/api/employers/$eid" @{ legalName = "Patch Test Ltd 2"; status = "ACTIVE" }
Check "no-op change -> 200" ($u2.Code -eq 200) "status $($u2.Code)"
Check "no-op does not touch updatedAt (no false history)" ((Dt $u2.Json.updatedAt) -eq (Dt $u1.Json.updatedAt))

$bad = Invoke-Api $admin PATCH "/api/employers/$eid" @{ status = "BANANA" }
Check "invalid status -> 400 naming the field" ($bad.Code -eq 400 -and ($bad.Json.fields -contains "status")) "status $($bad.Code) $($bad.Text)"

$blank = Invoke-Api $admin PATCH "/api/employers/$eid" @{ legalName = "   " }
Check "blank legal name -> 400" ($blank.Code -eq 400) "status $($blank.Code)"

$imm = Invoke-Api $admin PATCH "/api/employers/$eid" @{ employerRef = "HACK-1" }
Check "employer reference is immutable" ($imm.Code -eq 200 -and $imm.Json.employerRef -eq $ref) "status $($imm.Code)"

$clr = Invoke-Api $admin PATCH "/api/employers/$eid" @{ tradingName = "  " }
Check "blank trading name clears it" ($clr.Code -eq 200 -and $null -eq $clr.Json.tradingName)

$nf = Invoke-Api $admin PATCH "/api/employers/999999999" @{ legalName = "X" }
Check "unknown employer -> 404" ($nf.Code -eq 404) "status $($nf.Code)"

$nocsrf = Invoke-Api $admin PATCH "/api/employers/$eid" @{ legalName = "Hacked" } -NoCsrf
Check "missing CSRF header -> 403" ($nocsrf.Code -eq 403) "status $($nocsrf.Code)"
$after = Invoke-Api $admin GET "/api/employers/$eid"
Check "...and the data is untouched" ($after.Json.legalName -eq "Patch Test Ltd 2")

$anon = New-Client; Refresh-Csrf $anon
$an = Invoke-Api $anon PATCH "/api/employers/$eid" @{ legalName = "Hacked" }
Check "anonymous PATCH -> 401" ($an.Code -eq 401) "status $($an.Code)"

# ---------------- periods ----------------
Write-Host "`n--- Periods: PATCH /api/contribution-periods/{id}/status ---"
$p1 = New-TestPeriod
Check "setup: test period created and OPEN" ($p1 -and $p1.Json.status -eq "OPEN")
if (-not $p1) { exit 1 }
$pid1 = $p1.Json.periodId

$c = Invoke-Api $admin PATCH "/api/contribution-periods/$pid1/status" @{ status = "CLOSED" }
Check "OPEN -> CLOSED -> 200" ($c.Code -eq 200 -and $c.Json.status -eq "CLOSED") "status $($c.Code) $($c.Text)"

$b2 = Invoke-Api $admin PATCH "/api/contribution-periods/$pid1/status" @{ status = "BANANA" }
Check "unknown status -> 400 (a 500 here is a bug)" ($b2.Code -eq 400) "status $($b2.Code) $($b2.Text)"

$b3 = Invoke-Api $admin PATCH "/api/contribution-periods/$pid1/status" @{ status = "" }
Check "empty status -> 400" ($b3.Code -eq 400) "status $($b3.Code)"

$b4 = Invoke-Api $admin PATCH "/api/contribution-periods/999999999/status" @{ status = "CLOSED" }
Check "unknown period -> 404" ($b4.Code -eq 404) "status $($b4.Code)"

$same = Invoke-Api $admin PATCH "/api/contribution-periods/$pid1/status" @{ status = "CLOSED" }
Note "CLOSED -> CLOSED (same status) returned $($same.Code)"
$reopen = Invoke-Api $admin PATCH "/api/contribution-periods/$pid1/status" @{ status = "OPEN" }
Note "CLOSED -> OPEN (reopen) returned $($reopen.Code)   [forward-only lifecycle would be 409]"

$arch = Invoke-Api $admin PATCH "/api/contribution-periods/$pid1/status" @{ status = "ARCHIVED" }
Check "CLOSED -> ARCHIVED -> 200" ($arch.Code -eq 200 -and $arch.Json.status -eq "ARCHIVED") "status $($arch.Code) $($arch.Text)"
$back = Invoke-Api $admin PATCH "/api/contribution-periods/$pid1/status" @{ status = "CLOSED" }
Note "ARCHIVED -> CLOSED returned $($back.Code)   [forward-only lifecycle would be 409]"

$p2 = New-TestPeriod
$skip = Invoke-Api $admin PATCH "/api/contribution-periods/$($p2.Json.periodId)/status" @{ status = "ARCHIVED" }
Note "OPEN -> ARCHIVED (skipping CLOSED) returned $($skip.Code)"
$p3 = New-TestPeriod   # stays OPEN for the monitor test below
$pid3 = $p3.Json.periodId

# ---------------- users ----------------
Write-Host "`n--- Users: PATCH status and roles ---"
$suffix = Get-Random -Maximum 999999
$uname = "smoke_patch_$suffix"
$cu = Invoke-Api $admin POST "/api/admin/users" @{
    username = $uname; institutionalEmail = "$uname@smartcompliance.local"
    displayName = "Smoke Patch Monitor"; roleCode = "COMPLIANCE_MONITOR" }
Check "setup: temporary monitor created" ($cu.Code -eq 201) "status $($cu.Code) $($cu.Text)"
if ($cu.Code -ne 201) { exit 1 }
$uid = $cu.Json.user.userId
$temp = $cu.Json.temporaryPassword

$tmp = New-Client
$s = Sign-In $tmp $uname $temp
Check "new account signs in (password change pending)" ($s.Code -eq 200 -and (MustChange $s)) "status $($s.Code)"
$me1 = Invoke-Api $tmp GET "/api/auth/me"
Check "its session works before the disable" ($me1.Code -eq 200) "status $($me1.Code)"

$st1 = Invoke-Api $admin PATCH "/api/admin/users/$uid/status" @{ accountStatus = "PENDING" }
Check "PENDING cannot be set manually -> 400" ($st1.Code -eq 400) "status $($st1.Code)"
$st2 = Invoke-Api $admin PATCH "/api/admin/users/$uid/status" @{ accountStatus = "BANANA" }
Check "invalid status -> 400" ($st2.Code -eq 400) "status $($st2.Code)"
$st3 = Invoke-Api $admin PATCH "/api/admin/users/999999999/status" @{ accountStatus = "DISABLED" }
Check "unknown user -> 404" ($st3.Code -eq 404) "status $($st3.Code)"

$dis = Invoke-Api $admin PATCH "/api/admin/users/$uid/status" @{ accountStatus = "DISABLED" }
Check "disable -> 200 and DISABLED" ($dis.Code -eq 200 -and $dis.Json.accountStatus -eq "DISABLED") "status $($dis.Code) $($dis.Text)"
$me2 = Invoke-Api $tmp GET "/api/auth/me"
Check "the user's live session stops working after the disable" ($me2.Code -eq 401 -or $me2.Code -eq 403) "status $($me2.Code)"
$bl = Sign-In (New-Client) $uname $temp
Check "a disabled account cannot sign in" ($bl.Code -eq 401 -or $bl.Code -eq 403) "status $($bl.Code)"
Check "the failure message does not reveal the account state" ($bl.Text -notmatch "(?i)disabled|locked") $bl.Text

$act = Invoke-Api $admin PATCH "/api/admin/users/$uid/status" @{ accountStatus = "ACTIVE" }
Check "re-activate -> 200 and ACTIVE" ($act.Code -eq 200 -and $act.Json.accountStatus -eq "ACTIVE") "status $($act.Code)"

$ro1 = Invoke-Api $admin PATCH "/api/admin/users/$uid/roles" @{ roleCode = "NOPE" }
Check "unknown role -> 400" ($ro1.Code -eq 400) "status $($ro1.Code)"
$ro2 = Invoke-Api $admin PATCH "/api/admin/users/$uid/roles" @{ roleCode = "COMPLIANCE_SUPERVISOR" }
Check "role change -> 200 and SUPERVISOR" ($ro2.Code -eq 200 -and $ro2.Json.roleCode -eq "COMPLIANCE_SUPERVISOR") "status $($ro2.Code) $($ro2.Text)"
$list = Invoke-Api $admin GET "/api/admin/users"
$mine = @($list.Json | Where-Object { $_.userId -eq $uid })
Check "the listing shows exactly one role (replaced, not added)" ($mine.Count -eq 1 -and $mine[0].roleCode -eq "COMPLIANCE_SUPERVISOR")
$ro3 = Invoke-Api $admin PATCH "/api/admin/users/$uid/roles" @{ roleCode = "COMPLIANCE_MONITOR" }
Check "role back to MONITOR -> 200" ($ro3.Code -eq 200 -and $ro3.Json.roleCode -eq "COMPLIANCE_MONITOR")

# ---------------- monitor must not be able to PATCH ----------------
Write-Host "`n--- A Monitor must get 403 on every PATCH ---"
$tmp2 = New-Client
$s2 = Sign-In $tmp2 $uname $temp
$newPw = "Sm0ke-" + (-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 14 | ForEach-Object { [char]$_ }))
$ch = Invoke-Api $tmp2 POST "/api/auth/password/change" @{ currentPassword = $temp; newPassword = $newPw }
Check "temporary password is changed (204)" ($ch.Code -eq 204) "status $($ch.Code)"
$temp = $null
$mon = New-Client
$s3 = Sign-In $mon $uname $newPw
$newPw = $null
Check "monitor signs in with the new password" ($s3.Code -eq 200 -and -not (MustChange $s3)) "status $($s3.Code)"

$m1 = Invoke-Api $mon PATCH "/api/employers/$eid" @{ legalName = "Hacked by monitor" }
Check "monitor PATCH employer -> 403" ($m1.Code -eq 403) "status $($m1.Code)"
$m2 = Invoke-Api $mon PATCH "/api/contribution-periods/$pid3/status" @{ status = "CLOSED" }
Check "monitor PATCH period status -> 403" ($m2.Code -eq 403) "status $($m2.Code)"
$m3 = Invoke-Api $mon PATCH "/api/admin/users/$uid/status" @{ accountStatus = "DISABLED" }
Check "monitor PATCH user status -> 403" ($m3.Code -eq 403) "status $($m3.Code)"
$m4 = Invoke-Api $mon PATCH "/api/admin/users/$uid/roles" @{ roleCode = "SYSTEM_ADMINISTRATOR" }
Check "monitor cannot promote itself -> 403" ($m4.Code -eq 403) "status $($m4.Code)"

$v1 = Invoke-Api $admin GET "/api/employers/$eid"
Check "nothing changed: employer name" ($v1.Json.legalName -eq "Patch Test Ltd 2")
$v2 = Invoke-Api $admin GET "/api/contribution-periods/$pid3"
Check "nothing changed: period still OPEN" ($v2.Json.status -eq "OPEN")
$list2 = Invoke-Api $admin GET "/api/admin/users"
$mine2 = @($list2.Json | Where-Object { $_.userId -eq $uid })
Check "nothing changed: the monitor is still a monitor" ($mine2.Count -eq 1 -and $mine2[0].roleCode -eq "COMPLIANCE_MONITOR")

# ---------------- optional: last administrator ----------------
if ($IncludeLastAdminTest) {
    Write-Host "`n--- Last active administrator protection ---"
    $adm = @($list2.Json | Where-Object { $_.username -eq $AdminIdentifier })
    if ($adm.Count -eq 1) {
        $la = Invoke-Api $admin PATCH "/api/admin/users/$($adm[0].userId)/status" @{ accountStatus = "DISABLED" }
        Check "disabling the only active administrator is refused" ($la.Code -ge 400 -and $la.Code -lt 500) "status $($la.Code)"
        if ($la.Code -eq 200) {
            Write-Host "The administrator was DISABLED. Recover with SQL:  UPDATE app_user SET account_status='ACTIVE', failed_login_attempts=0, locked_until=NULL WHERE username='$AdminIdentifier';" -ForegroundColor Yellow
            Show-Summary; exit 1
        }
    } else { Note "administrator account not found in the listing; skipped" }
}

# ---------------- audit trail (best effort) ----------------
Write-Host "`n--- Audit trail ---"
$ae = Invoke-Api $admin GET "/api/admin/audit-events"
if ($ae.Code -eq 200) {
    $types = @([regex]::Matches($ae.Text, '"eventType"\s*:\s*"([A-Z_]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
    if ($types.Count -gt 0) {
        Note ("event types present: " + ($types -join ", "))
        foreach ($t in "EMPLOYER_UPDATED", "USER_STATUS_CHANGED", "USER_ROLE_CHANGED") {
            Check "audit trail contains $t" ($types -contains $t)
        }
    } else {
        $snippet = $ae.Text.Substring(0, [Math]::Min(200, $ae.Text.Length))
        Note "could not read event types; response starts with: $snippet"
    }
} else { Note "audit-events endpoint returned $($ae.Code)" }

# ---------------- tidy up ----------------
$null = Invoke-Api $admin PATCH "/api/admin/users/$uid/status" @{ accountStatus = "DISABLED" }
$null = Invoke-Api $admin PATCH "/api/employers/$eid" @{ status = "INACTIVE" }
Write-Host ""
Write-Host "Test data left behind (remove with the SQL below): employer $ref, user $uname (now disabled), three periods in years 2150-2199." -ForegroundColor Yellow
Show-Summary