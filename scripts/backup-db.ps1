param(
  [string]$OutputDir = "backups",
  [string]$ContainerName = "gymsoft-db",
  [string]$DbName = $env:POSTGRES_DB,
  [string]$DbUser = $env:POSTGRES_USER
)

$ErrorActionPreference = "Stop"

if (-not $DbName) { $DbName = "gymsoft" }
if (-not $DbUser) { $DbUser = "gymsoft" }

if (!(Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "gymsoft-$timestamp.dump"
$hostPath = Join-Path $OutputDir $fileName
$containerPath = "/tmp/$fileName"

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  throw "Docker no está disponible en PATH. Instale Docker o ejecute pg_dump manualmente."
}

$running = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if (-not $running) {
  throw "El contenedor '$ContainerName' no está en ejecución. Inicie la BD con: docker compose up -d db"
}

Write-Host "Generando backup desde contenedor '$ContainerName'..." -ForegroundColor Cyan
docker exec $ContainerName pg_dump -U $DbUser -d $DbName -Fc -f $containerPath
if ($LASTEXITCODE -ne 0) { throw "pg_dump falló con código $LASTEXITCODE" }

docker cp "${ContainerName}:${containerPath}" $hostPath
if ($LASTEXITCODE -ne 0) { throw "docker cp falló con código $LASTEXITCODE" }

docker exec $ContainerName rm -f $containerPath | Out-Null

if (!(Test-Path $hostPath)) { throw "No se encontró el archivo de backup generado: $hostPath" }
$size = (Get-Item $hostPath).Length
if ($size -le 0) { throw "El archivo de backup está vacío: $hostPath" }

Write-Host "Backup creado: $hostPath ($size bytes)" -ForegroundColor Green
Write-Host "Recuerde copiar el backup a un medio externo." -ForegroundColor Yellow
