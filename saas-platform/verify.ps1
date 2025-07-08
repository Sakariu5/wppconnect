# Verificación del Proyecto WhatsApp SaaS Platform

Write-Host "🔍 Verificando el estado del proyecto..." -ForegroundColor Cyan

# Verificar estructura de directorios
Write-Host "📁 Verificando estructura de directorios..." -ForegroundColor Yellow
if ((Test-Path "backend") -and (Test-Path "frontend")) {
    Write-Host "✅ Estructura de directorios correcta" -ForegroundColor Green
} else {
    Write-Host "❌ Estructura de directorios incorrecta" -ForegroundColor Red
}

# Verificar archivos de configuración del backend
Write-Host "🔧 Verificando configuración del backend..." -ForegroundColor Yellow
if ((Test-Path "backend/package.json") -and (Test-Path "backend/tsconfig.json") -and (Test-Path "backend/prisma/schema.prisma")) {
    Write-Host "✅ Configuración del backend completa" -ForegroundColor Green
} else {
    Write-Host "❌ Configuración del backend incompleta" -ForegroundColor Red
}

# Verificar archivos de configuración del frontend
Write-Host "🎨 Verificando configuración del frontend..." -ForegroundColor Yellow
if ((Test-Path "frontend/package.json") -and (Test-Path "frontend/tsconfig.json") -and (Test-Path "frontend/tailwind.config.js")) {
    Write-Host "✅ Configuración del frontend completa" -ForegroundColor Green
} else {
    Write-Host "❌ Configuración del frontend incompleta" -ForegroundColor Red
}

# Verificar archivos principales
Write-Host "📋 Verificando archivos principales..." -ForegroundColor Yellow
$key_files = @(
    "backend/src/index.ts",
    "backend/src/services/whatsapp.ts",
    "backend/src/services/websocket.ts",
    "frontend/src/stores/auth.tsx",
    "frontend/src/stores/websocket.tsx",
    "frontend/src/components/providers.tsx",
    "docker-compose.yml",
    "README.md"
)

$missing_files = @()
foreach ($file in $key_files) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
        $missing_files += $file
    }
}

# Resumen
Write-Host ""
Write-Host "📊 RESUMEN:" -ForegroundColor Magenta
Write-Host "============" -ForegroundColor Magenta
if ($missing_files.Count -eq 0) {
    Write-Host "🎉 ¡Todos los archivos principales están presentes!" -ForegroundColor Green
    Write-Host "🚀 El proyecto está listo para desarrollar" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos pasos recomendados:" -ForegroundColor Yellow
    Write-Host "1. cd backend && npm install" -ForegroundColor White
    Write-Host "2. cd frontend && npm install" -ForegroundColor White
    Write-Host "3. docker-compose up -d (para PostgreSQL)" -ForegroundColor White
    Write-Host "4. cd backend && npx prisma db push" -ForegroundColor White
    Write-Host "5. cd backend && npm run dev" -ForegroundColor White
    Write-Host "6. cd frontend && npm run dev" -ForegroundColor White
} else {
    Write-Host "⚠️  Archivos faltantes: $($missing_files.Count)" -ForegroundColor Yellow
    foreach ($file in $missing_files) {
        Write-Host "   - $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📚 Documentación disponible:" -ForegroundColor Cyan
Write-Host "- README.md - Información general" -ForegroundColor White
Write-Host "- QUICKSTART.md - Guía de inicio rápido" -ForegroundColor White
Write-Host "- OVERVIEW.md - Descripción técnica detallada" -ForegroundColor White
