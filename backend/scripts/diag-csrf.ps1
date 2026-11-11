param([string]$BaseUrl = "http://localhost:8080", [string]$AdminIdentifier = "admin")
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\_lib.ps1"
$global:SC_BaseUrl = $BaseUrl

$c = New-Client
$pw = Read-Secret "APPLICATION password for $AdminIdentifier"
$r = Sign-In $c $AdminIdentifier $pw
$pw = $null
Write-Host "login: $($r.Code)"
if ($r.Code -ne 200) { exit 1 }

Write-Host "cookie names in the session jar:"
$c.Web.Cookies.GetCookies($BaseUrl) | ForEach-Object { "  " + $_.Name + "  (HttpOnly=" + $_.HttpOnly + ")" }

$good = $c.Csrf
$body = @{ grossPay = 100; date = "2026-03-01"; ruleCode = "NAPSA_FORMAL" }

$a = Invoke-Api $c POST "/api/contribution-calculations/preview" $body
Write-Host "POST preview, correct token      : $($a.Code)   (expect 200)"
$b = Invoke-Api $c POST "/api/contribution-calculations/preview" $body -NoCsrf
Write-Host "POST preview, no token           : $($b.Code)   (expect 403)"
$c.Csrf = @{ headerName = $good.headerName; token = "not-the-real-token" }
$d = Invoke-Api $c POST "/api/contribution-calculations/preview" $body
Write-Host "POST preview, wrong token        : $($d.Code)   (expect 403)"
$c.Csrf = $good
$e = Invoke-Api $c PATCH "/api/employers/999999999" @{ legalName = "x" } -NoCsrf
Write-Host "PATCH unknown id, no token       : $($e.Code)   (403 = CSRF active; 404 = request reached the controller)"
$f = Invoke-Api $c PATCH "/api/employers/999999999" @{ legalName = "x" }
Write-Host "PATCH unknown id, correct token  : $($f.Code)   (expect 404)"