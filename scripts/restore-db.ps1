param(
  [Parameter(Mandatory = $true)][string]$DumpFile,
  [string]$TargetDb = "gymsoft_restore_test",
  [string]$ContainerName = "gymsoft-db",
  [string]$DbUser = $env:POSTGRES_USER
)

$ErrorActionPreference = "Stop"

if (-not $DbUser) { $DbUser = "gymsoft" }

if (!(Test-Path $DumpFile)) {
  throw "No existe el archivo de dump: $DumpFile"
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  throw "Docker no está disponible en PATH. Instale Docker o ejecute pg_restore manualmente."
}

$running = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if (-not $running) {
  throw "El contenedor '$ContainerName' no está en ejecución. Inicie la BD con: docker compose up -d db"
}

$leaf = Split-Path $DumpFile -Leaf
$containerPath = "/tmp/$leaf"

Write-Host "Copiando dump al contenedor..." -ForegroundColor Cyan
docker cp $DumpFile "${ContainerName}:${containerPath}"
if ($LASTEXITCODE -ne 0) { throw "docker cp falló con código $LASTEXITCODE" }

Write-Host "Recreando base de datos destino '$TargetDb'..." -ForegroundColor Cyan
$terminateSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TargetDb' AND pid <> pg_backend_pid();"
$dropSql = "DROP DATABASE IF EXISTS $TargetDb;"
$createSql = "CREATE DATABASE $TargetDb;"
docker exec $ContainerName psql -U $DbUser -d postgres -v ON_ERROR_STOP=1 -c $terminateSql | Out-Null
docker exec $ContainerName psql -U $DbUser -d postgres -v ON_ERROR_STOP=1 -c $dropSql
if ($LASTEXITCODE -ne 0) { throw "No se pudo eliminar la base destino" }
docker exec $ContainerName psql -U $DbUser -d postgres -v ON_ERROR_STOP=1 -c $createSql
if ($LASTEXITCODE -ne 0) { throw "No se pudo crear la base destino" }

Write-Host "Restaurando dump en '$TargetDb'..." -ForegroundColor Cyan
docker exec $ContainerName pg_restore -U $DbUser -d $TargetDb --no-owner --no-privileges $containerPath
$restoreCode = $LASTEXITCODE

docker exec $ContainerName rm -f $containerPath | Out-Null

if ($restoreCode -ne 0) {
  throw "pg_restore finalizó con código $restoreCode. Revise los mensajes anteriores."
}

Write-Host "Verificando tablas restauradas..." -ForegroundColor Cyan
docker exec $ContainerName psql -U $DbUser -d $TargetDb -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"

Write-Host "Restauración completada en '$TargetDb'." -ForegroundColor Green
Write-Host "Si era una prueba, puede eliminar la base con: docker exec $ContainerName psql -U $DbUser -d postgres -c `"DROP DATABASE IF EXISTS $TargetDb;`"" -ForegroundColor Yellow

