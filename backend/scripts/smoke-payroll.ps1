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

function Invoke-CsvUpload($Client, [string]$Path, [hashtable]$Fields, [string]$FileName, [string]$CsvContent) {
    $boundary = "----SmartComplianceBoundary" + [Guid]::NewGuid().ToString("N")
    $sb = New-Object System.Text.StringBuilder
    foreach ($k in $Fields.Keys) {
        $null = $sb.Append("--$boundary`r`n")
        $null = $sb.Append("Content-Disposition: form-data; name=`"$k`"`r`n`r`n")
        $null = $sb.Append("$($Fields[$k])`r`n")
    }
    $null = $sb.Append("--$boundary`r`n")
    $null = $sb.Append("Content-Disposition: form-data; name=`"file`"; filename=`"$FileName`"`r`n")
    $null = $sb.Append("Content-Type: text/csv`r`n`r`n")
    $null = $sb.Append($CsvContent)
    if (-not $CsvContent.EndsWith("`n")) { $null = $sb.Append("`r`n") }
    $null = $sb.Append("--$boundary--`r`n")

    $headers = @{}
    if ($Client.Csrf) { $headers[$Client.Csrf.headerName] = $Client.Csrf.token }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($sb.ToString())
    $code = 0; $text = ""
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl$Path" -Method POST -Headers $headers `
            -ContentType "multipart/form-data; boundary=$boundary" -Body $bytes `
            -WebSession $Client.Web -UseBasicParsing
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

# ---- anonymous blocked ----
$anon = New-Client
Check "anonymous payroll batches list -> 401" ((Invoke-Api $anon GET "/api/payroll/batches").Code -eq 401)

# ---- admin sign-in ----
$admin = New-Client
$pw = Read-Secret "APPLICATION password for $AdminIdentifier"
$r = Sign-In $admin $AdminIdentifier $pw
$pw = $null
Check "admin login succeeds" ($r.Code -eq 200) "status $($r.Code)"
if ($r.Code -ne 200) { exit 1 }

# ---- setup Employer, Period, DataSource ----
$suffix = Get-Random -Maximum 999999
$emp = Invoke-Api $admin POST "/api/employers" @{
    employerRef = "SMK-PAY-EMP-$suffix"
    legalName = "Smoke Payroll Employer $suffix Ltd"
}
$empId = if ($emp.Json) { $emp.Json.employerId } else { $null }

$year = 2030 + ($suffix % 160)
$month = ($suffix % 12) + 1
$per = Invoke-Api $admin POST "/api/contribution-periods" @{ periodYear = $year; periodMonth = $month }
$perId = if ($per.Json) { $per.Json.periodId } else { $null }

$src = Invoke-Api $admin POST "/api/data-sources" @{
    sourceName = "SMK-PAY-SRC-$suffix"
    sourceType = "SYNTHETIC"
    permittedPurpose = "Payroll import smoke test"
}
$srcId = if ($src.Json) { $src.Json.sourceId } else { $null }

Check "prerequisites created (employer=$empId, period=$perId, source=$srcId)" (
    $emp.Code -eq 201 -and $per.Code -eq 201 -and $src.Code -eq 201 -and $empId -and $perId -and $srcId
) "emp=$($emp.Code) $($emp.Text) | per=$($per.Code) $($per.Text) | src=$($src.Code) $($src.Text)"
if (-not ($empId -and $perId -and $srcId)) { exit 1 }

# ---- JSON import: valid, explicit 0.00, NULL pay, missing member, negative pay, duplicate ----
$batchRef = "SMK-BATCH-$suffix"
$imp1 = Invoke-Api $admin POST "/api/payroll/batches/import" @{
    employerId = $empId
    periodId = $perId
    sourceId = $srcId
    batchRef = $batchRef
    rows = @(
        @{ memberRef = "SMK-PM-$suffix-1"; sourceMemberRef = "EXT-1"; sourceRowRef = "ROW-1"; eligibleGrossPay = 20000.00; payrollStatus = "ACTIVE" },
        @{ memberRef = "SMK-PM-$suffix-2"; sourceMemberRef = "EXT-2"; sourceRowRef = "ROW-2"; eligibleGrossPay = 0.00; payrollStatus = "ACTIVE" },
        @{ memberRef = "SMK-PM-$suffix-3"; sourceMemberRef = "EXT-3"; sourceRowRef = "ROW-3"; eligibleGrossPay = $null; payrollStatus = "ACTIVE" },
        @{ memberRef = ""; sourceMemberRef = "EXT-BAD"; sourceRowRef = "ROW-4"; eligibleGrossPay = 5000.00 },
        @{ memberRef = "SMK-PM-$suffix-NEG"; sourceRowRef = "ROW-5"; eligibleGrossPay = -250.00 },
        @{ memberRef = "SMK-PM-$suffix-1"; sourceRowRef = "ROW-6"; eligibleGrossPay = 20000.00 }
    )
}
Check "JSON mixed import -> 201" ($imp1.Code -eq 201) "status $($imp1.Code) $($imp1.Text)"
$b1Id = $imp1.Json.batch.payrollBatchId
Check "v1 status=VALIDATED, version=1, current=true, valid=2, nullPay=1, quar=3, dup=1, createdMembers=3" (
    $imp1.Json.batch.status -eq "VALIDATED" -and
    $imp1.Json.batch.versionNo -eq 1 -and
    $imp1.Json.batch.current -eq $true -and
    $imp1.Json.validRecordCount -eq 2 -and
    $imp1.Json.missingPayRecordCount -eq 1 -and
    $imp1.Json.quarantinedRecordCount -eq 3 -and
    $imp1.Json.duplicateRowCount -eq 1 -and
    $imp1.Json.autoCreatedMemberCount -eq 3 -and
    $imp1.Json.processingTimeMs -ge 0
) "got $($imp1.Text)"

# ---- Verify stored records distinguish NULL from 0.00 ----
$recs1 = Invoke-Api $admin GET "/api/payroll/batches/$b1Id/records?size=20"
$zeroRow = $recs1.Json.content | Where-Object { $_.sourceRowRef -eq "ROW-2" }
$nullRow = $recs1.Json.content | Where-Object { $_.sourceRowRef -eq "ROW-3" }
Check "stored records preserve 0.00 as VALID and NULL as ISSUE" (
    $recs1.Code -eq 200 -and
    $zeroRow.eligibleGrossPay -eq 0 -and $zeroRow.dataQualityStatus -eq "VALID" -and
    $null -eq $nullRow.eligibleGrossPay -and $nullRow.dataQualityStatus -eq "ISSUE"
) "recs $($recs1.Text)"

$quar1 = Invoke-Api $admin GET "/api/payroll/batches/$b1Id/quarantine"
Check "quarantine endpoint lists 3 rows with reasons" (
    $quar1.Code -eq 200 -and $quar1.Json.totalElements -eq 3
) "quar $($quar1.Text)"

# ---- Duplicate batchRef without supersedesBatchId -> 409 ----
$dupRef = Invoke-Api $admin POST "/api/payroll/batches/import" @{
    employerId = $empId; periodId = $perId; sourceId = $srcId; batchRef = $batchRef
    rows = @(@{ memberRef = "SMK-PM-$suffix-1"; eligibleGrossPay = 1000 })
}
Check "duplicate batchRef without supersedesBatchId -> 409" ($dupRef.Code -eq 409) "status $($dupRef.Code)"

# ---- Supersession v2 via CSV upload ----
$csvData = "member_ref,source_row_ref,eligible_gross_pay,payroll_status`r`nSMK-PM-$suffix-1,ROW-1,22000.00,ACTIVE`r`nSMK-PM-$suffix-2,ROW-2,0.00,ACTIVE`r`n"
$imp2 = Invoke-CsvUpload $admin "/api/payroll/batches/import-csv" @{
    employerId = $empId; periodId = $perId; sourceId = $srcId
    batchRef = $batchRef; supersedesBatchId = $b1Id
} "correction.csv" $csvData
Check "CSV correction import -> 201" ($imp2.Code -eq 201) "status $($imp2.Code) $($imp2.Text)"
$b2Id = $imp2.Json.batch.payrollBatchId
Check "v2 version=2, supersedesBatchId=v1, current=true" (
    $imp2.Json.batch.versionNo -eq 2 -and
    $imp2.Json.batch.supersedesBatchId -eq $b1Id -and
    $imp2.Json.batch.current -eq $true
) "got $($imp2.Text)"

$b1After = Invoke-Api $admin GET "/api/payroll/batches/$b1Id"
Check "v1 marked SUPERSEDED, current=false, supersededBy=v2" (
    $b1After.Json.status -eq "SUPERSEDED" -and
    $b1After.Json.current -eq $false -and
    $b1After.Json.supersededByBatchId -eq $b2Id
) "got $($b1After.Text)"

$reSup = Invoke-Api $admin POST "/api/payroll/batches/import" @{
    employerId = $empId; periodId = $perId; sourceId = $srcId; batchRef = $batchRef; supersedesBatchId = $b1Id
    rows = @(@{ memberRef = "SMK-PM-$suffix-1"; eligibleGrossPay = 23000 })
}
Check "superseding an already-superseded batch -> 409" ($reSup.Code -eq 409) "status $($reSup.Code)"

$cur = Invoke-Api $admin GET "/api/payroll/batches/current?employerId=$empId&periodId=$perId"
Check "current endpoint resolves v2" ($cur.Code -eq 200 -and $cur.Json.payrollBatchId -eq $b2Id)

# ---- All-invalid batch -> REJECTED without invalidating v2 ----
$badBatch = Invoke-Api $admin POST "/api/payroll/batches/import" @{
    employerId = $empId; periodId = $perId; sourceId = $srcId
    batchRef = "SMK-BAD-$suffix"
    rows = @(@{ memberRef = "SMK-PM-BAD-$suffix"; eligibleGrossPay = -10.00 })
}
Check "all-invalid standalone batch saved as REJECTED" (
    $badBatch.Code -eq 201 -and $badBatch.Json.batch.status -eq "REJECTED" -and $badBatch.Json.quarantinedRecordCount -eq 1
) "got $($badBatch.Text)"

# ---- Pagination, currentOnly filter, & bad status filter ----
$curList = Invoke-Api $admin GET "/api/payroll/batches?employerId=$empId&periodId=$perId&currentOnly=true&size=500"
Check "currentOnly=true returns only v2 and caps page size at 100" (
    $curList.Code -eq 200 -and $curList.Json.size -eq 100 -and
    $curList.Json.totalElements -eq 1 -and $curList.Json.content[0].payrollBatchId -eq $b2Id
) "got $($curList.Text)"
Check "unknown status filter -> 400" ((Invoke-Api $admin GET "/api/payroll/batches?status=BOGUS").Code -eq 400)

# ---- Monitor RBAC checks ----
$mon = New-Client
$mpw = Read-Secret "APPLICATION password for $MonitorIdentifier (press Enter to skip)"
if ($mpw) {
    $mr = Sign-In $mon $MonitorIdentifier $mpw
    $mpw = $null
    Check "monitor signs in" ($mr.Code -eq 200) "status $($mr.Code)"
    if ($mr.Code -eq 200) {
        Check "monitor can list payroll batches (200)" ((Invoke-Api $mon GET "/api/payroll/batches").Code -eq 200)
        Check "monitor can view batch records (200)" ((Invoke-Api $mon GET "/api/payroll/batches/$b2Id/records").Code -eq 200)
        Check "monitor can view quarantine rows (200)" ((Invoke-Api $mon GET "/api/payroll/batches/$b1Id/quarantine").Code -eq 200)
        $monImp = Invoke-Api $mon POST "/api/payroll/batches/import" @{
            employerId = $empId; periodId = $perId; sourceId = $srcId; batchRef = "SMK-FORB-$suffix"
            rows = @(@{ memberRef = "SMK-PM-$suffix-1"; eligibleGrossPay = 1000 })
        }
        Check "monitor cannot import payroll batch (403)" ($monImp.Code -eq 403) "status $($monImp.Code) $($monImp.Text)"
    }
}

Write-Host ""
Write-Host ("Passed: " + $script:Pass + "   Failed: " + $script:Fail)