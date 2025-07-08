# WhatsApp Chatbot SaaS - Instalación Automatizada para Windows
# Este script configura toda la plataforma SaaS

Write-Host "🚀 Iniciando instalación de WhatsApp Chatbot SaaS Platform..." -ForegroundColor Green

# Verificar prerrequisitos
function Check-Prerequisites {
    Write-Host "📋 Verificando prerrequisitos..." -ForegroundColor Yellow
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Node.js no está instalado. Por favor instala Node.js 18+" -ForegroundColor Red
        exit 1
    }
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Docker no está instalado. Por favor instala Docker Desktop" -ForegroundColor Red
        exit 1
    }
    
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Docker Compose no está disponible. Asegúrate de que Docker Desktop esté funcionando" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Prerrequisitos verificados" -ForegroundColor Green
}

# Instalar dependencias
function Install-Dependencies {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    
    # Instalar dependencias del workspace principal
    npm install
    
    # Instalar dependencias del backend
    Set-Location backend
    npm install
    
    # Instalar dependencias del frontend
    Set-Location ..\frontend
    npm install
    
    Set-Location ..
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
}

# Configurar variables de entorno
function Setup-Environment {
    Write-Host "⚙️ Configurando variables de entorno..." -ForegroundColor Yellow
    
    # Backend environment
    if (-not (Test-Path "backend\.env")) {
        Copy-Item "backend\.env.example" "backend\.env"
        Write-Host "📝 Archivo backend\.env creado. Por favor revisa la configuración." -ForegroundColor Cyan
    }
    
    # Frontend environment
    if (-not (Test-Path "frontend\.env.local")) {
        @"
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME="WhatsApp Chatbot SaaS"
"@ | Out-File -FilePath "frontend\.env.local" -Encoding UTF8
        Write-Host "📝 Archivo frontend\.env.local creado" -ForegroundColor Cyan
    }
    
    Write-Host "✅ Variables de entorno configuradas" -ForegroundColor Green
}

# Iniciar servicios de base de datos
function Start-DatabaseServices {
    Write-Host "🗄️ Iniciando servicios de base de datos..." -ForegroundColor Yellow
    
    docker-compose up -d postgres redis
    
    # Esperar a que los servicios estén listos
    Write-Host "⏳ Esperando a que la base de datos esté lista..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    Write-Host "✅ Servicios de base de datos iniciados" -ForegroundColor Green
}

# Configurar base de datos
function Setup-Database {
    Write-Host "🔧 Configurando base de datos..." -ForegroundColor Yellow
    
    Set-Location backend
    
    # Generar cliente Prisma
    npx prisma generate
    
    # Ejecutar migraciones
    npx prisma migrate dev --name init
    
    # Poblar con datos iniciales
    npx prisma db seed
    
    Set-Location ..
    Write-Host "✅ Base de datos configurada" -ForegroundColor Green
}

# Función principal
function Main {
    Write-Host "==================================" -ForegroundColor Magenta
    Write-Host "🤖 WhatsApp Chatbot SaaS Platform" -ForegroundColor Magenta
    Write-Host "==================================" -ForegroundColor Magenta
    Write-Host ""
    
    try {
        Check-Prerequisites
        Install-Dependencies
        Setup-Environment
        Start-DatabaseServices
        Setup-Database
        
        Write-Host ""
        Write-Host "🎉 ¡Instalación completada exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
        Write-Host "1. Revisa las variables de entorno en backend\.env" -ForegroundColor White
        Write-Host "2. Ejecuta 'npm run dev' para iniciar en modo desarrollo" -ForegroundColor White
        Write-Host "3. Visita http://localhost:3000 para ver la aplicación" -ForegroundColor White
        Write-Host ""
        Write-Host "👤 Credenciales de demo:" -ForegroundColor Yellow
        Write-Host "   Admin: admin@demo.com / admin123" -ForegroundColor White
        Write-Host "   Usuario: user@demo.com / demo123" -ForegroundColor White
        Write-Host "   Subdominio: demo" -ForegroundColor White
        Write-Host ""
        Write-Host "📚 Documentación completa en README.md" -ForegroundColor Cyan
        Write-Host ""
    }
    catch {
        Write-Host "❌ Error durante la instalación: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Ejecutar instalación
Main
