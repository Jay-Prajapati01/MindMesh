# MindMesh regression suite runner.
# Requires: Docker Compose stack running (backend on localhost:8000).
# Usage (repo root):  powershell -File scripts\qa\run_all.ps1
param(
    [switch]$SkipPytest
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $root
$failures = 0

function Run-Step($name, $scriptBlock) {
    Write-Host "`n=== $name ===" -ForegroundColor Cyan
    $out = & $scriptBlock 2>&1 | Out-String
    Write-Host $out.Trim()
    if ($out -match "(\d+) failures" -and $Matches[1] -ne "0") { $script:failures += 1 }
    if ($out -match "failed" -and $out -notmatch "0 failed") { $script:failures += 1 }
}

if (-not $SkipPytest) {
    Run-Step "pytest (backend unit/API tests)" {
        docker compose exec -T backend pytest tests -q
    }
}

foreach ($f in @("qa_phase3.py", "qa_contract.py", "qa_schema.py")) {
    Run-Step $f {
        Get-Content -Raw (Join-Path $root "scripts\qa\$f") | docker compose exec -T backend python -
    }
}

Pop-Location
Write-Host ""
if ($failures -eq 0) {
    Write-Host "ALL REGRESSION CHECKS PASSED" -ForegroundColor Green
} else {
    Write-Host "$failures regression step(s) FAILED" -ForegroundColor Red
    exit 1
}
