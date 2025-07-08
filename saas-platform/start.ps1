# WhatsApp Chatbot SaaS - Iniciador para Windows

Write-Host "🚀 Iniciando WhatsApp Chatbot SaaS Platform..." -ForegroundColor Green

# Verificar si estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encuentra package.json. Asegúrate de estar en el directorio raíz del proyecto." -ForegroundColor Red
    exit 1
}

# Función para verificar si un puerto está en uso
function Test-Port {
    param([int]$Port)
    
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Verificar puertos
Write-Host "📋 Verificando puertos..." -ForegroundColor Yellow

if (Test-Port 3000) {
    Write-Host "❌ Puerto 3000 (frontend) está en uso. Por favor libéralo antes de continuar." -ForegroundColor Red
    Write-Host "   Ejecuta: Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process" -ForegroundColor Cyan
    exit 1
}

if (Test-Port 3001) {
    Write-Host "❌ Puerto 3001 (backend) está en uso. Por favor libéralo antes de continuar." -ForegroundColor Red
    Write-Host "   Ejecuta: Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process" -ForegroundColor Cyan
    exit 1
}

# Verificar servicios de Docker
Write-Host "🐳 Verificando servicios de Docker..." -ForegroundColor Yellow

$dockerServices = docker-compose ps --services --filter "status=running"
if ($dockerServices -notcontains "postgres") {
    Write-Host "⚠️  PostgreSQL no está corriendo. Iniciando..." -ForegroundColor Yellow
    docker-compose up -d postgres redis
    Start-Sleep -Seconds 5
}

try {
    # Iniciar backend
    Write-Host "🔧 Iniciando backend..." -ForegroundColor Yellow
    $backendJob = Start-Job -ScriptBlock {
        Set-Location "backend"
        npm run dev
    }

    # Esperar un momento para que el backend inicie
    Start-Sleep -Seconds 3

    # Iniciar frontend
    Write-Host "🎨 Iniciando frontend..." -ForegroundColor Yellow
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location "frontend"  
        npm run dev
    }

    Write-Host ""
    Write-Host "✅ Aplicación iniciada exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 URLs disponibles:" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "   Backend API: http://localhost:3001" -ForegroundColor White
    Write-Host "   Prisma Studio: http://localhost:5555 (ejecutar 'npm run prisma:studio')" -ForegroundColor White
    Write-Host ""
    Write-Host "👤 Credenciales demo:" -ForegroundColor Yellow
    Write-Host "   Admin: admin@demo.com / admin123" -ForegroundColor White
    Write-Host "   Usuario: user@demo.com / demo123" -ForegroundColor White
    Write-Host ""
    Write-Host "⏹️  Para detener: presiona Ctrl+C" -ForegroundColor Magenta
    Write-Host ""

    # Esperar hasta que se presione Ctrl+C
    try {
        while ($true) {
            Start-Sleep -Seconds 1
            
            # Verificar si los jobs siguen corriendo
            if ($backendJob.State -eq "Failed" -or $frontendJob.State -eq "Failed") {
                Write-Host "❌ Error: Uno de los servicios falló. Revisa los logs." -ForegroundColor Red
                break
            }
        }
    }
    finally {
        Write-Host "🛑 Deteniendo servicios..." -ForegroundColor Yellow
        Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    }
}
catch {
    Write-Host "❌ Error al iniciar la aplicación: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
