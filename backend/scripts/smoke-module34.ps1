param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$AdminIdentifier = "admin"
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\_lib.ps1"
$global:SC_BaseUrl = $BaseUrl

# ---------------- 1. Administrator Sign-In ----------------
$admin = New-Client
$pw = Read-Secret "APPLICATION password for $AdminIdentifier (not the database password)"
$r = Sign-In $admin $AdminIdentifier $pw
$pw = $null
Check "administrator signs in" ($r.Code -eq 200 -and -not (MustChange $r)) "status $($r.Code)"
if ($r.Code -ne 200) { exit 1 }

$meAdmin = Invoke-Api $admin GET "/api/auth/me"
$adminUserId = $meAdmin.Json.userId
Note "Signed in as userId=$adminUserId ($($meAdmin.Json.username))"

# ---------------- 2. Setup Reference & Module 2 Data ----------------
Write-Host "`n--- Setup: Employer, Period, Rule, DataSource, Member, Payroll ---"
$suffix = Get-Random -Minimum 100000 -Maximum 999999

$rulesRes = Invoke-Api $admin GET "/api/contribution-rules"
Check "GET /api/contribution-rules -> 200" ($rulesRes.Code -eq 200 -and @($rulesRes.Json).Count -ge 1) "status $($rulesRes.Code)"
$rule = @($rulesRes.Json)[0]
$ruleCode = $rule.ruleCode
$effFrom = [datetime]$rule.effectiveFrom
Note "Using contribution rule '$ruleCode' (effectiveFrom=$($rule.effectiveFrom))"

$periodRes = $null
$baseYear = [Math]::Max($effFrom.Year, 2026)
for ($offset = 0; $offset -lt 60; $offset++) {
    $cand = $effFrom.AddMonths($offset)
    if ($cand.Year -lt $baseYear) { continue }
    $tryP = Invoke-Api $admin POST "/api/contribution-periods" @{ periodYear = $cand.Year; periodMonth = $cand.Month }
    if ($tryP.Code -eq 201) {
        $periodRes = $tryP
        break
    }
}
Check "setup: OPEN contribution period created" ($null -ne $periodRes -and $periodRes.Code -eq 201)
if (-not $periodRes) { exit 1 }
$periodId = $periodRes.Json.periodId
$periodStart = $periodRes.Json.periodStart
$periodEnd = $periodRes.Json.periodEnd

$empRef = "SMK-M34-EMP-$suffix"
$empRes = Invoke-Api $admin POST "/api/employers" @{
    employerRef = $empRef
    legalName   = "Module 34 Smoke Employer $suffix Ltd"
    tradingName = "M34 Smoke"
}
Check "setup: employer created ($empRef)" ($empRes.Code -eq 201) "status $($empRes.Code) $($empRes.Text)"
$employerId = $empRes.Json.employerId

$srcCode = "SMK-M34-SRC-$suffix"
$srcRes = Invoke-Api $admin POST "/api/data-sources" @{
    sourceCode         = $srcCode
    sourceName         = "SMK-M34 Feed $suffix"
    sourceType         = "PAYROLL_EXPORT"
    ownerName          = "Smoke Test Authority"
    authorityReference = "AUTH-$suffix"
    permittedPurpose   = "End-to-end Module 3/4 verification"
}
Check "setup: data source created ($srcCode)" ($srcRes.Code -eq 201) "status $($srcRes.Code) $($srcRes.Text)"
$sourceId = $srcRes.Json.sourceId

$memRef = "SMK-M34-MEM-$suffix"
$memRes = Invoke-Api $admin POST "/api/members" @{
    memberRef       = $memRef
    sourceMemberRef = "SRC-MEM-$suffix"
    status          = "ACTIVE"
}
Check "setup: member created ($memRef)" ($memRes.Code -eq 201) "status $($memRes.Code) $($memRes.Text)"
$memberId = $memRes.Json.memberId

$batchRef = "SMK-M34-BATCH-$suffix"
$batchRes = Invoke-Api $admin POST "/api/payroll/batches/import" @{
    employerId = $employerId
    periodId   = $periodId
    sourceId   = $sourceId
    batchRef   = $batchRef
    rows       = @(
        @{
            memberRef        = $memRef
            sourceMemberRef  = "SRC-MEM-$suffix"
            sourceRowRef     = "ROW-1"
            eligibleGrossPay = 10000.00
            payrollStatus    = "ACTIVE"
        }
    )
}
Check "setup: payroll batch imported ($batchRef)" ($batchRes.Code -eq 201) "status $($batchRes.Code) $($batchRes.Text)"

