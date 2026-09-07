# loadtests/run_campaigns.ps1
# Automates the full Locust test campaign against the HF Space backend.

$ErrorActionPreference = "Continue"
$env:API_KEY = "LoadTest#2026!Key"
$env:IMAGE_PATH = "loadtests/fixtures/test-dog-synthetic.jpg"
$env:PYTHONIOENCODING = "utf-8"
$HOST_URL = "https://firstoff-animalmind-backend.hf.space"
$LOCUST = "loadtests\.venv\Scripts\locust"
$RESULTS_DIR = "loadtests\results"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Iniciando Campanha de Testes de Carga - PeloNaRoupa ML Backend" -ForegroundColor Cyan
Write-Host "Host: $HOST_URL" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ── 1. Campanha Classify (1 -> 16 utilizadores) ─────────────────────────
$classifyScenarios = @(
    @{ Users = 1;  Rate = 1; Time = "30s"; Name = "classify-u1" },
    @{ Users = 2;  Rate = 1; Time = "30s"; Name = "classify-u2" },
    @{ Users = 4;  Rate = 2; Time = "30s"; Name = "classify-u4" },
    @{ Users = 8;  Rate = 2; Time = "30s"; Name = "classify-u8" },
    @{ Users = 16; Rate = 4; Time = "30s"; Name = "classify-u16" }
)

foreach ($sc in $classifyScenarios) {
    Write-Host "`n[CLASSIFY] A executar cenario: $($sc.Users) utilizadores (spawn: $($sc.Rate)/s, duracao: $($sc.Time))..." -ForegroundColor Yellow
    & $LOCUST -f loadtests/locustfile.py ClassifyBreedUser --headless `
        --host=$HOST_URL `
        -u $sc.Users -r $sc.Rate -t $sc.Time `
        --tags classify `
        --csv="$RESULTS_DIR\$($sc.Name)"
    Start-Sleep -Seconds 3
}

# ── 2. Campanha SSE (10 -> 100 conexões) ─────────────────────────────────
$sseScenarios = @(
    @{ Users = 10;  Rate = 2;  Time = "30s"; Name = "sse-u10" },
    @{ Users = 25;  Rate = 5;  Time = "30s"; Name = "sse-u25" },
    @{ Users = 50;  Rate = 10; Time = "30s"; Name = "sse-u50" },
    @{ Users = 100; Rate = 20; Time = "30s"; Name = "sse-u100" }
)

foreach ($sc in $sseScenarios) {
    Write-Host "`n[SSE] A executar cenario: $($sc.Users) conexoes (spawn: $($sc.Rate)/s, duracao: $($sc.Time))..." -ForegroundColor Green
    & $LOCUST -f loadtests/locustfile.py SSEUser --headless `
        --host=$HOST_URL `
        -u $sc.Users -r $sc.Rate -t $sc.Time `
        --tags sse `
        --csv="$RESULTS_DIR\$($sc.Name)"
    Start-Sleep -Seconds 3
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Todas as campanhas foram concluidas com sucesso!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
