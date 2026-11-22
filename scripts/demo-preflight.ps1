function Test-Port($name, $port) {
    $ok = (Test-NetConnection 127.0.0.1 -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded
    "{0,-18} port {1,-5} {2}" -f $name, $port, $(if ($ok) { "PASS" } else { "FAIL" })
}
function Get-Status($url) {
    try { [int](Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5).StatusCode }
    catch { if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "NO RESPONSE" } }
}
Test-Port "PostgreSQL" 5432
Test-Port "Spring Boot API" 8080
Test-Port "ML service" 8090
Test-Port "React frontend" 5173
"Backend auth gate (expect 401): " + (Get-Status "http://localhost:8080/api/auth/me")
"ML service docs   (expect 200): " + (Get-Status "http://localhost:8090/docs")
"Frontend          (expect 200): " + (Get-Status "http://localhost:5173")

function Obs($pid_, $ym, $members, $gross) {
    [ordered]@{ employer_id = 999; period_id = $pid_; period_ym = $ym; active_batch_count = 1; latest_return_count = 1
        active_member_count = $members; quarantined_count = 0; total_gross_pay = [double]$gross
        total_expected = [double]($gross * 0.10); total_reported = [double]($gross * 0.10); total_paid = [double]($gross * 0.10)
        reported_unknown = $false; scope_evidence_incomplete = $false; return_days_late = 0; payment_days_late = 0 }
}
$body = [ordered]@{ target = (Obs 3 "2026-03" 8 40000); history = @((Obs 1 "2026-01" 20 120000), (Obs 2 "2026-02" 20 121000)) }
try {
    $r = Invoke-RestMethod -Uri "http://localhost:8090/predict" -Method Post -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 6) -TimeoutSec 5
    "ML scoring smoke test: is_anomaly=$($r.is_anomaly)  priority=$($r.priority_score)  model=$($r.model_name) $($r.model_version)"
} catch { "ML scoring smoke test: FAIL - $($_.Exception.Message)" }