# ---------------- 3. Module 3: Returns & Versioning ----------------
Write-Host "`n--- Module 3: Returns & Versioning ---"
$retRef = "SMK-M34-RET-$suffix"
$ret1 = Invoke-Api $admin POST "/api/returns" @{
    employerId             = $employerId
    periodId               = $periodId
    sourceId               = $sourceId
    returnType             = "STANDARD"
    returnRef              = $retRef
    reportedEmployeeAmount = 300.00
    reportedEmployerAmount = 300.00
    reportedTotalAmount    = 600.00
    completenessStatus     = "COMPLETE"
    sourceDocumentRef      = "DOC-V1-$suffix"
    lines                  = @(
        @{
            memberId               = $memberId
            lineRef                = "LINE-1"
            reportedPay            = 6000.00
            reportedEmployeeAmount = 300.00
            reportedEmployerAmount = 300.00
            reportedTotalAmount    = 600.00
            lineStatus             = "VALID"
        }
    )
}
Check "POST /api/returns (v1) -> 201" ($ret1.Code -eq 201 -and $ret1.Json.versionNo -eq 1) "status $($ret1.Code) $($ret1.Text)"
$returnId = $ret1.Json.returnId
$v1Id = $ret1.Json.returnVersionId

$ret2 = Invoke-Api $admin POST "/api/returns" @{
    employerId             = $employerId
    periodId               = $periodId
    sourceId               = $sourceId
    returnType             = "STANDARD"
    returnRef              = $retRef
    reportedEmployeeAmount = 250.00
    reportedEmployerAmount = 250.00
    reportedTotalAmount    = 500.00
    completenessStatus     = "COMPLETE"
    supersedesReturnId     = $returnId
    sourceDocumentRef      = "DOC-V2-$suffix"
    lines                  = @(
        @{
            memberId               = $memberId
            lineRef                = "LINE-1"
            reportedPay            = 5000.00
            reportedEmployeeAmount = 250.00
            reportedEmployerAmount = 250.00
            reportedTotalAmount    = 500.00
            lineStatus             = "VALID"
        }
    )
}
Check "POST /api/returns (v2 superseding) -> 201 with versionNo=2" ($ret2.Code -eq 201 -and $ret2.Json.versionNo -eq 2 -and $ret2.Json.supersedesVersionId -eq $v1Id) "status $($ret2.Code) $($ret2.Text)"
$v2Id = $ret2.Json.returnVersionId

$retList = Invoke-Api $admin GET "/api/returns?employerId=$employerId&periodId=$periodId"
Check "GET /api/returns filtered -> 200" ($retList.Code -eq 200 -and $retList.Json.totalElements -ge 1) "status $($retList.Code)"

$vers = Invoke-Api $admin GET "/api/returns/$returnId/versions"
Check "GET /api/returns/{returnId}/versions -> 200 (2 versions)" ($vers.Code -eq 200 -and @($vers.Json).Count -eq 2) "status $($vers.Code)"

$lines = Invoke-Api $admin GET "/api/returns/versions/$v2Id/lines"
Check "GET /api/returns/versions/{versionId}/lines -> 200" ($lines.Code -eq 200 -and @($lines.Json).Count -eq 1) "status $($lines.Code) $($lines.Text)"

# ---------------- 4. Module 3: Payments, Allocations & Completeness ----------------
Write-Host "`n--- Module 3: Payments, Allocations & Completeness ---"
$txRef = "SMK-M34-PAY-$suffix"
$payRes = Invoke-Api $admin POST "/api/payments" @{
    sourceId               = $sourceId
    externalTransactionRef = $txRef
    employerRefAsReceived  = $empRef
    transactionAmount      = 500.00
    currencyCode           = "ZMW"
    transactionStatus      = "CONFIRMED"
    sourceRecordRef        = "BANK-REC-$suffix"
}
Check "POST /api/payments -> 201" ($payRes.Code -eq 201) "status $($payRes.Code) $($payRes.Text)"
$paymentId = $payRes.Json.paymentId

$allocRes = Invoke-Api $admin POST "/api/payments/allocations" @{
    paymentId       = $paymentId
    employerId      = $employerId
    periodId        = $periodId
    allocatedAmount = 500.00
}
Check "POST /api/payments/allocations -> 201" ($allocRes.Code -eq 201) "status $($allocRes.Code) $($allocRes.Text)"

$overAlloc = Invoke-Api $admin POST "/api/payments/allocations" @{
    paymentId       = $paymentId
    employerId      = $employerId
    periodId        = $periodId
    allocatedAmount = 1.00
}
Check "over-allocation rejected -> 409 Conflict" ($overAlloc.Code -eq 409) "status $($overAlloc.Code)"

