param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$AdminIdentifier = "admin",
    [string]$TypesFile = "..\..\frontend\src\api\module2Api.ts"
)
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\_lib.ps1"
$global:SC_BaseUrl = $BaseUrl

# ---- read the TypeScript interfaces: name -> declared field names ----
$ts = [System.IO.File]::ReadAllText((Resolve-Path (Join-Path $PSScriptRoot $TypesFile)))
$interfaces = @{}
foreach ($m in [regex]::Matches($ts, 'export interface (\w+)(?:<[^>]*>)?\s*\{(.*?)\n\}', 'Singleline')) {
    $fields = @()
    foreach ($line in ($m.Groups[2].Value -split "`n")) {
        if ($line -match '^\s{2}(\w+)\??\s*:') { $fields += $Matches[1] }
    }
    $interfaces[$m.Groups[1].Value] = $fields
}
Note ("interfaces found: " + (($interfaces.Keys | Sort-Object) -join ", "))

function Get-Sample($r) {
    if ($r.Code -ne 200 -or $null -eq $r.Json) { return $null }
    if ($r.Json -is [array]) { return ($r.Json | Select-Object -First 1) }
    if ($r.Json.PSObject.Properties.Name -contains "content") { return (@($r.Json.content) | Select-Object -First 1) }
    return $r.Json
}

function Compare-Contract($type, $sample) {
    if (-not $interfaces.ContainsKey($type)) { Note "$type is not declared in the types file"; return }
    if ($null -eq $sample) { Note "$type : no sample row available (empty list or error), skipped"; return }
    $json = @($sample.PSObject.Properties.Name)
    $decl = $interfaces[$type]
    $phantom = @($decl | Where-Object { $json -notcontains $_ })
    $unused  = @($json | Where-Object { $decl -notcontains $_ })
    Check "$type : every declared field is really sent by the API" ($phantom.Count -eq 0) ("declared but never sent: " + ($phantom -join ", "))
    if ($unused.Count -gt 0) { Note "$type : sent by the API but not declared: $($unused -join ', ')" }
}

$c = New-Client
$pw = Read-Secret "APPLICATION password for $AdminIdentifier"
$r = Sign-In $c $AdminIdentifier $pw
$pw = $null
Check "signs in" ($r.Code -eq 200) "status $($r.Code)"
if ($r.Code -ne 200) { exit 1 }

Compare-Contract "Employer"           (Get-Sample (Invoke-Api $c GET "/api/employers"))
Compare-Contract "Member"             (Get-Sample (Invoke-Api $c GET "/api/members"))
Compare-Contract "ContributionPeriod" (Get-Sample (Invoke-Api $c GET "/api/contribution-periods"))
Compare-Contract "DataSource"         (Get-Sample (Invoke-Api $c GET "/api/data-sources"))
Compare-Contract "ContributionRule"   (Get-Sample (Invoke-Api $c GET "/api/contribution-rules"))

$batches = Invoke-Api $c GET "/api/payroll/batches"
Compare-Contract "PayrollBatch" (Get-Sample $batches)
$first = Get-Sample $batches
if ($first) {
    $bid = $first.payrollBatchId
    Compare-Contract "PayrollRecord"           (Get-Sample (Invoke-Api $c GET "/api/payroll/batches/$bid/records"))
    Compare-Contract "PayrollQuarantineRecord" (Get-Sample (Invoke-Api $c GET "/api/payroll/batches/$bid/quarantine"))
}

$prev = Invoke-Api $c POST "/api/contribution-calculations/preview" @{ grossPay = 100; date = "2026-03-01"; ruleCode = "NAPSA_FORMAL" }
Compare-Contract "CalculationPreviewResponse" (Get-Sample $prev)

Show-Summary