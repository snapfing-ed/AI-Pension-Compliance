# Shared helpers for the smoke scripts. Dot-source this file: . "$PSScriptRoot\_lib.ps1"
$global:SC_BaseUrl = "http://localhost:8080"
$global:SC_Pass = 0
$global:SC_Fail = 0

function New-Client { return @{ Web = (New-Object Microsoft.PowerShell.Commands.WebRequestSession); Csrf = $null } }

function Invoke-Api($Client, [string]$Method, [string]$Path, $Body = $null, [switch]$NoCsrf) {
    $headers = @{}
    if ($Client.Csrf -and -not $NoCsrf) { $headers[$Client.Csrf.headerName] = $Client.Csrf.token }
    $req = @{ Uri = "$($global:SC_BaseUrl)$Path"; Method = $Method; Headers = $headers; WebSession = $Client.Web; UseBasicParsing = $true }
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
    if ($ok) { $global:SC_Pass++; Write-Host ("PASS  " + $name) -ForegroundColor Green }
    else     { $global:SC_Fail++; Write-Host ("FAIL  " + $name + "   " + $detail) -ForegroundColor Red }
}

function Note($text) { Write-Host ("INFO  " + $text) -ForegroundColor Cyan }

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

function MustChange($r) { return ($r.Text -match '"mustChangePassword"\s*:\s*true') }

function Dt($v) { if ($v) { return [datetime]$v } else { return $null } }

function Show-Summary {
    Write-Host ""
    $colour = if ($global:SC_Fail -eq 0) { "Green" } else { "Red" }
    Write-Host ("Passed: " + $global:SC_Pass + "   Failed: " + $global:SC_Fail) -ForegroundColor $colour
}