$compRes = Invoke-Api $admin POST "/api/completeness" @{
    sourceId         = $sourceId
    scopeType        = "EMPLOYER_PERIOD"
    scopeStart       = $periodStart
    scopeEnd         = $periodEnd
    employerId       = $employerId
    periodId         = $periodId
    assessmentStatus = "COMPLETE"
    evidenceNotes    = "All feeds verified for smoke run $suffix"
}
Check "POST /api/completeness -> 201" ($compRes.Code -eq 201) "status $($compRes.Code) $($compRes.Text)"

# ---------------- 5. Module 3: Compliance Analysis Execution & Snapshots ----------------
Write-Host "`n--- Module 3: Analysis Execution & Immutable Snapshots ---"
$savedCsrf = $admin.Csrf
$admin.Csrf = @{ headerName = $savedCsrf.headerName; token = "invalid-csrf-token-$suffix" }
$badCsrfExec = Invoke-Api $admin POST "/api/analyses/execute" @{
    employerId = $employerId
    periodId   = $periodId
    ruleCode   = $ruleCode
}
$admin.Csrf = $savedCsrf
Check "POST /api/analyses/execute with invalid CSRF -> 403" ($badCsrfExec.Code -eq 403) "status $($badCsrfExec.Code)"

$exec1 = Invoke-Api $admin POST "/api/analyses/execute" @{
    employerId = $employerId
    periodId   = $periodId
    ruleCode   = $ruleCode
}
Check "POST /api/analyses/execute -> 201 REQUIRES_REVIEW" ($exec1.Code -eq 201 -and $exec1.Json.overallResult -eq "REQUIRES_REVIEW") "status $($exec1.Code) result=$($exec1.Json.overallResult) $($exec1.Text)"
$analysisId = $exec1.Json.analysisId
$snapshotId = $exec1.Json.snapshotId
Note "Snapshot #$snapshotId created (run=$($exec1.Json.runNumber), expected=$($exec1.Json.totalExpected), reported=$($exec1.Json.totalReported), allocated=$($exec1.Json.totalAllocatedPayments))"

$snapDetail = Invoke-Api $admin GET "/api/analyses/snapshots/$snapshotId"
Check "GET /api/analyses/snapshots/{snapshotId} -> 200 with calculations" ($snapDetail.Code -eq 200 -and @($snapDetail.Json.calculations).Count -ge 1) "status $($snapDetail.Code)"

$snapHist = Invoke-Api $admin GET "/api/analyses/$analysisId/snapshots"
Check "GET /api/analyses/{analysisId}/snapshots -> 200" ($snapHist.Code -eq 200 -and @($snapHist.Json).Count -ge 1) "status $($snapHist.Code)"

# ---------------- 6. Module 4: Findings & Investigation Cases ----------------
Write-Host "`n--- Module 4: Findings & Investigation Case Lifecycle ---"
$findingsRes = Invoke-Api $admin GET "/api/findings/compliance?snapshotId=$snapshotId"
$myFindings = @($findingsRes.Json | Where-Object { $_.snapshotId -eq $snapshotId })
Check "GET /api/findings/compliance -> 200 with finding for snapshot" ($findingsRes.Code -eq 200 -and $myFindings.Count -ge 1) "status $($findingsRes.Code) count=$($myFindings.Count)"
$findingId = $myFindings[0].findingId

$fPatch = Invoke-Api $admin PATCH "/api/findings/compliance/$findingId/status" @{ status = "UNDER_REVIEW" }
Check "PATCH /api/findings/compliance/{id}/status -> 200 UNDER_REVIEW" ($fPatch.Code -eq 200 -and $fPatch.Json.status -eq "UNDER_REVIEW") "status $($fPatch.Code) $($fPatch.Text)"

$caseCreate = Invoke-Api $admin POST "/api/cases" @{
    title          = "SMK-M34 Underpayment Investigation $suffix"
    description    = "Automated smoke verification case linked to finding #$findingId"
    priority       = "HIGH"
    assignedUserId = $adminUserId
    findingIds     = @($findingId)
}
Check "POST /api/cases -> 201 with linked finding" ($caseCreate.Code -eq 201 -and @($caseCreate.Json.linkedFindings).Count -eq 1) "status $($caseCreate.Code) $($caseCreate.Text)"
$caseId = $caseCreate.Json.caseId

