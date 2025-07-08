#!/bin/bash

# WhatsApp Chatbot SaaS - Instalación Automatizada
# Este script configura toda la plataforma SaaS

set -e

echo "🚀 Iniciando instalación de WhatsApp Chatbot SaaS Platform..."

# Verificar prerrequisitos
check_prerequisites() {
    echo "📋 Verificando prerrequisitos..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js no está instalado. Por favor instala Node.js 18+"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker no está instalado. Por favor instala Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose no está instalado. Por favor instala Docker Compose"
        exit 1
    fi
    
    echo "✅ Prerrequisitos verificados"
}

# Instalar dependencias
install_dependencies() {
    echo "📦 Instalando dependencias..."
    
    # Instalar dependencias del workspace principal
    npm install
    
    # Instalar dependencias del backend
    cd backend
    npm install
    
    # Instalar dependencias del frontend
    cd ../frontend
    npm install
    
    cd ..
    echo "✅ Dependencias instaladas"
}

# Configurar variables de entorno
setup_environment() {
    echo "⚙️ Configurando variables de entorno..."
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        echo "📝 Archivo backend/.env creado. Por favor revisa la configuración."
    fi
    
    # Frontend environment
    if [ ! -f "frontend/.env.local" ]; then
        cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME="WhatsApp Chatbot SaaS"
EOF
        echo "📝 Archivo frontend/.env.local creado"
    fi
    
    echo "✅ Variables de entorno configuradas"
}

# Iniciar servicios de base de datos
start_database_services() {
    echo "🗄️ Iniciando servicios de base de datos..."
    
    docker-compose up -d postgres redis
    
    # Esperar a que los servicios estén listos
    echo "⏳ Esperando a que la base de datos esté lista..."
    sleep 10
    
    echo "✅ Servicios de base de datos iniciados"
}

# Configurar base de datos
setup_database() {
    echo "🔧 Configurando base de datos..."
    
    cd backend
    
    # Generar cliente Prisma
    npx prisma generate
    
    # Ejecutar migraciones
    npx prisma migrate dev --name init
    
    # Poblar con datos iniciales
    npx prisma db seed
    
    cd ..
    echo "✅ Base de datos configurada"
}

# Función principal
main() {
    echo "=================================="
    echo "🤖 WhatsApp Chatbot SaaS Platform"
    echo "=================================="
    echo ""
    
    check_prerequisites
    install_dependencies
    setup_environment
    start_database_services
    setup_database
    
    echo ""
    echo "🎉 ¡Instalación completada exitosamente!"
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Revisa las variables de entorno en backend/.env"
    echo "2. Ejecuta 'npm run dev' para iniciar en modo desarrollo"
    echo "3. Visita http://localhost:3000 para ver la aplicación"
    echo ""
    echo "👤 Credenciales de demo:"
    echo "   Admin: admin@demo.com / admin123"
    echo "   Usuario: user@demo.com / demo123"
    echo "   Subdominio: demo"
    echo ""
    echo "📚 Documentación completa en README.md"
    echo ""
}

# Ejecutar instalación
main