$casePrio = Invoke-Api $admin PATCH "/api/cases/$caseId/priority" @{
    priority      = "CRITICAL"
    justification = "Confirmed material variance in smoke test"
}
Check "PATCH /api/cases/{id}/priority -> 200 CRITICAL" ($casePrio.Code -eq 200 -and $casePrio.Json.priority -eq "CRITICAL") "status $($casePrio.Code)"

$caseStatus = Invoke-Api $admin PATCH "/api/cases/$caseId/status" @{
    status = "UNDER_INVESTIGATION"
    note   = "Starting formal review"
}
Check "PATCH /api/cases/{id}/status -> 200 UNDER_INVESTIGATION" ($caseStatus.Code -eq 200 -and $caseStatus.Json.caseStatus -eq "UNDER_INVESTIGATION") "status $($caseStatus.Code)"

$caseDetail = Invoke-Api $admin GET "/api/cases/$caseId"
Check "GET /api/cases/{id} -> 200 with assignment history" ($caseDetail.Code -eq 200 -and @($caseDetail.Json.assignmentHistory).Count -ge 1) "status $($caseDetail.Code)"

# ---------------- 7. RBAC: Compliance Monitor Permissions ----------------
Write-Host "`n--- RBAC: COMPLIANCE_MONITOR Operational Access vs Supervisor-Only Controls ---"
$monUser = "smoke_m34_mon_$suffix"
$cu = Invoke-Api $admin POST "/api/admin/users" @{
    username           = $monUser
    institutionalEmail = "$monUser@smartcompliance.local"
    displayName        = "Smoke M34 Monitor"
    roleCode           = "COMPLIANCE_MONITOR"
}
Check "setup: temporary monitor created" ($cu.Code -eq 201) "status $($cu.Code)"
$monUid = $cu.Json.user.userId
$tempPw = $cu.Json.temporaryPassword

$tmp = New-Client
$null = Sign-In $tmp $monUser $tempPw
$newPw = "Sm0keM34-" + (-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 12 | ForEach-Object { [char]$_ }))
$ch = Invoke-Api $tmp POST "/api/auth/password/change" @{ currentPassword = $tempPw; newPassword = $newPw }
Check "monitor changes temporary password -> 204" ($ch.Code -eq 204) "status $($ch.Code)"

$mon = New-Client
$sMon = Sign-In $mon $monUser $newPw
Check "monitor signs in -> 200" ($sMon.Code -eq 200) "status $($sMon.Code)"

Check "monitor GET /api/returns -> 200" ((Invoke-Api $mon GET "/api/returns").Code -eq 200)
Check "monitor GET /api/analyses -> 200" ((Invoke-Api $mon GET "/api/analyses").Code -eq 200)
Check "monitor GET /api/cases -> 200" ((Invoke-Api $mon GET "/api/cases").Code -eq 200)

$monTriage = Invoke-Api $mon PATCH "/api/findings/compliance/$findingId/status" @{ status = "CONFIRMED" }
Check "monitor PATCH /api/findings/compliance/{id}/status -> 200" ($monTriage.Code -eq 200 -and $monTriage.Json.status -eq "CONFIRMED") "status $($monTriage.Code)"

$monCase = Invoke-Api $mon POST "/api/cases" @{
    title       = "SMK-M34 Monitor Case $suffix"
    description = "Monitor-initiated investigation case"
    priority    = "MEDIUM"
}
Check "monitor POST /api/cases -> 201" ($monCase.Code -eq 201) "status $($monCase.Code)"

Check "monitor POST /api/returns -> 403" ((Invoke-Api $mon POST "/api/returns" @{
    employerId = $employerId; periodId = $periodId; sourceId = $sourceId; returnType = "STANDARD"
}).Code -eq 403)

Check "monitor POST /api/analyses/execute -> 403" ((Invoke-Api $mon POST "/api/analyses/execute" @{
    employerId = $employerId; periodId = $periodId
}).Code -eq 403)

Check "monitor PATCH /api/cases/{id}/assign -> 403" ((Invoke-Api $mon PATCH "/api/cases/$caseId/assign" @{
    assignedUserId = $monUid; note = "Unauthorized reassignment"
}).Code -eq 403)

Check "monitor PATCH /api/cases/{id}/priority -> 403" ((Invoke-Api $mon PATCH "/api/cases/$caseId/priority" @{
    priority = "LOW"; justification = "Unauthorized priority override"
}).Code -eq 403)

# ---------------- Tidy up temporary user ----------------
$null = Invoke-Api $admin PATCH "/api/admin/users/$monUid/status" @{ accountStatus = "DISABLED" }
Note "Disabled temporary monitor user $monUser (synthetic records tagged SMK-M34-*)"
Show-Summary
if ($global:SC_Fail -gt 0) { exit 1 }
